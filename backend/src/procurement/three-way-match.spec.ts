import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

/**
 * Audit 2026-08 (P1 item 10) — procurement had no three-way match.
 *
 * `receive()` was all-or-nothing: it received the ENTIRE ordered quantity, once,
 * with no partial receipt and no over-receipt check. Billing was equally blunt —
 * a PO could be billed exactly once, for its full ordered value, regardless of
 * what had actually arrived. A supplier who shipped 80 of 100 units was still
 * billed for 100 and nothing objected.
 *
 * The match now runs ordered → received → billed, tracked cumulatively per line
 * on `PurchaseOrderItem.receivedQty` / `billedQty`.
 */
const user = { id: 'u1', role: 'admin', roleId: 'r', permissions: ['*'] } as never;

function build(opts: { receivedQty?: number; tolerancePct?: number } = {}) {
  const item = {
    id: 'line1', productId: 'p1', description: 'Widget', quantity: 100,
    receivedQty: opts.receivedQty ?? 0, billedQty: 0, unitPrice: 10, discount: 0,
    taxRate: 0, taxCode: null, total: 1000, order: 0,
  };
  const po = {
    id: 'po1', poNumber: 'PO-1', approvalStatus: 'approved', status: 'ordered',
    supplierId: 's1', currency: 'EGP', taxRate: 0, items: [item],
  };
  const increments: { id: string; qty: number }[] = [];
  let status = po.status;

  const tx: any = {
    product: { findUnique: jest.fn(async () => ({ tracksInventory: true })) },
    purchaseOrderItem: {
      update: jest.fn(async ({ where, data }: any) => {
        increments.push({ id: where.id, qty: data.receivedQty.increment });
        item.receivedQty += data.receivedQty.increment;
        return item;
      }),
      findMany: jest.fn(async () => [{ quantity: item.quantity, receivedQty: item.receivedQty }]),
    },
    purchaseOrder: { update: jest.fn(async ({ data }: any) => { status = data.status; return po; }) },
  };

  const prisma: any = {
    purchaseOrder: {
      findFirst: jest.fn(async () => po),
      findUnique: jest.fn(async () => ({ ...po, status })),
    },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };

  const svc = new PurchaseOrdersService(
    prisma,
    {} as any,                                                   // numberSequence
    { log: jest.fn() } as any,                                   // timeline
    { applyMovement: jest.fn(async (i: any) => ({ id: 'mv', qty: i.qty, unitCost: i.unitCost, createdAt: new Date(), warehouseId: 'w1' })) } as any,
    {} as any,                                                   // approvals
    {} as any,                                                   // customFields
    { ownershipWhere: jest.fn(async () => ({})) } as any,        // visibility
    { postGrni: jest.fn(), getGlConfig: jest.fn(async () => ({ overReceiptTolerancePct: opts.tolerancePct ?? 0 })) } as any, // posting
  );

  return { svc, increments, item, status: () => status };
}

describe('Three-way match — ordered → received', () => {
  it('receives a partial quantity and leaves the order open', async () => {
    const { svc, increments, status } = build();
    await svc.receive('po1', user, undefined, [{ itemId: 'line1', qty: 40 }]);
    expect(increments).toEqual([{ id: 'line1', qty: 40 }]);
    expect(status()).toBe('partially_received');
  });

  it('marks the order received once every line is satisfied', async () => {
    const { svc, status } = build({ receivedQty: 60 });
    await svc.receive('po1', user, undefined, [{ itemId: 'line1', qty: 40 }]);
    expect(status()).toBe('received');
  });

  it('refuses to receive more than was ordered', async () => {
    const { svc, increments } = build({ receivedQty: 90 });
    await expect(
      svc.receive('po1', user, undefined, [{ itemId: 'line1', qty: 20 }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(increments).toHaveLength(0);
  });

  it('allows over-receipt within a configured tolerance', async () => {
    // 5% tolerance on 100 ordered ⇒ 105 receivable.
    const { svc, increments } = build({ receivedQty: 100, tolerancePct: 5 });
    await svc.receive('po1', user, undefined, [{ itemId: 'line1', qty: 5 }]);
    expect(increments).toEqual([{ id: 'line1', qty: 5 }]);
  });

  it('defaults to receiving everything still outstanding', async () => {
    const { svc, increments } = build({ receivedQty: 30 });
    await svc.receive('po1', user);
    expect(increments).toEqual([{ id: 'line1', qty: 70 }]);
  });

  it('rejects a receipt against a fully received order', async () => {
    const { svc } = build({ receivedQty: 100 });
    await expect(svc.receive('po1', user)).rejects.toThrow(/already been fully received/i);
  });

  it('rejects an unknown line id', async () => {
    const { svc } = build();
    await expect(
      svc.receive('po1', user, undefined, [{ itemId: 'nope', qty: 1 }]),
    ).rejects.toThrow(/Unknown purchase order line/);
  });
});
