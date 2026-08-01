import { VendorBillsService } from './vendor-bills.service';

function makeService(prisma: any) {
  const numberSequence: any = { nextNumber: jest.fn() };
  const timeline: any = { log: jest.fn().mockResolvedValue(undefined) };
  const approvals: any = {
    isEnabled: jest.fn().mockResolvedValue(false),
    initSteps: jest.fn(),
    listSteps: jest.fn().mockResolvedValue([]),
    act: jest.fn(),
  };
  const customFields: any = { validateAndClean: jest.fn() };
  const posting: any = {
    postVendorBill: jest.fn().mockResolvedValue(undefined),
    postVendorBillPayment: jest.fn().mockResolvedValue(undefined),
    reverseLive: jest.fn().mockResolvedValue(undefined),
  };
  const currency: any = {
    convert: jest.fn(async (amount: number) => amount),
    toBase: jest.fn(async (amount: number) => amount),
    getBaseCurrency: jest.fn().mockResolvedValue('EGP'),
  };

  return new VendorBillsService(
    prisma,
    numberSequence,
    timeline,
    approvals,
    customFields,
    posting,
    currency,
  );
}

function buildAtomicBillApproval() {
  let persistedBill: any = {
    id: 'bill-atomic',
    billNumber: 'BILL-ATOMIC',
    title: 'Atomic bill',
    currency: 'EGP',
    exchangeRate: 1,
    subtotal: 100,
    tax: 0,
    total: 100,
    supplierId: 'supplier-1',
    purchaseOrderId: null,
    createdAt: new Date('2026-08-01'),
    createdById: 'creator-1',
    approvalStatus: 'pending',
    status: 'draft',
    deletedAt: null,
  };
  let persistedJournals: any[] = [];
  let stagedBill: any;
  let stagedJournals: any[];

  const tx: any = {
    vendorBill: {
      update: jest.fn(async ({ data }: any) => {
        stagedBill = { ...stagedBill, ...data };
        return stagedBill;
      }),
      findFirst: jest.fn(async () => stagedBill),
    },
    journalEntry: {
      findFirst: jest.fn(async () => stagedJournals[0] ?? null),
      create: jest.fn(async ({ data }: any) => {
        stagedJournals.push(data);
        return data;
      }),
    },
  };
  const prisma: any = {
    vendorBill: { findFirst: jest.fn(async () => persistedBill) },
    journalEntry: { findFirst: jest.fn() },
    workspaceConfig: {
      findFirst: jest.fn().mockResolvedValue({
        approvals: [{ module: 'vendor_bills', enabled: true, approverRoles: ['admin'] }],
      }),
    },
    $transaction: jest.fn(async (callback: any) => {
      stagedBill = { ...persistedBill };
      stagedJournals = [...persistedJournals];
      const result = await callback(tx);
      persistedBill = stagedBill;
      persistedJournals = stagedJournals;
      return result;
    }),
  };

  return {
    prisma,
    tx,
    state: () => ({ bill: persistedBill, journals: persistedJournals }),
  };
}

describe('VendorBillsService — document/journal atomicity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a failed GL post rolls back vendor bill approval', async () => {
    const { prisma, state } = buildAtomicBillApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postVendorBill.mockRejectedValue(new Error('missing AP mapping'));

    await expect(svc.approve('bill-atomic', 'approver-1', 'admin')).rejects.toThrow('missing AP mapping');

    expect(state().bill.approvalStatus).toBe('pending');
    expect(state().journals).toHaveLength(0);
  });

  it('a successful GL post commits vendor bill approval and its journal entry', async () => {
    const { prisma, tx, state } = buildAtomicBillApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postVendorBill.mockImplementation(async (_bill: any, postingTx: any) => {
      await postingTx.journalEntry.create({ data: { sourceType: 'VendorBill', sourceId: 'bill-atomic' } });
    });

    await svc.approve('bill-atomic', 'approver-1', 'admin');

    expect(state().bill).toMatchObject({ approvalStatus: 'approved', status: 'received' });
    expect(state().journals).toEqual([{ sourceType: 'VendorBill', sourceId: 'bill-atomic' }]);
    expect((svc as any).posting.postVendorBill).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bill-atomic' }),
      tx,
      'approver-1',
      { useGrni: false },
      undefined,
    );
  });
});
