import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isValidPeriod, monthRange, priorPeriod } from './period.util';

interface MonthAgg { accountId: string; dr: number; cr: number; net: number }

/**
 * Period close: freezes a month's per-account balances into `AccountBalance`
 * snapshots and locks the period against backdated posting. Statements read
 * these snapshots for closed months (see StatementsService) instead of summing
 * journal lines since inception.
 */
@Injectable()
export class PeriodCloseService {
  private readonly logger = new Logger(PeriodCloseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * True if the given period has been closed (locked).
   *
   * Reads the dedicated `AccountingPeriod` row rather than inferring closure
   * from the presence of `AccountBalance` rows — a period with no activity
   * produces no balance rows, so the old check reported it as open even after
   * a successful close (audit 2026-08, P0).
   */
  async isPeriodClosed(period: string): Promise<boolean> {
    const row = await this.prisma.accountingPeriod.findUnique({
      where: { period },
      select: { closedAt: true },
    });
    return row?.closedAt != null;
  }

  /** True if a posting dated `date` would land in a locked period. */
  async isDateLocked(date: Date): Promise<boolean> {
    return this.isPeriodClosed(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }

  /** Per-account debit/credit/net over an arbitrary date window. */
  async aggregatesBetween(start: Date, end: Date): Promise<MonthAgg[]> {
    return this.prisma.$queryRaw<MonthAgg[]>(Prisma.sql`
      SELECT jl."accountId" AS "accountId",
             COALESCE(SUM(CASE WHEN jl."baseAmount" > 0 THEN jl."baseAmount" ELSE 0 END), 0)::float8 AS dr,
             COALESCE(SUM(CASE WHEN jl."baseAmount" < 0 THEN -jl."baseAmount" ELSE 0 END), 0)::float8 AS cr,
             COALESCE(SUM(jl."baseAmount"), 0)::float8 AS net
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      WHERE je.status <> 'draft' AND je.date >= ${start} AND je.date <= ${end}
      GROUP BY jl."accountId"
    `);
  }

  private async monthAggregates(period: string): Promise<MonthAgg[]> {
    const { start, end } = monthRange(period);
    return this.aggregatesBetween(start, end);
  }

  /**
   * Opening balances for `period`.
   *
   * Audit 2026-08 (P0): this used to read only `priorPeriod(period)`. If that
   * exact month had no snapshot — which is true for every month that was never
   * closed, including months with no activity at all — opening silently became
   * zero and every statement lost all history before the gap, while still
   * reporting `balanced: true` (a balanced ledger minus balanced entries is
   * still balanced, so nothing detected it).
   *
   * Now: take the most recent snapshot *at or before* the prior period and add
   * the movement between that snapshot and this period. With no snapshot at
   * all, sum everything before the period. Still incremental — history is only
   * re-scanned when there is no earlier snapshot to build on.
   */
  private async openingBalances(period: string): Promise<Map<string, number>> {
    const { start } = monthRange(period);
    const opening = new Map<string, number>();

    const earlier = await this.prisma.accountBalance.findMany({
      where: { period: { lt: period } },
      select: { accountId: true, period: true, closingBalance: true },
      orderBy: { period: 'desc' },
    });

    const basePeriod = earlier.length ? earlier[0].period : null;
    let from = new Date(0);

    if (basePeriod) {
      for (const row of earlier.filter((r) => r.period === basePeriod)) {
        opening.set(row.accountId, Number(row.closingBalance));
      }
      from = new Date(monthRange(basePeriod).end.getTime() + 1);
    }

    // Movement between the snapshot (or the beginning of time) and this period.
    const gap = await this.aggregatesBetween(from, new Date(start.getTime() - 1));
    for (const a of gap) {
      opening.set(a.accountId, (opening.get(a.accountId) ?? 0) + a.net);
    }
    return opening;
  }

  /**
   * Closes (or re-closes) a period: opening = prior period closing, then this
   * month's debits/credits/net → closing. Idempotent; re-closing recomputes.
   */
  async closePeriod(period: string): Promise<{ period: string; accounts: number }> {
    if (!isValidPeriod(period)) throw new BadRequestException('period must be YYYY-MM');

    const accounts = await this.recomputePeriod(period, { markClosed: true });

    // Lock state is recorded independently of account snapshots, so a period
    // with no activity still locks.
    await this.prisma.accountingPeriod.upsert({
      where: { period },
      create: { period, closedAt: new Date() },
      update: { closedAt: new Date() },
    });

    // Audit 2026-08 (P0): a correction to an earlier period used to leave every
    // later snapshot stale, because nothing recomputed them. Cascade forward
    // over the periods that already have snapshots, preserving their own
    // closed/open state.
    const later = await this.prisma.accountBalance.findMany({
      where: { period: { gt: period } },
      distinct: ['period'],
      select: { period: true },
      orderBy: { period: 'asc' },
    });
    for (const { period: p } of later) {
      await this.recomputePeriod(p, { markClosed: false });
    }

    this.logger.log(
      `Closed period ${period}: ${accounts} account balance(s)` +
        (later.length ? `; refreshed ${later.length} later period(s)` : ''),
    );
    return { period, accounts };
  }

  /**
   * Recomputes one period's snapshot from its opening balances plus its own
   * movement. `markClosed` stamps `closedAt`; when false an existing row keeps
   * whatever closed state it already had (used by the forward cascade).
   */
  private async recomputePeriod(
    period: string,
    { markClosed }: { markClosed: boolean },
  ): Promise<number> {
    const opening = await this.openingBalances(period);
    const aggs = await this.monthAggregates(period);
    const aggById = new Map(aggs.map((a) => [a.accountId, a]));

    // Union of accounts carried forward and those with movement this month.
    const accountIds = new Set<string>([...opening.keys(), ...aggById.keys()]);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const accountId of accountIds) {
        const open = opening.get(accountId) ?? 0;
        const a = aggById.get(accountId);
        const closing = open + (a?.net ?? 0);
        const figures = {
          openingBalance: open,
          periodDebit: a?.dr ?? 0,
          periodCredit: a?.cr ?? 0,
          closingBalance: closing,
        };
        await tx.accountBalance.upsert({
          where: { accountId_period: { accountId, period } },
          create: { accountId, period, ...figures, closedAt: markClosed ? now : null },
          update: markClosed ? { ...figures, closedAt: now } : figures,
        });
      }
    });

    return accountIds.size;
  }

  /** Reopens a closed period (clears the lock) so corrections can be posted. */
  async reopenPeriod(period: string): Promise<{ period: string; reopened: number }> {
    if (!isValidPeriod(period)) throw new BadRequestException('period must be YYYY-MM');
    const cleared = await this.prisma.accountingPeriod.updateMany({
      where: { period, closedAt: { not: null } },
      data: { closedAt: null },
    });
    // Keep the snapshot rows' own flag consistent with the period lock.
    const res = await this.prisma.accountBalance.updateMany({
      where: { period, closedAt: { not: null } },
      data: { closedAt: null },
    });
    return { period, reopened: Math.max(cleared.count, res.count) };
  }

  /** Lists closed periods with their close timestamp. */
  async listClosedPeriods() {
    return this.prisma.accountingPeriod.findMany({
      where: { closedAt: { not: null } },
      select: { period: true, closedAt: true },
      orderBy: { period: 'desc' },
    });
  }
}
