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
        createdById: input.userId,
      },
    });
  }

  /** Current stock levels with product info and a low-stock flag. */
  async list() {
    const items = await this.prisma.stockItem.findMany({
      include: { product: { select: { id: true, name: true, type: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });
    return toClient(
      items.map((s) => ({ ...s, lowStock: s.quantityOnHand <= s.reorderLevel })),
    );
  }

  async lowStock() {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT s.*, p.name AS "productName"
      FROM "StockItem" s
      JOIN "Product" p ON p.id = s."productId"
      WHERE s."quantityOnHand" <= s."reorderLevel" AND p."deletedAt" IS NULL
      ORDER BY s."quantityOnHand" ASC
    `);
    return toClient(rows);
  }

  async movements(productId?: string) {
    return toClient(
      await this.prisma.stockMovement.findMany({
        where: productId ? { productId } : {},
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    );
  }

  /** Manual stock adjustment (recount, write-off, correction). */
  async adjust(productId: string, body: { qty: number; note?: string }, userId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    if (!body.qty) throw new BadRequestException('qty is required and must be non-zero');
    await this.applyMovement({
      productId,
      qty: body.qty,
      type: 'adjustment',
      refType: 'manual',
      note: body.note,
      userId,
    });
    return toClient(await this.prisma.stockItem.findUnique({ where: { productId } }));
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
