import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

// Builds a fake interactive-transaction client and a prisma mock whose
// $transaction simply runs the callback against that client.
function buildMocks() {
  const tx = {
    invoice: { findUnique: jest.fn(), update: jest.fn() },
    invoicePayment: { create: jest.fn(), aggregate: jest.fn(), update: jest.fn(), delete: jest.fn() },
    account: { findFirst: jest.fn(), update: jest.fn() },
    deal: { update: jest.fn() },
  };
  const prisma: any = {
    invoice: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    invoicePayment: { findFirst: jest.fn() },
    quote: { findFirst: jest.fn() },
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
  return new InvoicesService(prisma, numberSequence, timeline, inventory, approvals, customFields);
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
    const res: any = await svc.recordPayment('inv1', { amount: 60, date: '2026-05-29' } as any, 'user1');

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
      svc.recordPayment('inv1', { amount: 50, date: '2026-05-29', accountId: 'acc1' } as any, 'user1'),
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
    await svc.recordPayment('inv1', { amount: 50, date: '2026-05-29', accountId: 'acc1' } as any, 'user1');

    expect(tx.account.update).toHaveBeenCalledWith({
      where: { id: 'acc1' },
      data: { balance: { increment: 50 } },
    });
  });
});
