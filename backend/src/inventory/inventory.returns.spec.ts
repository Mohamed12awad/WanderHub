import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

/**
 * Audit 2026-08 — `returnStock` had two defects.
 *
 *  - The restoring movement committed in its own transaction and the COGS
 *    reversal was posted outside any transaction, so a failed reversal left
 *    stock back on hand with its COGS still standing.
 *  - The quantity was validated against the ORIGINAL outbound only, ignoring
 *    prior returns, so a sale of 10 could be returned 10 twice: 20 units back
 *    and double the COGS reversed against a single sale.
 */
function build(opts: { alreadyReturned?: number; failReversal?: boolean } = {}) {
  const outbound = {
    id: 'sale-move', productId: 'p1', warehouseId: 'w1', qty: -10, unitCost: 100, refId: 'inv1',
  };
  const committed: { qty: number }[] = [];
  let staged: { qty: number }[] = [];

  const tx: any = {
    stockMovement: {
      findUnique: jest.fn(async () => outbound),
      aggregate: jest.fn(async () => ({ _sum: { qty: opts.alreadyReturned ?? 0 } })),
    },
  };

  const prisma: any = {
    $transaction: jest.fn(async (cb: any) => {
      staged = [];
      const out = await cb(tx);
      committed.push(...staged); // only on success
      return out;
    }),
  };

  const svc = new InventoryService(prisma, {} as any, {
    postCogsReversal: jest.fn(async () => {
      if (opts.failReversal) throw new Error('missing COGS mapping');
    }),
  } as any);

  // applyMovementTx is the private transactional worker; stub it so the test
  // targets returnStock's own logic rather than re-testing costing.
  (svc as any).applyMovementTx = jest.fn(async (input: { qty: number }) => {
    staged.push({ qty: input.qty });
    return { id: 'return-move', qty: input.qty, unitCost: 100, createdAt: new Date(), warehouseId: 'w1' };
  });

  return { svc, committed: () => committed };
}

describe('InventoryService.returnStock', () => {
  it('accepts a return within the outstanding quantity', async () => {
    const { svc, committed } = build();
    await svc.returnStock({ movementId: 'sale-move', qty: 6 }, 'u1');
    expect(committed()).toEqual([{ qty: 6 }]);
  });

  it('counts prior returns against the original outbound', async () => {
    // 6 of the 10 already came back; only 4 remain returnable.
    const { svc, committed } = build({ alreadyReturned: 6 });
    await expect(
      svc.returnStock({ movementId: 'sale-move', qty: 5 }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(committed()).toHaveLength(0);
  });

  it('allows exactly the remaining quantity', async () => {
    const { svc, committed } = build({ alreadyReturned: 6 });
    await svc.returnStock({ movementId: 'sale-move', qty: 4 }, 'u1');
    expect(committed()).toEqual([{ qty: 4 }]);
  });

  it('rolls the restoring movement back when the COGS reversal fails', async () => {
    const { svc, committed } = build({ failReversal: true });
    await expect(
      svc.returnStock({ movementId: 'sale-move', qty: 5 }, 'u1'),
    ).rejects.toThrow('missing COGS mapping');
    expect(committed()).toHaveLength(0);
  });
});
