import { BadRequestException } from '@nestjs/common';
import { FiscalYearService } from './fiscal-year.service';

/**
 * Audit 2026-08 (P2 item 20) — there was no fiscal-year close. P&L accounts
 * accumulated since inception and the balance sheet re-derived retained
 * earnings on every request, so prior-year profit was never crystallised into
 * equity.
 */
function build(movement: { accountId: string; net: number }[]) {
  const posted: any[] = [];
  const closedPeriods: string[] = [];

  const prisma: any = {
    chartOfAccount: {
      findFirst: jest.fn(async ({ where }: any) => (where.code === '3900' ? { id: 'retained' } : null)),
      findMany: jest.fn(async () => [{ id: 'income1' }, { id: 'expense1' }]),
    },
  };
  const posting: any = { post: jest.fn(async (input: any) => { posted.push(input); return { id: 'je1' }; }) };
  const periods: any = {
    aggregatesBetween: jest.fn(async () => movement.map((m) => ({ ...m, dr: 0, cr: 0 }))),
    closePeriod: jest.fn(async (p: string) => { closedPeriods.push(p); return { period: p, accounts: 0 }; }),
  };

  return { svc: new FiscalYearService(prisma, posting, periods), posted, closedPeriods };
}

describe('FiscalYearService.closeFiscalYear', () => {
  it('zeroes each P&L account and books net income to retained earnings', async () => {
    // income1 sits credit (−1000), expense1 debit (+400) ⇒ net income 600.
    const { svc, posted } = build([
      { accountId: 'income1', net: -1000 },
      { accountId: 'expense1', net: 400 },
    ]);

    const result = await svc.closeFiscalYear(2026, 'u1');

    expect(result.netIncome).toBe(600);
    const entry = posted[0];
    expect(entry.sourceType).toBe('FiscalYearClose');
    expect(entry.sourceId).toBe('2026');

    // Each P&L account is reversed to zero…
    expect(entry.lines).toContainEqual({ accountId: 'income1', debit: 1000 });
    expect(entry.lines).toContainEqual({ accountId: 'expense1', credit: 400 });
    // …and the net lands in equity as a credit.
    expect(entry.lines).toContainEqual({ accountId: 'retained', credit: 600 });

    // The entry must balance, or PostingService would reject it.
    const signed = entry.lines.reduce(
      (s: number, l: any) => s + (l.debit ?? 0) - (l.credit ?? 0),
      0,
    );
    expect(Math.abs(signed)).toBeLessThan(0.005);
  });

  it('books a net loss as a debit to retained earnings', async () => {
    const { svc, posted } = build([
      { accountId: 'income1', net: -100 },
      { accountId: 'expense1', net: 250 },
    ]);

    const result = await svc.closeFiscalYear(2026);

    expect(result.netIncome).toBe(-150);
    expect(posted[0].lines).toContainEqual({ accountId: 'retained', debit: 150 });
  });

  it('locks all twelve periods of the year', async () => {
    const { svc, closedPeriods } = build([{ accountId: 'income1', net: -10 }]);
    await svc.closeFiscalYear(2026);
    expect(closedPeriods).toHaveLength(12);
    expect(closedPeriods[0]).toBe('2026-01');
    expect(closedPeriods[11]).toBe('2026-12');
  });

  it('refuses a year with no P&L activity', async () => {
    const { svc } = build([]);
    await expect(svc.closeFiscalYear(2026)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a nonsensical year', async () => {
    const { svc } = build([{ accountId: 'income1', net: -10 }]);
    await expect(svc.closeFiscalYear(42)).rejects.toThrow(/four-digit/);
  });
});
