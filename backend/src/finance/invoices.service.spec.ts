import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

// Builds a fake interactive-transaction client and a prisma mock whose
// $transaction simply runs the callback against that client.
function buildMocks() {
  const invoiceFindFirst = jest.fn();
  const invoiceUpdate = jest.fn();
  const journalEntry = {
    // No prior issued entry by default ⇒ first approval posts under the base id.
    findFirst: jest.fn().mockResolvedValue(null),
  };
  const tx = {
    invoice: { findFirst: invoiceFindFirst, findUnique: jest.fn(), update: invoiceUpdate },
    invoicePayment: { create: jest.fn(), aggregate: jest.fn(), update: jest.fn(), delete: jest.fn() },
    account: { findFirst: jest.fn(), update: jest.fn() },
    deal: { update: jest.fn() },
    journalEntry,
  };
  const prisma: any = {
    invoice: { findFirst: invoiceFindFirst, findUnique: jest.fn(), update: invoiceUpdate },
    invoicePayment: { findFirst: jest.fn() },
    quote: { findFirst: jest.fn() },
    journalEntry,
    workspaceConfig: { findFirst: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((cb: any) => cb(tx)),
  };
  return { prisma, tx };
}

function makeService(prisma: any) {
  const numberSequence: any = { nextNumber: jest.fn() };
  const timeline: any = { log: jest.fn() };
  const inventory: any = { applyMovement: jest.fn() };
  // Default: no persisted chain, so approve/reject take the legacy single-step path.
  const approvals: any = {
    isEnabled: jest.fn().mockResolvedValue(false),
    initSteps: jest.fn().mockResolvedValue('approved'),
    listSteps: jest.fn().mockResolvedValue([]),
    act: jest.fn(),
  };
  const customFields: any = { validateAndClean: jest.fn() };
  const visibility: any = { ownershipWhere: jest.fn().mockResolvedValue({}) };
  const posting: any = {
    postInvoiceIssued: jest.fn().mockResolvedValue(undefined),
    postInvoicePayment: jest.fn().mockResolvedValue(undefined),
    reverseLive: jest.fn().mockResolvedValue(undefined),
  };
  // Same-currency conversions return the amount unchanged (mirrors the real
  // CurrencyService short-circuit on from === to).
  const currency: any = {
    convert: jest.fn(async (amount: number) => amount),
    toBase: jest.fn(async (amount: number) => amount),
    getBaseCurrency: jest.fn().mockResolvedValue('EGP'),
  };
  const workspaceConfig: any = { get: jest.fn().mockResolvedValue({ invoiceDefaults: {} }) };
  return new InvoicesService(prisma, numberSequence, timeline, inventory, approvals, customFields, visibility, posting, currency, workspaceConfig);
}

const mockUser: any = { id: 'user1', role: 'admin', roleId: 'role-admin', permissions: ['*'] };

function buildAtomicInvoiceApproval() {
  let persistedInvoice: any = {
    id: 'inv-atomic',
    invoiceNumber: 'INV-ATOMIC',
    issueDate: new Date('2026-08-01'),
    currency: 'EGP',
    exchangeRate: 1,
    subtotal: 100,
    tax: 0,
    total: 100,
    customerId: 'customer-1',
    createdById: 'creator-1',
    approvalStatus: 'pending',
    deletedAt: null,
  };
  let persistedJournals: any[] = [];
  let stagedInvoice: any;
  let stagedJournals: any[];

  const tx: any = {
    invoice: {
      update: jest.fn(async ({ data }: any) => {
        stagedInvoice = { ...stagedInvoice, ...data };
        return stagedInvoice;
      }),
      findFirst: jest.fn(async () => stagedInvoice),
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
    invoice: { findFirst: jest.fn(async () => persistedInvoice) },
    journalEntry: { findFirst: jest.fn() },
    workspaceConfig: {
      findFirst: jest.fn().mockResolvedValue({
        approvals: [{ module: 'invoices', enabled: true, approverRoles: ['admin'] }],
      }),
    },
    $transaction: jest.fn(async (callback: any) => {
      stagedInvoice = { ...persistedInvoice };
      stagedJournals = [...persistedJournals];
      const result = await callback(tx);
      persistedInvoice = stagedInvoice;
      persistedJournals = stagedJournals;
      return result;
    }),
  };

  return {
    prisma,
    tx,
    state: () => ({ invoice: persistedInvoice, journals: persistedJournals }),
  };
}

describe('InvoicesService — approval separation of duties', () => {
  beforeEach(() => jest.clearAllMocks());
  it('throws ForbiddenException when the creator tries to approve their own invoice', async () => {
    const { prisma } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', createdById: 'user1', deletedAt: null });
    const svc = makeService(prisma);

    await expect(svc.approveInvoice('inv1', 'user1', 'admin')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when an unauthorized role tries to approve', async () => {
    const { prisma } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', createdById: 'other', deletedAt: null });
    prisma.workspaceConfig.findFirst.mockResolvedValue({ approvals: [{ module: 'invoices', enabled: true, approverRoles: ['manager'] }] });
    const svc = makeService(prisma);

    await expect(svc.approveInvoice('inv1', 'user1', 'sales')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it('approves when a different, authorized user acts', async () => {
    const { prisma } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', createdById: 'other', deletedAt: null });
    prisma.workspaceConfig.findFirst.mockResolvedValue({ approvals: [{ module: 'invoices', enabled: true, approverRoles: ['admin'] }] });
    prisma.invoice.update.mockResolvedValue({ id: 'inv1', approvalStatus: 'approved' });
    const svc = makeService(prisma);

    const res: any = await svc.approveInvoice('inv1', 'approver1', 'admin');

    expect(prisma.invoice.update).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.update.mock.calls[0][0].data).toMatchObject({
      approvalStatus: 'approved',
      approvedById: 'approver1',
    });
    expect(res._id).toBe('inv1');
  });

  it('clears approvedBy/approvedAt and reverses the GL entry when rejecting a previously-approved invoice', async () => {
    const { prisma, tx } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', createdById: 'other', approvalStatus: 'approved', approvedById: 'approver1', deletedAt: null });
    prisma.workspaceConfig.findFirst.mockResolvedValue({ approvals: [{ module: 'invoices', enabled: true, approverRoles: ['admin'] }] });
    tx.invoice.update.mockResolvedValue({ id: 'inv1', approvalStatus: 'rejected' });
    const svc = makeService(prisma);

    await svc.rejectInvoice('inv1', 'approver1', 'bad numbers', 'admin', ['*']);

    // The status update now runs inside the reject $transaction (on the tx client).
    expect(tx.invoice.update.mock.calls[0][0].data).toMatchObject({
      approvalStatus: 'rejected',
      approvedById: null,
      approvedAt: null,
      rejectionReason: 'bad numbers',
    });
    // The issued GL entry approval posted must be reversed in the same transaction.
    expect((svc as any).posting.reverseLive).toHaveBeenCalledWith('Invoice', 'inv1', { createdById: 'approver1' }, tx);
  });

  it('re-posts the issued entry under a versioned sourceId on re-approval after a reject', async () => {
    const { prisma } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', createdById: 'other', deletedAt: null });
    prisma.workspaceConfig.findFirst.mockResolvedValue({ approvals: [{ module: 'invoices', enabled: true, approverRoles: ['admin'] }] });
    prisma.invoice.update.mockResolvedValue({ id: 'inv1', approvalStatus: 'approved' });
    // A prior (reversed) issued entry exists from the first approval, so post()
    // would no-op on the base id — re-approval must use a versioned sourceId.
    prisma.journalEntry.findFirst.mockResolvedValue({ id: 'je1' });
    const svc = makeService(prisma);

    await svc.approveInvoice('inv1', 'approver1', 'admin');

    const sourceIdArg = (svc as any).posting.postInvoiceIssued.mock.calls[0][3];
    expect(sourceIdArg).toMatch(/^inv1#r\d+$/);
  });

  it('a failed GL post rolls back invoice approval', async () => {
    const { prisma, state } = buildAtomicInvoiceApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postInvoiceIssued.mockRejectedValue(new Error('missing AR mapping'));

    await expect(svc.approveInvoice('inv-atomic', 'approver-1', 'admin')).rejects.toThrow('missing AR mapping');

    expect(state().invoice.approvalStatus).toBe('pending');
    expect(state().journals).toHaveLength(0);
  });

  it('a successful GL post commits invoice approval and its journal entry', async () => {
    const { prisma, tx, state } = buildAtomicInvoiceApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postInvoiceIssued.mockImplementation(async (_invoice: any, postingTx: any) => {
      await postingTx.journalEntry.create({ data: { sourceType: 'Invoice', sourceId: 'inv-atomic' } });
    });

    await svc.approveInvoice('inv-atomic', 'approver-1', 'admin');

    expect(state().invoice.approvalStatus).toBe('approved');
    expect(state().journals).toEqual([{ sourceType: 'Invoice', sourceId: 'inv-atomic' }]);
    expect((svc as any).posting.postInvoiceIssued).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inv-atomic' }),
      tx,
      'approver-1',
      undefined,
    );
  });
});

describe('InvoicesService — recordPayment', () => {
  beforeEach(() => jest.clearAllMocks());
  it('recomputes totalPaid as the SUM of payments inside the transaction', async () => {
    const { prisma, tx } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', total: 100, currency: 'EGP', approvalStatus: 'approved', dealId: null, dueDate: null, deletedAt: null });
    tx.invoicePayment.create.mockResolvedValue({ id: 'p2', amount: 60, currency: 'EGP', method: 'cash' });
    // recalcInvoiceTotals internals:
    tx.invoice.findUnique.mockResolvedValue({ id: 'inv1', total: 100, dueDate: null });
    tx.invoicePayment.aggregate.mockResolvedValue({ _sum: { amount: 90 } }); // 30 existing + 60 new
    tx.invoice.update.mockResolvedValue({ id: 'inv1', total: 100, totalPaid: 90, status: 'partially_paid' });
    prisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', total: 100, totalPaid: 90, status: 'partially_paid' });

    const svc = makeService(prisma);
    const res: any = await svc.recordPayment('inv1', { amount: 60, date: '2026-05-29' } as any, mockUser);

    // totalPaid is the aggregate sum, not invoice.totalPaid + amount.
    expect(tx.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalPaid: 90, status: 'partially_paid' } }),
    );
    expect(res.invoice.totalPaid).toBe(90);
  });

  it('blocks a payment whose currency differs from the account currency', async () => {
    const { prisma, tx } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', total: 100, currency: 'EGP', approvalStatus: 'approved', dealId: null, dueDate: null, deletedAt: null });
    tx.invoicePayment.create.mockResolvedValue({ id: 'p1', amount: 50, currency: 'EGP', method: 'cash' });
    tx.account.findFirst.mockResolvedValue({ id: 'acc1', currency: 'USD', deletedAt: null });

    const svc = makeService(prisma);

    await expect(
      svc.recordPayment('inv1', { amount: 50, date: '2026-05-29', accountId: 'acc1' } as any, mockUser),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.account.update).not.toHaveBeenCalled();
  });

  it('moves the account balance by the payment amount when currencies match', async () => {
    const { prisma, tx } = buildMocks();
    prisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', total: 100, currency: 'EGP', approvalStatus: 'approved', dealId: null, dueDate: null, deletedAt: null });
    tx.invoicePayment.create.mockResolvedValue({ id: 'p1', amount: 50, currency: 'EGP', method: 'cash' });
    tx.account.findFirst.mockResolvedValue({ id: 'acc1', currency: 'EGP', deletedAt: null });
    tx.invoice.findUnique.mockResolvedValue({ id: 'inv1', total: 100, dueDate: null });
    tx.invoicePayment.aggregate.mockResolvedValue({ _sum: { amount: 50 } });
    tx.invoice.update.mockResolvedValue({ id: 'inv1', total: 100, totalPaid: 50, status: 'partially_paid' });
    prisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', total: 100, totalPaid: 50 });

    const svc = makeService(prisma);
    await svc.recordPayment('inv1', { amount: 50, date: '2026-05-29', accountId: 'acc1' } as any, mockUser);

    expect(tx.account.update).toHaveBeenCalledWith({
      where: { id: 'acc1' },
      data: { balance: { increment: 50 } },
    });
  });
});
