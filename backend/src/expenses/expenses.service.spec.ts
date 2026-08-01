import { ExpensesService } from './expenses.service';

function makeService(prisma: any) {
  const timeline: any = { log: jest.fn().mockResolvedValue(undefined) };
  const approvals: any = {
    isEnabled: jest.fn().mockResolvedValue(false),
    initSteps: jest.fn(),
    listSteps: jest.fn().mockResolvedValue([]),
    act: jest.fn(),
  };
  const customFields: any = { validateAndClean: jest.fn() };
  const posting: any = {
    postExpenseReport: jest.fn().mockResolvedValue(undefined),
    reverseLive: jest.fn().mockResolvedValue(undefined),
  };

  return new ExpensesService(prisma, timeline, approvals, customFields, posting);
}

function buildAtomicExpenseApproval() {
  let persistedReport: any = {
    id: 'expense-atomic',
    title: 'Atomic expense report',
    userId: 'creator-1',
    approvalStatus: 'pending',
    createdAt: new Date('2026-08-01'),
    deletedAt: null,
    expenses: [{ amount: 100 }],
  };
  let persistedJournals: any[] = [];
  let stagedReport: any;
  let stagedJournals: any[];

  const tx: any = {
    expenseReport: {
      update: jest.fn(async ({ data }: any) => {
        stagedReport = { ...stagedReport, ...data };
        return stagedReport;
      }),
      findFirst: jest.fn(async () => stagedReport),
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
    expenseReport: { findFirst: jest.fn(async () => persistedReport) },
    journalEntry: { findFirst: jest.fn() },
    workspaceConfig: {
      findFirst: jest.fn().mockResolvedValue({
        approvals: [{ module: 'expenses', enabled: true, approverRoles: ['admin'] }],
      }),
    },
    $transaction: jest.fn(async (callback: any) => {
      stagedReport = { ...persistedReport };
      stagedJournals = [...persistedJournals];
      const result = await callback(tx);
      persistedReport = stagedReport;
      persistedJournals = stagedJournals;
      return result;
    }),
  };

  return {
    prisma,
    tx,
    state: () => ({ report: persistedReport, journals: persistedJournals }),
  };
}

describe('ExpensesService — document/journal atomicity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a failed GL post rolls back expense report approval', async () => {
    const { prisma, state } = buildAtomicExpenseApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postExpenseReport.mockRejectedValue(new Error('missing expense mapping'));

    await expect(svc.approve('expense-atomic', 'approver-1', 'admin')).rejects.toThrow('missing expense mapping');

    expect(state().report.approvalStatus).toBe('pending');
    expect(state().journals).toHaveLength(0);
  });

  it('a successful GL post commits expense report approval and its journal entry', async () => {
    const { prisma, tx, state } = buildAtomicExpenseApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postExpenseReport.mockImplementation(async (_report: any, postingTx: any) => {
      await postingTx.journalEntry.create({ data: { sourceType: 'ExpenseReport', sourceId: 'expense-atomic' } });
    });

    await svc.approve('expense-atomic', 'approver-1', 'admin');

    expect(state().report.approvalStatus).toBe('approved');
    expect(state().journals).toEqual([{ sourceType: 'ExpenseReport', sourceId: 'expense-atomic' }]);
    expect((svc as any).posting.postExpenseReport).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'expense-atomic' }),
      tx,
      'approver-1',
      undefined,
    );
  });
});
