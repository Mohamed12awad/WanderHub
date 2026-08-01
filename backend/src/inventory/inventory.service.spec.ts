import { InventoryService } from './inventory.service';

function buildAdjustment(opts: { startQty?: number; unitCost: number; failPosting?: boolean }) {
  let committedQty = opts.startQty ?? 0;
  let stagedQty = committedQty;
  const tx: any = {};
  const movementDate = new Date('2026-08-01T10:00:00.000Z');

  const prisma: any = {
    product: { findFirst: jest.fn(async () => ({ id: 'product-1' })) },
    stockItem: {
      findUnique: jest.fn(async () => ({
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        quantityOnHand: committedQty,
      })),
    },
    $transaction: jest.fn(async (callback: any) => {
      stagedQty = committedQty;
      try {
        const result = await callback(tx);
        committedQty = stagedQty;
        return result;
      } finally {
        stagedQty = committedQty;
      }
    }),
  };
  const posting: any = {
    shouldPost: jest.fn(async () => true),
    getGlConfig: jest.fn(async () => ({
      defaultInventoryAsset: '1300',
      defaultInventoryAdjustment: '5300',
    })),
    coaIdByCode: jest.fn(async (code: string) => ({ '1300': 'asset-account', '5300': 'adjustment-account' })[code]),
    post: jest.fn(async () => {
      if (opts.failPosting) throw new Error('missing adjustment mapping');
    }),
  };
  const service = new InventoryService(prisma, {} as any, posting);
  const applyMovement = jest.spyOn(service, 'applyMovement').mockImplementation(async (input, postingTx) => {
    expect(postingTx).toBe(tx);
    stagedQty += input.qty;
    return {
      id: 'movement-1',
      productId: input.productId,
      warehouseId: input.warehouseId ?? 'warehouse-1',
      qty: input.qty,
      type: input.type,
      unitCost: opts.unitCost,
      costMethod: 'weighted_average',
      adjustmentReason: input.adjustmentReason ?? null,
      createdAt: movementDate,
    } as any;
  });

  return { service, posting, tx, applyMovement, committedQty: () => committedQty };
}

function balanceOf(lines: Array<{ debit?: number; credit?: number }>) {
  return lines.reduce((sum, line) => sum + (line.debit ?? 0) - (line.credit ?? 0), 0);
}

describe('InventoryService.adjust — inventory adjustment GL', () => {
  it('posts a balanced asset increase for a positive adjustment', async () => {
    const { service, posting, tx } = buildAdjustment({ unitCost: 12 });

    await service.adjust(
      'product-1',
      { qty: 5, unitCost: 12, warehouseId: 'warehouse-1', reason: 'recount' },
      'user-1',
    );

    const [entry, postingTx] = posting.post.mock.calls[0];
    expect(postingTx).toBe(tx);
    expect(entry).toMatchObject({
      sourceType: 'StockAdjustment',
      sourceId: 'movement-1',
      createdById: 'user-1',
      lines: [
        { accountId: 'asset-account', debit: 60 },
        { accountId: 'adjustment-account', credit: 60 },
      ],
    });
    expect(balanceOf(entry.lines)).toBe(0);
  });

  it('posts a balanced asset decrease for a negative adjustment', async () => {
    const { service, posting } = buildAdjustment({ startQty: 10, unitCost: 7 });

    await service.adjust(
      'product-1',
      { qty: -3, warehouseId: 'warehouse-1', reason: 'damage' },
      'user-1',
    );

    const entry = posting.post.mock.calls[0][0];
    expect(entry.lines).toMatchObject([
      { accountId: 'adjustment-account', debit: 21 },
      { accountId: 'asset-account', credit: 21 },
    ]);
    expect(balanceOf(entry.lines)).toBe(0);
  });

  it('rolls the stock movement back when adjustment posting fails', async () => {
    const { service, committedQty, posting } = buildAdjustment({ startQty: 10, unitCost: 4, failPosting: true });

    await expect(
      service.adjust('product-1', { qty: -2, warehouseId: 'warehouse-1' }, 'user-1'),
    ).rejects.toThrow('missing adjustment mapping');

    expect(posting.post).toHaveBeenCalledTimes(1);
    expect(committedQty()).toBe(10);
  });
});
