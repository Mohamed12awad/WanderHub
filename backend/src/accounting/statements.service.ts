import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { monthRange } from './period.util';

const money = (n: number) => n.toFixed(2);

interface CoaLite { id: string; code: string; name: string; type: string }

/**
 * Financial statements. Balances are computed by `closingBalances(asOf)` which
 * reads the latest `AccountBalance` snapshot whose month falls on/before `asOf`
 * and then adds only the journal lines after that snapshot — so a statement
 * touches at most the open period's raw lines, never the whole history (§4).
 */
@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Signed base balance (debit +, credit −) per account as of `asOf` (or now). */
  async closingBalances(asOf?: Date): Promise<Map<string, number>> {
    // Latest closed period whose month-end is on/before asOf.
    const closed = await this.prisma.accountBalance.findMany({
      where: { closedAt: { not: null } },
      distinct: ['period'],
      select: { period: true },
      orderBy: { period: 'desc' },
    });
    let boundary: string | null = null;
    for (const c of closed) {
      const { end } = monthRange(c.period);
      if (!asOf || end <= asOf) { boundary = c.period; break; }
    }

    const map = new Map<string, number>();
    let liveFrom: Date | undefined;
    if (boundary) {
      const rows = await this.prisma.accountBalance.findMany({
        where: { period: boundary },
        select: { accountId: true, closingBalance: true },
      });
      for (const r of rows) map.set(r.accountId, Number(r.closingBalance));
      liveFrom = new Date(monthRange(boundary).end.getTime() + 1);
    }

    const date: Prisma.DateTimeFilter = {};
    if (liveFrom) date.gte = liveFrom;
    if (asOf) date.lte = asOf;
    const grouped = await this.prisma.journalLine.groupBy({
      by: ['accountId'],
      _sum: { baseAmount: true },
      where: {
        journalEntry: { status: { not: 'draft' }, ...(date.gte || date.lte ? { date } : {}) },
      },
    });
    for (const g of grouped) {
      map.set(g.accountId, (map.get(g.accountId) ?? 0) + Number(g._sum.baseAmount ?? 0));
    }
    return map;
  }

  private async coa(): Promise<CoaLite[]> {
    return this.prisma.chartOfAccount.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, type: true },
      orderBy: { code: 'asc' },
    });
  }

  async trialBalance(asOf?: string) {
    const at = asOf ? endOfDay(asOf) : undefined;
    const bal = await this.closingBalances(at);
    const accounts = await this.coa();
    const rows = accounts
      .map((a) => ({ a, net: bal.get(a.id) ?? 0 }))
      .filter(({ net }) => Math.abs(net) > 0.0001)
      .map(({ a, net }) => ({
        accountId: a.id, code: a.code, name: a.name, type: a.type,
        debit: money(net > 0 ? net : 0), credit: money(net < 0 ? -net : 0),
      }));
    const totalDebit = rows.reduce((s, r) => s + parseFloat(r.debit), 0);
    const totalCredit = rows.reduce((s, r) => s + parseFloat(r.credit), 0);
    return {
      asOf: asOf ?? null, rows,
      totalDebit: money(totalDebit), totalCredit: money(totalCredit),
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  /** Income statement over [start, end]: movement of income/expense accounts. */
  async profitAndLoss(start?: string, end?: string) {
    const endAt = end ? endOfDay(end) : undefined;
    // 1ms before UTC midnight of `start` — exclusive lower bound for the period.
    const startAt = start ? new Date(startOfDay(start).getTime() - 1) : undefined;
    const [endBal, startBal, accounts] = await Promise.all([
      this.closingBalances(endAt),
      startAt ? this.closingBalances(startAt) : Promise.resolve(new Map<string, number>()),
      this.coa(),
    ]);
    const mv = (id: string) => (endBal.get(id) ?? 0) - (startBal.get(id) ?? 0);

    const income = accounts.filter((a) => a.type === 'income').map((a) => ({ code: a.code, name: a.name, amount: -mv(a.id) }));
    const expense = accounts.filter((a) => a.type === 'expense').map((a) => ({ code: a.code, name: a.name, amount: mv(a.id) }));
    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
    return {
      start: start ?? null, end: end ?? null,
      income: income.filter((r) => Math.abs(r.amount) > 0.0001).map((r) => ({ ...r, amount: money(r.amount) })),
      expense: expense.filter((r) => Math.abs(r.amount) > 0.0001).map((r) => ({ ...r, amount: money(r.amount) })),
      totalIncome: money(totalIncome),
      totalExpense: money(totalExpense),
      netProfit: money(totalIncome - totalExpense),
    };
  }

  /** Balance sheet as of `asOf`: assets = liabilities + equity (+ retained earnings). */
  async balanceSheet(asOf?: string) {
    const at = asOf ? endOfDay(asOf) : undefined;
    const [bal, accounts] = await Promise.all([this.closingBalances(at), this.coa()]);

    const section = (type: string, sign: 1 | -1) =>
      accounts
        .filter((a) => a.type === type)
        .map((a) => ({ code: a.code, name: a.name, amount: sign * (bal.get(a.id) ?? 0) }))
        .filter((r) => Math.abs(r.amount) > 0.0001);

    const assets = section('asset', 1);
    const liabilities = section('liability', -1);
    const equity = section('equity', -1);

    // Net income to date rolls into equity as retained earnings.
    const retained =
      accounts
        .filter((a) => a.type === 'income' || a.type === 'expense')
        .reduce((s, a) => s - (bal.get(a.id) ?? 0), 0);
    if (Math.abs(retained) > 0.0001) {
      equity.push({ code: '3900', name: 'Retained Earnings (current)', amount: retained });
    }

    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equity.reduce((s, r) => s + r.amount, 0);
    const fmt = (rows: { code: string; name: string; amount: number }[]) =>
      rows.map((r) => ({ ...r, amount: money(r.amount) }));

    return {
      asOf: asOf ?? null,
      assets: fmt(assets), liabilities: fmt(liabilities), equity: fmt(equity),
      totalAssets: money(totalAssets),
      totalLiabilities: money(totalLiabilities),
      totalEquity: money(totalEquity),
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  /**
   * Default cash-flow section for an account type, used when the account has no
   * explicit `cashFlowCategory`.
   *
   * Only equity defaults to financing; everything else defaults to operating,
   * and investing is reached solely by explicit tagging.
   *
   * A type-based guess cannot do better than that. The working-capital accounts
   * that dominate real cash movement — receivables, payables, inventory,
   * prepayments — are operating, yet they span both `asset` and `liability`, so
   * a rule like "asset ⇒ investing" misfiles AR collections as investing cash.
   * (It did exactly that on the seeded data before this was corrected.) Making
   * operating the residual keeps the common case right and confines the error
   * to the section where a misclassification distorts least; genuine investing
   * accounts — fixed assets, investments — are tagged per account instead.
   */
  private static defaultCashFlowSection(type: string): 'operating' | 'investing' | 'financing' {
    return type === 'equity' ? 'financing' : 'operating';
  }

  /**
   * Classified cash-flow statement over [start, end].
   *
   * Audit 2026-08 (P2 item 21): this reported only the net change per cash
   * account — a treasury view, not a cash-flow statement, since nothing was
   * classified into operating / investing / financing.
   *
   * Method: every journal entry that touches a cash account is balanced, so the
   * negation of its NON-cash lines partitions that entry's cash movement
   * exactly. Each non-cash line is therefore attributed in full to its account's
   * section — no pro-rata approximation, and the sections always re-sum to the
   * net change on the cash accounts.
   */
  async cashFlowClassified(start?: string, end?: string) {
    const endAt = end ? endOfDay(end) : new Date();
    const startAt = start ? startOfDay(start) : new Date(0);

    const rows = await this.prisma.$queryRaw<
      Array<{ code: string; name: string; type: string; category: string | null; amount: number }>
    >(Prisma.sql`
      SELECT coa.code, coa.name, coa.type::text AS type, coa."cashFlowCategory" AS category,
             COALESCE(SUM(-jl."baseAmount"), 0)::float8 AS amount
      FROM "JournalLine" jl
      JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      JOIN "ChartOfAccount" coa ON coa.id = jl."accountId"
      WHERE je.status <> 'draft'
        AND je.date >= ${startAt} AND je.date <= ${endAt}
        AND coa."cashAccountId" IS NULL
        AND je.id IN (
          SELECT l."journalEntryId" FROM "JournalLine" l
          JOIN "ChartOfAccount" c ON c.id = l."accountId"
          WHERE c."cashAccountId" IS NOT NULL
        )
      GROUP BY coa.code, coa.name, coa.type, coa."cashFlowCategory"
      HAVING ABS(COALESCE(SUM(jl."baseAmount"), 0)) > 0.005
      ORDER BY coa.code ASC
    `);

    const sections = { operating: [] as typeof rows, investing: [] as typeof rows, financing: [] as typeof rows };
    for (const r of rows) {
      const section = (r.category as keyof typeof sections) ?? StatementsService.defaultCashFlowSection(r.type);
      (sections[section] ?? sections.operating).push(r);
    }

    const sum = (list: typeof rows) => list.reduce((s, r) => s + r.amount, 0);
    const fmt = (list: typeof rows) =>
      list.map((r) => ({ code: r.code, name: r.name, amount: money(r.amount) }));

    const [opening, closing] = await this.cashPosition(start, end);
    const operating = sum(sections.operating);
    const investing = sum(sections.investing);
    const financing = sum(sections.financing);

    return {
      start: start ?? null, end: end ?? null,
      operating: { rows: fmt(sections.operating), total: money(operating) },
      investing: { rows: fmt(sections.investing), total: money(investing) },
      financing: { rows: fmt(sections.financing), total: money(financing) },
      netChange: money(operating + investing + financing),
      openingCash: money(opening),
      closingCash: money(closing),
      // The three sections must reconcile to the movement on the cash accounts.
      reconciles: Math.abs(operating + investing + financing - (closing - opening)) < 0.01,
    };
  }

  /** Opening and closing cash across every cash/bank-linked GL account. */
  private async cashPosition(start?: string, end?: string): Promise<[number, number]> {
    const endAt = end ? endOfDay(end) : undefined;
    const startAt = start ? new Date(startOfDay(start).getTime() - 1) : undefined;
    const [endBal, startBal, cashAccounts] = await Promise.all([
      this.closingBalances(endAt),
      startAt ? this.closingBalances(startAt) : Promise.resolve(new Map<string, number>()),
      this.prisma.chartOfAccount.findMany({
        where: { deletedAt: null, cashAccountId: { not: null } },
        select: { id: true },
      }),
    ]);
    return [
      cashAccounts.reduce((s, a) => s + (startBal.get(a.id) ?? 0), 0),
      cashAccounts.reduce((s, a) => s + (endBal.get(a.id) ?? 0), 0),
    ];
  }

  /** Cash flow over [start, end]: net change on cash/bank GL accounts. */
  async cashFlow(start?: string, end?: string) {
    const endAt = end ? endOfDay(end) : undefined;
    // 1ms before UTC midnight of `start` — exclusive lower bound for the period.
    const startAt = start ? new Date(startOfDay(start).getTime() - 1) : undefined;
    const [endBal, startBal, cashAccounts] = await Promise.all([
      this.closingBalances(endAt),
      startAt ? this.closingBalances(startAt) : Promise.resolve(new Map<string, number>()),
      this.prisma.chartOfAccount.findMany({
        where: { deletedAt: null, cashAccountId: { not: null } },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    const rows = cashAccounts
      .map((a) => ({ code: a.code, name: a.name, amount: (endBal.get(a.id) ?? 0) - (startBal.get(a.id) ?? 0) }))
      .filter((r) => Math.abs(r.amount) > 0.0001);
    const opening = cashAccounts.reduce((s, a) => s + (startBal.get(a.id) ?? 0), 0);
    const closing = cashAccounts.reduce((s, a) => s + (endBal.get(a.id) ?? 0), 0);
    return {
      start: start ?? null, end: end ?? null,
      rows: rows.map((r) => ({ ...r, amount: money(r.amount) })),
      openingCash: money(opening),
      closingCash: money(closing),
      netChange: money(closing - opening),
    };
  }
}

// Journal `date`s are stored in UTC, so day boundaries must be computed in UTC.
// A local-time setHours would shift the cutoff by the server's offset and
// misclassify entries near midnight / the period edge.
function endOfDay(date: string): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function startOfDay(date: string): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
