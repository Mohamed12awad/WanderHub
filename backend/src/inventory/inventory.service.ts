import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

interface MovementInput {
  productId: string;
  qty: number; // signed: + in, - out
  type: 'in' | 'out' | 'adjustment';
  refType?: string;
  refId?: string;
  note?: string;
  adjustmentReason?: string;
  userId?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies a signed stock movement: upserts the product's StockItem balance and
   * appends a ledger row. Runs inside the caller's transaction when provided so
   * stock stays consistent with the PO/invoice that triggered it.
   */
  async applyMovement(input: MovementInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    if (!input.qty) return;

    // Guard: prevent stock going negative on out/adjustment moves.
    if (input.qty < 0) {
      const current = await db.stockItem.findUnique({ where: { productId: input.productId } });
      const onHand: number = current?.quantityOnHand ?? 0;
      if (onHand + input.qty < 0) {
        throw new BadRequestException(
          `Insufficient stock for product ${input.productId}: ${onHand} on hand, requested ${Math.abs(input.qty)}`,
        );
      }
    }

    await db.stockItem.upsert({
      where: { productId: input.productId },
      create: { productId: input.productId, quantityOnHand: input.qty },
      update: { quantityOnHand: { increment: input.qty } },
    });
    await db.stockMovement.create({
      data: {
        productId: input.productId,
        qty: input.qty,
        type: input.type,
        refType: input.refType,
        refId: input.refId,
        note: input.note,
        adjustmentReason: input.adjustmentReason,
        createdById: input.userId,
      },
    });
  }

  /**
   * Paginated stock levels with product info and a low-stock flag. Supports a
   * free-text query (`q`) that matches product name or stock location.
   */
  async list(query: { page?: string; limit?: string; q?: string } = {}) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '25', 10) || 25));
    const q = query.q?.trim();

    const where: Prisma.StockItemWhereInput = q
      ? {
          OR: [
            { product: { name: { contains: q, mode: 'insensitive' } } },
            { location: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        include: { product: { select: { id: true, name: true, type: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockItem.count({ where }),
    ]);

    return {
      data: toClient(items.map((s) => ({ ...s, lowStock: s.quantityOnHand <= s.reorderLevel }))),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async lowStock() {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT s.*, p.name AS "productName"
      FROM "StockItem" s
      JOIN "Product" p ON p.id = s."productId"
      WHERE s."quantityOnHand" <= s."reorderLevel" AND p."deletedAt" IS NULL
      ORDER BY s."quantityOnHand" ASC
    `);
    return toClient(rows);
  }

  async movements(productId?: string, skip = 0, take = 50) {
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: productId ? { productId } : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.stockMovement.count({ where: productId ? { productId } : {} }),
    ]);
    return { data: toClient(data), total };
  }

  /** Manual stock adjustment (recount, write-off, correction, damage, etc.). */
  async adjust(productId: string, body: { qty: number; note?: string; reason?: string }, userId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    if (!body.qty) throw new BadRequestException('qty is required and must be non-zero');
    await this.applyMovement({
      productId,
      qty: body.qty,
      type: 'adjustment',
      refType: 'manual',
      note: body.note,
      adjustmentReason: body.reason,
      userId,
    });
    return toClient(await this.prisma.stockItem.findUnique({ where: { productId } }));
  }

  async updateDetails(productId: string, body: { reorderLevel?: number; location?: string }) {
    const existing = await this.prisma.stockItem.findUnique({ where: { productId } });
    const data: Record<string, unknown> = {};
    if (body.reorderLevel !== undefined) data.reorderLevel = body.reorderLevel;
    if (body.location !== undefined) data.location = body.location;
    if (!Object.keys(data).length) return existing;
    return toClient(
      await this.prisma.stockItem.upsert({
        where: { productId },
        create: { productId, ...data } as Prisma.StockItemUncheckedCreateInput,
        update: data as Prisma.StockItemUncheckedUpdateInput,
      }),
    );
  }

  async setReorderLevel(productId: string, reorderLevel: number) {
    return toClient(
      await this.prisma.stockItem.upsert({
        where: { productId },
        create: { productId, reorderLevel },
        update: { reorderLevel },
      }),
    );
  }
}
