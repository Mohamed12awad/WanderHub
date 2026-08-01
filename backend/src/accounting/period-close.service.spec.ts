import { PeriodCloseService } from './period-close.service';

interface LedgerMovement {
  accountId: string;
  date: Date;
  debit: number;
  credit: number;
}

interface BalanceRow {
  accountId: string;
  period: string;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
  closedAt: Date | null;
}

function makeLedger(initialMovements: LedgerMovement[] = []) {
  const movements = [...initialMovements];
  const balances = new Map<string, BalanceRow>();
  const key = (accountId: string, period: string) => `${accountId}:${period}`;

  const matchesPeriod = (actual: string, expected: unknown) => {
    if (typeof expected === 'string') return actual === expected;
    if (!expected || typeof expected !== 'object') return true;
    const range = expected as { lt?: string; lte?: string; gt?: string; gte?: string };
    return (
      (range.lt === undefined || actual < range.lt) &&
      (range.lte === undefined || actual <= range.lte) &&
      (range.gt === undefined || actual > range.gt) &&
      (range.gte === undefined || actual >= range.gte)
    );
  };

  const selectedRows = ({ where = {} }: any = {}) =>
    [...balances.values()].filter((row) => {
      if (!matchesPeriod(row.period, where.period)) return false;
      if (where.closedAt?.not === null && row.closedAt === null) return false;
      return true;
    });

  const accountBalance = {
    findMany: jest.fn(async (args: any) => selectedRows(args)),
    count: jest.fn(async (args: any) => selectedRows(args).length),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const row of selectedRows({ where })) {
        Object.assign(row, data);
        count += 1;
      }
      return { count };
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const identity = where.accountId_period;
      const balanceKey = key(identity.accountId, identity.period);
      const existing = balances.get(balanceKey);
      const row = existing
        ? Object.assign(existing, update)
        : ({ ...create } as BalanceRow);
      balances.set(balanceKey, row);
      return row;
    }),
  };

  // Period lock state lives in its own table so a period with no account
  // movement can still be closed (see AccountingPeriod in schema.prisma).
  const periods = new Map<string, { period: string; closedAt: Date | null }>();
  const accountingPeriod = {
    findUnique: jest.fn(async ({ where }: any) => periods.get(where.period) ?? null),
    findMany: jest.fn(async ({ where = {} }: any) =>
      [...periods.values()].filter((r) => (where.closedAt?.not === null ? r.closedAt !== null : true)),
    ),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const existing = periods.get(where.period);
      const row = existing ? Object.assign(existing, update) : { ...create };
      periods.set(where.period, row);
      return row;
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const row of periods.values()) {
        if (row.period !== where.period) continue;
        if (where.closedAt?.not === null && row.closedAt === null) continue;
        Object.assign(row, data);
        count += 1;
      }
      return { count };
    }),
  };

  const prisma: any = {
    accountBalance,
    accountingPeriod,
    $queryRaw: jest.fn(async (query: { values?: unknown[] }) => {
      const dates = (query.values ?? []).filter((value): value is Date => value instanceof Date);
      const [start, end] = dates;
      const inRange = movements.filter(
        (movement) => (!start || movement.date >= start) && (!end || movement.date <= end),
      );
      const totals = new Map<string, { accountId: string; dr: number; cr: number; net: number }>();
      for (const movement of inRange) {
        const aggregate = totals.get(movement.accountId) ?? {
          accountId: movement.accountId,
          dr: 0,
          cr: 0,
          net: 0,
        };
        aggregate.dr += movement.debit;
        aggregate.cr += movement.credit;
        aggregate.net += movement.debit - movement.credit;
        totals.set(movement.accountId, aggregate);
      }
      return [...totals.values()];
    }),
    $transaction: jest.fn((callback: any) => callback({ accountBalance })),
  };

  return {
    svc: new PeriodCloseService(prisma),
    movements,
    balance: (accountId: string, period: string) => balances.get(key(accountId, period)),
  };
}

describe('PeriodCloseService', () => {
  // Audit P0: prior-period-only seeding drops history across gaps (period-close.service.ts:54-59).
  it('closePeriod carries opening balances across a gap in the closed-period chain', async () => {
    const { svc, balance } = makeLedger([
      { accountId: 'capital', date: new Date('2026-01-15T00:00:00.000Z'), debit: 500_000, credit: 0 },
    ]);

    await svc.closePeriod('2026-06');

    expect(balance('capital', '2026-06')?.closingBalance).toBe(500_000);
  });

  // Audit P0: closure inferred from balance rows leaves empty periods unlocked (period-close.service.ts:21-24).
  it('closePeriod locks an empty period', async () => {
    const { svc } = makeLedger();

    await svc.closePeriod('2027-06');

    expect({
      periodClosed: await svc.isPeriodClosed('2027-06'),
      dateLocked: await svc.isDateLocked(new Date('2027-06-15T00:00:00.000Z')),
    }).toEqual({ periodClosed: true, dateLocked: true });
  });

  // Audit P0: re-closing an earlier period leaves later snapshots stale (period-close.service.ts:99-106).
  it('reclosing an earlier period refreshes later closing-balance snapshots', async () => {
    const { svc, movements, balance } = makeLedger([
      { accountId: 'cash', date: new Date('2026-01-10T00:00:00.000Z'), debit: 100, credit: 0 },
      { accountId: 'cash', date: new Date('2026-02-10T00:00:00.000Z'), debit: 20, credit: 0 },
    ]);
    await svc.closePeriod('2026-01');
    await svc.closePeriod('2026-02');

    await svc.reopenPeriod('2026-01');
    movements[0].debit = 150;
    await svc.closePeriod('2026-01');

    expect(balance('cash', '2026-02')?.closingBalance).toBe(170);
  });
});
