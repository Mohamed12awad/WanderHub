import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { PostingService } from '../accounting/posting.service';
import { toClient } from '../common/serialize';
import { paginate } from '../common/paginate';

interface MovementInput {
  productId: string;
  warehouseId?: string; // defaults to the default warehouse
  qty: number; // signed: + in, - out
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  unitCost?: number; // inbound purchase cost; ignored on outbound (cost derived from valuation)
  sourceMovementId?: string; // a return/reversal restores at this move's original cost
  refType?: string;
  refId?: string;
  note?: string;
  adjustmentReason?: string;
  userId?: string;
}

type Db = Prisma.TransactionClient | PrismaService;
type StockMovementRow = Prisma.StockMovementGetPayload<object>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceConfig: WorkspaceConfigService,
    private readonly posting: PostingService,
  ) {}

  /**
   * Returns stock from a prior outbound (sale) movement: restores quantity at the
   * original COGS unit cost (via sourceMovementId) and reverses the proportional
   * COGS (Dr Inventory / Cr COGS). Supports partial returns.
   */
  async returnStock(body: { movementId: string; qty: number; note?: string }, userId: string) {
    const orig = await this.prisma.stockMovement.findUnique({ where: { id: body.movementId } });
    if (!orig) throw new NotFoundException('Original movement not found');
    if (orig.qty >= 0) throw new BadRequestException('Can only return an outbound (sale) movement');
    const maxQty = -orig.qty;
    if (!body.qty || body.qty <= 0 || body.qty > maxQty + 1e-9) {
      throw new BadRequestException(`qty must be between 0 and ${maxQty}`);
    }
    const move = await this.applyMovement({
      productId: orig.productId,
      warehouseId: orig.warehouseId ?? undefined,
      qty: body.qty,
      type: 'in',
      sourceMovementId: orig.id,
      refType: 'return',
      refId: orig.refId ?? undefined,
      note: body.note ?? `Return of movement ${orig.id}`,
      userId,
    });
    if (move) {
      await this.posting.postCogsReversal(
        { id: move.id, qty: body.qty, unitCost: Number(move.unitCost ?? 0), date: move.createdAt, productId: orig.productId, warehouseId: move.warehouseId },
        undefined, userId,
      );
    }
    return toClient(move);
  }

  /** Cost-flow method for a product: category override → org default → AVCO. */
  private async resolveCostMethod(db: Db, productId: string): Promise<'weighted_average' | 'fifo'> {
    const product = await db.product.findUnique({ where: { id: productId }, select: { categoryId: true } });
    let method: string | null | undefined;
    if (product?.categoryId) {
      const cat = await db.productCategory.findUnique({
        where: { id: product.categoryId }, select: { costMethod: true },
      });
      method = cat?.costMethod;
    }
    if (!method) {
      const gl = ((await this.workspaceConfig.get()).glConfig as { defaultCostMethod?: string }) ?? {};
      method = gl.defaultCostMethod;
    }
    return method === 'fifo' ? 'fifo' : 'weighted_average';
  }

  /** Consumes the oldest FIFO layers for `need` units; returns weighted cost. */
  private async consumeFifo(db: Db, productId: string, warehouseId: string, need: number, fallback: number) {
    let remaining = need;
    let totalCost = 0;
    const layers = await db.stockCostLayer.findMany({
      where: { productId, warehouseId, remainingQty: { gt: 0 } },
      orderBy: { receivedAt: 'asc' },
    });
    for (const l of layers) {
      if (remaining <= 1e-9) break;
      const take = Math.min(remaining, l.remainingQty);
      totalCost += take * Number(l.unitCost);
      remaining -= take;
      await db.stockCostLayer.update({ where: { id: l.id }, data: { remainingQty: { decrement: take } } });
    }
    // Legacy stock with no layers (pre-costing): value the remainder at avg.
    if (remaining > 1e-9) totalCost += remaining * fallback;
    return { unitCost: need > 0 ? totalCost / need : 0, totalCost };
  }

  /** Resolves an explicit warehouse, else the (cached) default warehouse id. */
  private async resolveWarehouseId(db: Db, warehouseId?: string): Promise<string> {
    if (warehouseId) return warehouseId;
    // Resolve the default each call. Memoizing it on this singleton would keep
    // routing stock to a stale warehouse after an admin changes which one is
    // default (or deactivates/soft-deletes it) until the process restarts.
    const wh = await db.warehouse.findFirst({
      where: { isDefault: true, isActive: true, deletedAt: null },
    });
    if (!wh) throw new BadRequestException('No default warehouse configured');
    return wh.id;
  }

  /**
   * Applies a signed stock movement to a (product, warehouse): upserts the
   * StockItem balance and appends a ledger row. Runs inside the caller's
   * transaction when provided so stock stays consistent with the PO/invoice that
   * triggered it.
   */
  async applyMovement(input: MovementInput, tx?: Prisma.TransactionClient): Promise<StockMovementRow | null> {
    if (!input.qty) return null;
    if (tx) return this.applyMovementTx(input, tx);
    return this.prisma.$transaction((t) => this.applyMovementTx(input, t));
  }

  /**
   * Cost-aware stock movement. Takes a pessimistic `SELECT … FOR UPDATE` lock on
   * the (product, warehouse) row so concurrent movers serialize — a plain
   * transaction gives atomicity but not the isolation weighted-average needs.
   * Maintains avgCost/totalValue (AVCO) or cost layers (FIFO), records the move's
   * unitCost (purchase cost inbound; COGS cost outbound), and returns the move.
   */
  private async applyMovementTx(input: MovementInput, db: Prisma.TransactionClient): Promise<StockMovementRow> {
    const warehouseId = await this.resolveWarehouseId(db, input.warehouseId);

    // Serialize concurrent movers of this exact (product, warehouse). A row lock
    // (SELECT … FOR UPDATE) cannot cover the first-ever movement — no StockItem
    // row exists yet to lock, so two concurrent first movements would both read a
    // zero snapshot and race the upsert. A transaction-scoped advisory lock keyed
    // on the (product, warehouse) pair serializes regardless of row existence and
    // releases automatically at commit.
    await db.$queryRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext(${input.productId}), hashtext(${warehouseId}))
    `);

    const current = await db.stockItem.findUnique({
      where: { productId_warehouseId: { productId: input.productId, warehouseId } },
    });
    const oldQty = current?.quantityOnHand ?? 0;
    const oldAvg = Number(current?.avgCost ?? 0);
    const oldTotal = Number(current?.totalValue ?? 0);

    if (input.qty < 0 && oldQty + input.qty < -1e-9) {
      throw new BadRequestException(
        `Insufficient stock for product ${input.productId}: ${oldQty} on hand, requested ${Math.abs(input.qty)}`,
      );
    }

    const method = await this.resolveCostMethod(db, input.productId);
    const newQty = oldQty + input.qty;
    let unitCost: number;
    let newTotal: number;
    // For a FIFO return, the date its restored layer re-enters the queue at —
    // the original outbound's date, so returned units are consumed ahead of
    // stock purchased after the sale (rather than dumped at the back as "newest").
    let sourceReceivedAt: Date | undefined;

    if (input.qty > 0) {
      // Inbound. A return reuses its originating outbound move's exact unit cost.
      if (input.sourceMovementId) {
        const orig = await db.stockMovement.findUnique({
          where: { id: input.sourceMovementId }, select: { unitCost: true, createdAt: true },
        });
        unitCost = Number(orig?.unitCost ?? input.unitCost ?? oldAvg);
        sourceReceivedAt = orig?.createdAt;
      } else {
        unitCost = input.unitCost ?? oldAvg;
      }
      newTotal = oldTotal + input.qty * unitCost;
    } else {
      // Outbound. FIFO consumes oldest layers; AVCO relieves at current average.
      const need = -input.qty;
      if (method === 'fifo') {
        const r = await this.consumeFifo(db, input.productId, warehouseId, need, oldAvg);
        unitCost = r.unitCost;
        newTotal = oldTotal - r.totalCost;
      } else {
        unitCost = oldAvg;
        newTotal = oldTotal + input.qty * oldAvg; // qty < 0
      }
    }
    if (newQty <= 1e-9) newTotal = 0; // fully depleted → zero residual value
    const newAvg = newQty > 1e-9 ? newTotal / newQty : input.qty > 0 ? unitCost : 0;

    await db.stockItem.upsert({
      where: { productId_warehouseId: { productId: input.productId, warehouseId } },
      create: { productId: input.productId, warehouseId, quantityOnHand: input.qty, avgCost: newAvg, totalValue: newTotal },
      update: { quantityOnHand: { increment: input.qty }, avgCost: newAvg, totalValue: newTotal },
    });

    const movement = await db.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId,
        qty: input.qty,
        type: input.type,
        unitCost,
        costMethod: method,
        sourceMovementId: input.sourceMovementId,
        refType: input.refType,
        refId: input.refId,
        note: input.note,
        adjustmentReason: input.adjustmentReason,
        createdById: input.userId,
      },
    });

    // FIFO inbound creates a new cost layer for later consumption. A return
    // (sourceMovementId set) re-enters at the original outbound's date so it
    // keeps its historical FIFO position instead of jumping to the back.
    if (input.qty > 0 && method === 'fifo') {
      await db.stockCostLayer.create({
        data: {
          productId: input.productId, warehouseId,
          remainingQty: input.qty, originalQty: input.qty,
          unitCost, sourceMovementId: movement.id,
          receivedAt: sourceReceivedAt ?? movement.createdAt,
        },
      });
    }

    return movement;
  }

  /**
   * Moves stock between two warehouses as two linked movements (out of source,
   * into destination). Quantity-only in Phase 3; GL/cost effects arrive in Phase 4.
   */
  async transfer(
    body: { productId: string; fromWarehouseId: string; toWarehouseId: string; qty: number; note?: string },
    userId: string,
  ) {
    if (!body.qty || body.qty <= 0) throw new BadRequestException('qty must be greater than 0');
    if (body.fromWarehouseId === body.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must differ');
    }
    const product = await this.prisma.product.findFirst({ where: { id: body.productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    const transferId = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      const out = await this.applyMovementTx(
        { productId: body.productId, warehouseId: body.fromWarehouseId, qty: -body.qty, type: 'transfer', refType: 'transfer', refId: transferId, note: body.note, userId },
        tx,
      );
      // Cost-neutral: the destination receives the units at the source's cost.
      await this.applyMovementTx(
        { productId: body.productId, warehouseId: body.toWarehouseId, qty: body.qty, type: 'transfer', unitCost: Number(out.unitCost ?? 0), refType: 'transfer', refId: transferId, note: body.note, userId },
        tx,
      );
    });
    return { ok: true, transferId };
  }

  /**
   * Paginated stock levels per (product, warehouse) with a low-stock flag.
   * Supports `q` (product name / location) and an optional `warehouseId` filter.
   */
  async list(query: { page?: string; limit?: string; q?: string; warehouseId?: string } = {}) {
    const q = query.q?.trim();
    const where: Prisma.StockItemWhereInput = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (q) {
      where.OR = [
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

    const result = await paginate<{ quantityOnHand: number; reorderLevel: number }>(
      this.prisma.stockItem,
      {
        where,
        include: {
          product: { select: { id: true, name: true, type: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { updatedAt: 'desc' },
        page: query.page,
        limit: query.limit,
      },
    );
    return {
      ...result,
      data: result.data.map((s) => ({ ...s, lowStock: s.quantityOnHand <= s.reorderLevel })),
    };
  }

  /**
   * Inventory valuation: on-hand qty × avg cost per (product, warehouse).
   * Paginated; `grandTotal` is the value across ALL matching rows, not the page.
   */
  async valuation(query: { warehouseId?: string; q?: string; page?: string; limit?: string } = {}) {
    const q = query.q?.trim();
    const where: Prisma.StockItemWhereInput = { NOT: { quantityOnHand: 0 } };
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (q) where.product = { name: { contains: q, mode: 'insensitive' } };

    const p = Math.max(1, parseInt(query.page ?? '1') || 1);
    const take = Math.min(100, parseInt(query.limit ?? '25') || 25);
    const orderBy: Prisma.StockItemOrderByWithRelationInput[] = [{ warehouseId: 'asc' }, { quantityOnHand: 'desc' }];

    const [items, total, agg] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy,
        skip: (p - 1) * take,
        take,
      }),
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.aggregate({ where, _sum: { totalValue: true } }),
    ]);

    const data = items.map((s) => ({
      productId: s.productId,
      product: s.product?.name ?? s.productId,
      category: s.product?.category?.name ?? null,
      warehouse: s.warehouse?.name ?? null,
      warehouseCode: s.warehouse?.code ?? null,
      quantityOnHand: s.quantityOnHand,
      avgCost: s.avgCost, // Decimal → string via @MoneyAsString
      totalValue: s.totalValue,
    }));
    return {
      data,
      total,
      page: p,
      pages: Math.ceil(total / take) || 1,
      grandTotal: Number(agg._sum.totalValue ?? 0).toFixed(2),
    };
  }

  async lowStock() {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT s.*, p.name AS "productName", w.name AS "warehouseName"
      FROM "StockItem" s
      JOIN "Product" p ON p.id = s."productId"
      LEFT JOIN "Warehouse" w ON w.id = s."warehouseId"
      WHERE s."quantityOnHand" <= s."reorderLevel" AND p."deletedAt" IS NULL
      ORDER BY s."quantityOnHand" ASC
    `);
    return toClient(rows);
  }

  async movements(productId?: string, skip = 0, take = 50) {
    const where = productId ? { productId } : {};
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: { warehouse: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { data: toClient(data), total };
  }

  /** Manual stock adjustment (recount, write-off, correction, damage, etc.). */
  async adjust(
    productId: string,
    body: { qty: number; note?: string; reason?: string; warehouseId?: string; unitCost?: number },
    userId: string,
  ) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    if (!body.qty) throw new BadRequestException('qty is required and must be non-zero');
    const warehouseId = await this.resolveWarehouseId(this.prisma, body.warehouseId);
    await this.applyMovement({
      productId,
      warehouseId,
      qty: body.qty,
      type: 'adjustment',
      unitCost: body.unitCost,
      refType: 'manual',
      note: body.note,
      adjustmentReason: body.reason,
      userId,
    });
    return toClient(
      await this.prisma.stockItem.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } }),
    );
  }

  async updateDetails(productId: string, body: { reorderLevel?: number; location?: string; warehouseId?: string }) {
    const warehouseId = await this.resolveWarehouseId(this.prisma, body.warehouseId);
    const data: Record<string, unknown> = {};
    if (body.reorderLevel !== undefined) data.reorderLevel = body.reorderLevel;
    if (body.location !== undefined) data.location = body.location;
    if (!Object.keys(data).length) {
      return toClient(
        await this.prisma.stockItem.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } }),
      );
    }
    return toClient(
      await this.prisma.stockItem.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        create: { productId, warehouseId, ...data } as Prisma.StockItemUncheckedCreateInput,
        update: data as Prisma.StockItemUncheckedUpdateInput,
      }),
    );
  }

  async setReorderLevel(productId: string, reorderLevel: number, warehouseId?: string) {
    const whId = await this.resolveWarehouseId(this.prisma, warehouseId);
    return toClient(
      await this.prisma.stockItem.upsert({
        where: { productId_warehouseId: { productId, warehouseId: whId } },
        create: { productId, warehouseId: whId, reorderLevel },
        update: { reorderLevel },
      }),
    );
  }
}
