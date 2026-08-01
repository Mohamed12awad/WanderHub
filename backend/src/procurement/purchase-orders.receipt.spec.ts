import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

const authUser = (id: string, permissions = ['*']) => ({
  id,
  role: 'member',
  roleId: 'member-role',
  permissions,
});

/**
 * Audit 2026-08 (P0) — PO receipt had two divergent paths and was not atomic.
 *
 *  - `updateStatus('received')` created stock with no unit cost and no GRNI,
 *    keyed `refType: 'PurchaseOrder'`, while `receive()` probes for
 *    `refType: 'po-receipt'`. The two could not see each other, so the same PO
 *    could be received twice — once uncosted, once costed.
 *  - `receive()` committed each line independently, so a mid-loop failure left
 *    partial stock, the PO unflagged, and every retry rejected by its own
 *    idempotency probe: permanently unreceivable.
 */

interface Movement {
  productId: string;
  qty: number;
  unitCost?: number;
  refType?: string;
  refId?: string;
}

function build(opts: { failGrniOnLine?: number; alreadyReceived?: boolean } = {}) {
  const committedMovements: Movement[] = [];
  let stagedMovements: Movement[] = [];
  const poRow = { id: 'po1', poNumber: 'PO-1', approvalStatus: 'approved', status: 'ordered', supplierId: 's1' };
  let committedStatus = poRow.status;
  let stagedStatus = poRow.status;

  const items = [
    { id: 'i1', productId: 'p1', description: 'A', quantity: 5, receivedQty: 0, billedQty: 0, unitPrice: 10, order: 0 },
    { id: 'i2', productId: 'p2', description: 'B', quantity: 3, receivedQty: 0, billedQty: 0, unitPrice: 20, order: 1 },
  ];

  const txClient = {
    stockMovement: {
      findFirst: jest.fn(async ({ where }: any) =>
        [...committedMovements, ...stagedMovements].find(
          (m) => m.refType === where.refType && m.refId === where.refId,
        ) ?? null,
      ),
    },
    product: { findUnique: jest.fn(async () => ({ tracksInventory: true })) },
    purchaseOrderItem: {
      update: jest.fn(async ({ where, data }: any) => {
        const it = items.find((i) => i.id === where.id)!;
        it.receivedQty += data.receivedQty.increment;
        return it;
      }),
      findMany: jest.fn(async () => items.map((i) => ({ quantity: i.quantity, receivedQty: i.receivedQty }))),
    },
    purchaseOrder: {
      update: jest.fn(async ({ data }: any) => {
        stagedStatus = data.status;
        return { ...poRow, status: stagedStatus };
      }),
    },
  };

  const prisma: any = {
    purchaseOrder: {
      findFirst: jest.fn(async () => (opts.alreadyReceived ? { ...poRow, status: 'received' } : poRow)),
      findUnique: jest.fn(async () => ({ ...poRow, status: committedStatus, items })),
      update: jest.fn(async ({ data }: any) => {
        committedStatus = data.status;
        return { ...poRow, status: committedStatus };
      }),
    },
    $transaction: jest.fn(async (cb: any) => {
      stagedMovements = [];
      stagedStatus = committedStatus;
      try {
        const out = await cb(txClient);
        committedMovements.push(...stagedMovements); // commit
        committedStatus = stagedStatus;
        return out;
      } finally {
        stagedMovements = [];
      }
    }),
  };

  // `receive` reads the PO (with items) before opening the transaction.
  prisma.purchaseOrder.findFirst = jest.fn(async () =>
    opts.alreadyReceived ? { ...poRow, status: 'received', items } : { ...poRow, items },
  );

  let line = 0;
  const inventory: any = {
    applyMovement: jest.fn(async (input: Movement) => {
      stagedMovements.push(input);
      return { id: `mv${stagedMovements.length}`, qty: input.qty, unitCost: input.unitCost, createdAt: new Date(), warehouseId: 'w1' };
    }),
  };
  const posting: any = {
    getGlConfig: jest.fn(async () => ({})),
    postGrni: jest.fn(async () => {
      line += 1;
      if (opts.failGrniOnLine === line) throw new Error('missing GRNI mapping');
    }),
  };
  const timeline: any = { log: jest.fn() };
  const visibility: any = { ownershipWhere: jest.fn().mockResolvedValue({}) };

  const svc = new PurchaseOrdersService(
    prisma,            // prisma
    {} as any,         // numberSequence
    timeline,          // timeline
    inventory,         // inventory
    {} as any,         // approvals
    {} as any,         // customFields
    visibility,        // visibility
    posting,           // posting
  );

  return {
    svc,
    prisma,
    inventory,
    visibility,
    committed: () => committedMovements,
    status: () => committedStatus,
  };
}

describe('PurchaseOrdersService.receive — atomicity', () => {
  it('commits every line and the status together on success', async () => {
    const { svc, committed, status } = build();
    await svc.receive('po1', authUser('u1'));
    expect(committed()).toHaveLength(2);
    expect(status()).toBe('received');
  });

  it('rolls back all stock when a GRNI posting fails partway through', async () => {
    const { svc, committed, status } = build({ failGrniOnLine: 2 });
    await expect(svc.receive('po1', authUser('u1'))).rejects.toThrow('missing GRNI mapping');
    // Neither line may survive — a partial receipt leaves the PO unreceivable.
    expect(committed()).toHaveLength(0);
    expect(status()).toBe('ordered');
  });

  it('rejects a second receipt', async () => {
    const { svc } = build();
    await svc.receive('po1', authUser('u1'));
    await expect(svc.receive('po1', authUser('u1'))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PurchaseOrdersService.updateStatus — no longer moves stock', () => {
  it('creates no stock movement when the status becomes "received"', async () => {
    const { svc, inventory, committed } = build();
    await svc.updateStatus('po1', 'received', authUser('u1'));
    expect(inventory.applyMovement).not.toHaveBeenCalled();
    expect(committed()).toHaveLength(0);
  });
});

describe('PurchaseOrdersService — mutation scope', () => {
  it('returns not-found and performs no write for another user\'s purchase order', async () => {
    const { svc, prisma, visibility } = build();
    const otherUserPo = {
      id: 'po-user-b',
      createdById: 'user-b',
      status: 'draft',
      approvalStatus: 'pending',
      deletedAt: null,
    };
    const user = authUser('user-a', ['purchase-orders:edit:own']);
    visibility.ownershipWhere.mockResolvedValue({ createdById: 'user-a' });
    prisma.purchaseOrder.findFirst.mockImplementation(async ({ where }: any) =>
      where.createdById === 'user-a' ? null : otherUserPo,
    );

    await expect(svc.update('po-user-b', { title: 'tampered' } as any, user))
      .rejects.toBeInstanceOf(NotFoundException);

    expect(visibility.ownershipWhere).toHaveBeenCalledWith(user, 'purchase-orders', 'createdById');
    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith({
      where: { id: 'po-user-b', deletedAt: null, createdById: 'user-a' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });
});
