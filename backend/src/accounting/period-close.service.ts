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

  /** True if the given period has been closed (locked). */
  async isPeriodClosed(period: string): Promise<boolean> {
    const n = await this.prisma.accountBalance.count({ where: { period, closedAt: { not: null } } });
    return n > 0;
  }

  /** True if a posting dated `date` would land in a locked period. */
  async isDateLocked(date: Date): Promise<boolean> {
    return this.isPeriodClosed(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }

  private async monthAggregates(period: string): Promise<MonthAgg[]> {
    const { start, end } = monthRange(period);
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

  /**
   * Closes (or re-closes) a period: opening = prior period closing, then this
   * month's debits/credits/net → closing. Idempotent; re-closing recomputes.
   */
  async closePeriod(period: string): Promise<{ period: string; accounts: number }> {
    if (!isValidPeriod(period)) throw new BadRequestException('period must be YYYY-MM');

    const prior = priorPeriod(period);
    const priorRows = await this.prisma.accountBalance.findMany({
      where: { period: prior },
      select: { accountId: true, closingBalance: true },
    });
    const opening = new Map(priorRows.map((r) => [r.accountId, Number(r.closingBalance)]));

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
        await tx.accountBalance.upsert({
          where: { accountId_period: { accountId, period } },
          create: {
            accountId, period,
            openingBalance: open,
            periodDebit: a?.dr ?? 0,
            periodCredit: a?.cr ?? 0,
            closingBalance: closing,
            closedAt: now,
          },
          update: {
            openingBalance: open,
            periodDebit: a?.dr ?? 0,
            periodCredit: a?.cr ?? 0,
            closingBalance: closing,
            closedAt: now,
          },
        });
      }
    });

    this.logger.log(`Closed period ${period}: ${accountIds.size} account balance(s)`);
    return { period, accounts: accountIds.size };
  }

  /** Reopens a closed period (clears the lock) so corrections can be posted. */
  async reopenPeriod(period: string): Promise<{ period: string; reopened: number }> {
    if (!isValidPeriod(period)) throw new BadRequestException('period must be YYYY-MM');
    const res = await this.prisma.accountBalance.updateMany({
      where: { period, closedAt: { not: null } },
      data: { closedAt: null },
    });
    return { period, reopened: res.count };
  }

  /** Lists closed periods with their close timestamp. */
  async listClosedPeriods() {
    const rows = await this.prisma.accountBalance.findMany({
      where: { closedAt: { not: null } },
      distinct: ['period'],
      select: { period: true, closedAt: true },
      orderBy: { period: 'desc' },
    });
    return rows;
  }
}
