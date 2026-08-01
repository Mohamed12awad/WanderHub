import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostingService } from './posting.service';
import { PeriodCloseService } from './period-close.service';

/**
 * Fiscal-year close.
 *
 * Audit 2026-08 (P2 item 20): there was no year-end close at all. Income and
 * expense accounts accumulated since inception forever, and the balance sheet
 * synthesised a "Retained Earnings (current)" line by re-summing every P&L
 * account on each request — so prior-year profit was never crystallised into
 * equity, and a multi-year workspace could not produce a correct opening
 * balance sheet for any year but its first.
 *
 * Lives in its own service rather than on PeriodCloseService because
 * PostingService already depends on PeriodCloseService; putting the posting
 * call there would create a dependency cycle. The graph stays acyclic:
 * FiscalYearService → PostingService → PeriodCloseService.
 */
@Injectable()
export class FiscalYearService {
  private readonly logger = new Logger(FiscalYearService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posting: PostingService,
    private readonly periods: PeriodCloseService,
  ) {}

  /**
   * Zeroes every income and expense account into Retained Earnings and locks all
   * twelve periods of `year`.
   *
   * The closing entry goes through the normal posting engine, so it is balanced,
   * idempotent on `(sourceType, sourceId)` and appears in the ledger like any
   * other entry — re-running is a no-op rather than a double close.
   */
  async closeFiscalYear(year: number, userId?: string): Promise<{ year: number; netIncome: number; accounts: number }> {
    if (!Number.isInteger(year) || year < 1970 || year > 9999) {
      throw new BadRequestException('year must be a four-digit calendar year');
    }
    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const retained = await this.prisma.chartOfAccount.findFirst({
      where: { code: '3900', deletedAt: null },
      select: { id: true },
    });
    if (!retained) {
      throw new BadRequestException(
        'Year-end close failed: no Retained Earnings account (code 3900). Seed the chart of accounts first.',
      );
    }

    const pnl = await this.prisma.chartOfAccount.findMany({
      where: { type: { in: ['income', 'expense'] }, deletedAt: null },
      select: { id: true },
    });
    const isPnl = new Set(pnl.map((a) => a.id));

    // Signed base movement within the year: income sits credit (negative),
    // expense debit (positive).
    const movement = (await this.periods.aggregatesBetween(yearStart, yearEnd)).filter((m) => isPnl.has(m.accountId));

    const lines = movement
      .filter((m) => Math.abs(m.net) > 0.005)
      // Reverse each account's own net so it closes to exactly zero.
      .map((m) => (m.net > 0
        ? { accountId: m.accountId, credit: m.net }
        : { accountId: m.accountId, debit: -m.net }));

    if (!lines.length) {
      throw new BadRequestException(`No income or expense activity to close for ${year}.`);
    }

    // Net income is the negation of the summed signed movement: income above
    // expense ⇒ a credit to Retained Earnings.
    const net = movement.reduce((s, m) => s + m.net, 0);
    lines.push(net < 0 ? { accountId: retained.id, credit: -net } : { accountId: retained.id, debit: net });

    await this.posting.post({
      sourceType: 'FiscalYearClose',
      sourceId: String(year),
      date: yearEnd,
      memo: `Year-end close ${year}`,
      createdById: userId ?? null,
      lines,
    });

    // Lock every month so nothing can be posted behind the close. Done after
    // posting, since the closing entry itself is dated inside the year.
    for (let m = 1; m <= 12; m++) {
      await this.periods.closePeriod(`${year}-${String(m).padStart(2, '0')}`);
    }

    const netIncome = -net;
    this.logger.log(`Closed fiscal year ${year}: net income ${netIncome.toFixed(2)} to retained earnings`);
    return { year, netIncome, accounts: lines.length - 1 };
  }
}
