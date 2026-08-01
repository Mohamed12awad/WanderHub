import { NotFoundException } from '@nestjs/common';
import { VendorBillsService } from './vendor-bills.service';

const authUser = (id: string, role = 'admin', permissions = ['*']) => ({
  id,
  role,
  roleId: `${role}-role`,
  permissions,
});

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
  const visibility: any = { ownershipWhere: jest.fn().mockResolvedValue({}) };
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
    visibility,
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

function buildBillLifecycle() {
  const existing = {
    id: 'bill-lifecycle',
    billNumber: 'BILL-LIFECYCLE',
    title: 'Lifecycle bill',
    approvalStatus: 'approved',
    taxRate: 0,
    taxInclusive: false,
    total: 100,
    createdById: 'creator-1',
    deletedAt: null,
  };
  const tx: any = {
    vendorBillItem: {
      deleteMany: jest.fn(async () => ({ count: 1 })),
      createMany: jest.fn(async () => ({ count: 1 })),
    },
    vendorBill: {
      update: jest.fn(async ({ data }: any) => ({ ...existing, ...data })),
    },
  };
  const prisma: any = {
    vendorBill: {
      findFirst: jest.fn(async () => existing),
      update: jest.fn(),
    },
    vendorBillPayment: { count: jest.fn(async () => 0) },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  const svc = makeService(prisma);
  return { svc, prisma, tx, posting: (svc as any).posting };
}

describe('VendorBillsService — document/journal atomicity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a failed GL post rolls back vendor bill approval', async () => {
    const { prisma, state } = buildAtomicBillApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postVendorBill.mockRejectedValue(new Error('missing AP mapping'));

    await expect(svc.approve('bill-atomic', authUser('approver-1'))).rejects.toThrow('missing AP mapping');

    expect(state().bill.approvalStatus).toBe('pending');
    expect(state().journals).toHaveLength(0);
  });

  it('a successful GL post commits vendor bill approval and its journal entry', async () => {
    const { prisma, tx, state } = buildAtomicBillApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postVendorBill.mockImplementation(async (_bill: any, postingTx: any) => {
      await postingTx.journalEntry.create({ data: { sourceType: 'VendorBill', sourceId: 'bill-atomic' } });
    });

    await svc.approve('bill-atomic', authUser('approver-1'));

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

describe('VendorBillsService — segregation of duties', () => {
  it('blocks self-approval when the approval workflow is disabled', async () => {
    const bill = {
      id: 'bill-self', createdById: 'user-1', approvalStatus: 'pending', deletedAt: null,
    };
    const prisma: any = {
      vendorBill: { findFirst: jest.fn(async () => bill) },
      workspaceConfig: { findFirst: jest.fn(async () => null) },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);

    await expect(svc.approve('bill-self', authUser('user-1'))).rejects.toThrow('Cannot approve your own bill');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks self-rejection when the approval workflow is disabled', async () => {
    const bill = {
      id: 'bill-self', createdById: 'user-1', approvalStatus: 'pending', deletedAt: null,
    };
    const prisma: any = {
      vendorBill: { findFirst: jest.fn(async () => bill) },
      workspaceConfig: { findFirst: jest.fn(async () => null) },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);

    await expect(svc.reject('bill-self', 'no', authUser('user-1'))).rejects.toThrow('Cannot reject your own bill');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('VendorBillsService — postings follow the document lifecycle', () => {
  it('reverses the live entry when an approved bill is edited', async () => {
    const { svc, tx, posting } = buildBillLifecycle();

    await svc.update(
      'bill-lifecycle',
      { items: [{ description: 'Replacement', quantity: 1, unitPrice: 75 }] } as any,
      authUser('editor-1'),
    );

    expect(posting.reverseLive).toHaveBeenCalledWith(
      'VendorBill', 'bill-lifecycle', { createdById: 'editor-1' }, tx,
    );
    expect(tx.vendorBill.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ approvalStatus: 'pending', total: 75 }),
    }));
  });

  it('reverses the live entry when an approved bill is deleted', async () => {
    const { svc, prisma, tx, posting } = buildBillLifecycle();

    await svc.remove('bill-lifecycle', authUser('deleter-1'));

    // The reversal must be attributed, or the journal records who deleted nothing.
    expect(posting.reverseLive).toHaveBeenCalledWith('VendorBill', 'bill-lifecycle', { createdById: 'deleter-1' }, tx);
    expect(tx.vendorBill.update).toHaveBeenCalledWith({
      where: { id: 'bill-lifecycle' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prisma.vendorBill.update).not.toHaveBeenCalled();
  });
});

describe('VendorBillsService — mutation scope', () => {
  it('returns not-found and performs no write for another user\'s vendor bill', async () => {
    const otherUserBill = {
      id: 'bill-user-b',
      createdById: 'user-b',
      approvalStatus: 'pending',
      deletedAt: null,
    };
    const prisma: any = {
      vendorBill: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.createdById === 'user-a' ? null : otherUserBill,
        ),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);
    const user = authUser('user-a', 'member', ['vendor-bills:edit:own']);
    (svc as any).visibility.ownershipWhere.mockResolvedValue({ createdById: 'user-a' });

    await expect(svc.update('bill-user-b', { title: 'tampered' } as any, user))
      .rejects.toBeInstanceOf(NotFoundException);

    expect((svc as any).visibility.ownershipWhere).toHaveBeenCalledWith(user, 'vendor-bills', 'createdById');
    expect(prisma.vendorBill.findFirst).toHaveBeenCalledWith({
      where: { id: 'bill-user-b', deletedAt: null, createdById: 'user-a' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.vendorBill.update).not.toHaveBeenCalled();
  });
});
