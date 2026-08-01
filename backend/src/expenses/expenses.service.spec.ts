import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

const authUser = (id: string, role = 'admin', permissions = ['*']) => ({
  id,
  role,
  roleId: `${role}-role`,
  permissions,
});

function makeService(prisma: any) {
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
    postExpenseReport: jest.fn().mockResolvedValue(undefined),
    reverseLive: jest.fn().mockResolvedValue(undefined),
  };

  return new ExpensesService(prisma, timeline, approvals, customFields, visibility, posting);
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

function buildExpenseLifecycle() {
  const existing = {
    id: 'expense-lifecycle',
    title: 'Lifecycle expense',
    userId: 'creator-1',
    approvalStatus: 'approved',
    deletedAt: null,
  };
  const tx: any = {
    expenseItem: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    expenseReport: {
      update: jest.fn(async ({ data }: any) => ({ ...existing, ...data })),
    },
  };
  const prisma: any = {
    expenseReport: {
      findUnique: jest.fn(async () => existing),
      findFirst: jest.fn(async () => existing),
      update: jest.fn(),
    },
    expenseItem: { deleteMany: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(tx)),
  };
  const svc = makeService(prisma);
  return { svc, prisma, tx, posting: (svc as any).posting };
}

describe('ExpensesService — document/journal atomicity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a failed GL post rolls back expense report approval', async () => {
    const { prisma, state } = buildAtomicExpenseApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postExpenseReport.mockRejectedValue(new Error('missing expense mapping'));

    await expect(svc.approve('expense-atomic', authUser('approver-1'))).rejects.toThrow('missing expense mapping');

    expect(state().report.approvalStatus).toBe('pending');
    expect(state().journals).toHaveLength(0);
  });

  it('a successful GL post commits expense report approval and its journal entry', async () => {
    const { prisma, tx, state } = buildAtomicExpenseApproval();
    const svc = makeService(prisma);
    (svc as any).posting.postExpenseReport.mockImplementation(async (_report: any, postingTx: any) => {
      await postingTx.journalEntry.create({ data: { sourceType: 'ExpenseReport', sourceId: 'expense-atomic' } });
    });

    await svc.approve('expense-atomic', authUser('approver-1'));

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

describe('ExpensesService — postings follow the document lifecycle', () => {
  it('reverses the live entry when an approved expense report is edited', async () => {
    const { svc, prisma, tx, posting } = buildExpenseLifecycle();

    await svc.update('expense-lifecycle', {
      expenses: [{
        description: 'Replacement', amount: 75, date: '2026-08-01', category: 'Travel', beneficiary: 'Vendor',
      }],
    } as any, authUser('editor-1'));

    // The reversal must be attributed, or the journal cannot say who un-issued it.
    expect(posting.reverseLive).toHaveBeenCalledWith('ExpenseReport', 'expense-lifecycle', { createdById: 'editor-1' }, tx);
    expect(tx.expenseReport.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ approvalStatus: 'pending' }),
    }));
    expect(tx.expenseItem.deleteMany).toHaveBeenCalledWith({ where: { expenseReportId: 'expense-lifecycle' } });
    expect(prisma.expenseItem.deleteMany).not.toHaveBeenCalled();
  });

  it('reverses the live entry when an approved expense report is deleted', async () => {
    const { svc, prisma, tx, posting } = buildExpenseLifecycle();

    await svc.remove('expense-lifecycle', authUser('deleter-1'));

    expect(posting.reverseLive).toHaveBeenCalledWith('ExpenseReport', 'expense-lifecycle', { createdById: 'deleter-1' }, tx);
    expect(tx.expenseReport.update).toHaveBeenCalledWith({
      where: { id: 'expense-lifecycle' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prisma.expenseReport.update).not.toHaveBeenCalled();
  });
});

describe('ExpensesService — mutation scope', () => {
  it('returns not-found and performs no write for another user\'s expense report', async () => {
    const otherUserReport = {
      id: 'expense-user-b',
      userId: 'user-b',
      approvalStatus: 'pending',
      deletedAt: null,
    };
    const prisma: any = {
      expenseReport: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.userId === 'user-a' ? null : otherUserReport,
        ),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);
    const user = authUser('user-a', 'member', ['expenses:edit:own']);
    (svc as any).visibility.ownershipWhere.mockResolvedValue({ userId: 'user-a' });

    await expect(svc.update('expense-user-b', { title: 'tampered' } as any, user))
      .rejects.toBeInstanceOf(NotFoundException);

    expect((svc as any).visibility.ownershipWhere).toHaveBeenCalledWith(user, 'expenses', 'userId');
    expect(prisma.expenseReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'expense-user-b', deletedAt: null, userId: 'user-a' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.expenseReport.update).not.toHaveBeenCalled();
  });
});
