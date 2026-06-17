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
    const startAt = start ? new Date(new Date(start).setHours(0, 0, 0, 0) - 1) : undefined;
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

  /** Cash flow over [start, end]: net change on cash/bank GL accounts. */
  async cashFlow(start?: string, end?: string) {
    const endAt = end ? endOfDay(end) : undefined;
    const startAt = start ? new Date(new Date(start).setHours(0, 0, 0, 0) - 1) : undefined;
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

function endOfDay(date: string): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
