import { StatementsService } from './statements.service';

/**
 * Audit 2026-08 (P2 item 21) — "cash flow" reported only the net change per
 * cash account: a treasury view, not a cash-flow statement, with nothing
 * classified into operating / investing / financing.
 *
 * Classification attributes each NON-cash line of a cash-touching entry, negated,
 * to its account's section. Because entries balance, those lines partition the
 * cash movement exactly — so the three sections must always reconcile to the
 * change in cash. That reconciliation is the property worth pinning.
 */
function build(rows: { code: string; name: string; type: string; category: string | null; amount: number }[], cash: { opening: number; closing: number }) {
  const prisma: any = {
    $queryRaw: jest.fn(async () => rows),
    chartOfAccount: { findMany: jest.fn(async () => [{ id: 'cash1' }]) },
    accountBalance: { findMany: jest.fn(async () => []) },
    journalLine: { groupBy: jest.fn(async () => []) },
  };
  const svc = new StatementsService(prisma);
  // closingBalances is exercised by its own tests; stub the cash position so
  // this test targets classification.
  (svc as any).cashPosition = jest.fn(async () => [cash.opening, cash.closing]);
  return svc;
}

describe('StatementsService.cashFlowClassified', () => {
  it('puts working capital in operating and equity in financing', async () => {
    const svc = build(
      [
        { code: '1200', name: 'Accounts Receivable', type: 'asset', category: null, amount: 128_560 },
        { code: '2100', name: 'Accounts Payable', type: 'liability', category: null, amount: -167_830 },
        { code: '3100', name: "Owner's Capital", type: 'equity', category: null, amount: 500_000 },
      ],
      { opening: 0, closing: 460_730 },
    );

    const out = await svc.cashFlowClassified();

    // AR and AP are both working capital — an "asset ⇒ investing" rule would
    // have misfiled the AR collection.
    expect(out.operating.total).toBe('-39270.00');
    expect(out.investing.total).toBe('0.00');
    expect(out.financing.total).toBe('500000.00');
    expect(out.netChange).toBe('460730.00');
    expect(out.reconciles).toBe(true);
  });

  it('honours an explicit per-account category over the default', async () => {
    const svc = build(
      [
        { code: '1500', name: 'Equipment', type: 'asset', category: 'investing', amount: -50_000 },
        { code: '2500', name: 'Bank Loan', type: 'liability', category: 'financing', amount: 50_000 },
      ],
      { opening: 0, closing: 0 },
    );

    const out = await svc.cashFlowClassified();

    expect(out.investing.total).toBe('-50000.00');
    expect(out.financing.total).toBe('50000.00');
    expect(out.operating.total).toBe('0.00');
    expect(out.reconciles).toBe(true);
  });

  it('flags a failure to reconcile against the cash accounts', async () => {
    const svc = build(
      [{ code: '1200', name: 'AR', type: 'asset', category: null, amount: 100 }],
      { opening: 0, closing: 999 },
    );

    const out = await svc.cashFlowClassified();
    expect(out.reconciles).toBe(false);
  });
});
