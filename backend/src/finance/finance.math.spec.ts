import { calcTotals, deriveInvoiceStatus } from './finance.math';

describe('calcTotals', () => {
  beforeEach(() => jest.clearAllMocks());
  it('computes line totals, subtotal, tax and grand total', () => {
    const r = calcTotals(
      [
        { description: 'A', quantity: 2, unitPrice: 100 },
        { description: 'B', quantity: 1, unitPrice: 50 },
      ],
      10,
    );
    expect(r.items[0].total).toBe(200);
    expect(r.items[1].total).toBe(50);
    expect(r.subtotal).toBe(250);
    expect(r.tax).toBeCloseTo(25);
    expect(r.total).toBeCloseTo(275);
  });

  it('applies per-line percentage discounts', () => {
    const r = calcTotals([{ description: 'A', quantity: 1, unitPrice: 100, discount: 25 }], 0);
    expect(r.items[0].total).toBe(75);
    expect(r.subtotal).toBe(75);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(75);
  });

  it('defaults a missing discount to 0', () => {
    const r = calcTotals([{ description: 'A', quantity: 3, unitPrice: 10 }]);
    expect(r.items[0].discount).toBe(0);
    expect(r.items[0].total).toBe(30);
  });

  it('returns zeros for an empty document', () => {
    const r = calcTotals([], 15);
    expect(r.subtotal).toBe(0);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  it('defaults taxRate to 0 when omitted', () => {
    const r = calcTotals([{ description: 'A', quantity: 1, unitPrice: 100 }]);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(100);
  });

  it('adds tax on top in exclusive mode (default)', () => {
    const r = calcTotals([{ description: 'A', quantity: 1, unitPrice: 100 }], 15, false);
    expect(r.subtotal).toBe(100);
    expect(r.tax).toBeCloseTo(15);
    expect(r.total).toBeCloseTo(115);
  });

  it('back-calculates tax out of inclusive prices', () => {
    // 115 inclusive @ 15% → net 100, tax 15, total stays 115 (what the customer pays).
    const r = calcTotals([{ description: 'A', quantity: 1, unitPrice: 115 }], 15, true);
    expect(r.subtotal).toBeCloseTo(100);
    expect(r.tax).toBeCloseTo(15);
    expect(r.total).toBeCloseTo(115);
    expect(r.items[0].total).toBeCloseTo(100); // line total is net of tax
  });

  it('inclusive mode honours per-line discount before extracting tax', () => {
    // 200 gross, 25% discount → 150 inclusive @ 20% → net 125, tax 25.
    const r = calcTotals([{ description: 'A', quantity: 1, unitPrice: 200, discount: 25, taxRate: 20 }], 0, true);
    expect(r.subtotal).toBeCloseTo(125);
    expect(r.tax).toBeCloseTo(25);
    expect(r.total).toBeCloseTo(150);
  });
});

describe('deriveInvoiceStatus', () => {
  beforeEach(() => jest.clearAllMocks());
  const now = new Date('2026-05-29T00:00:00Z');
  const past = new Date('2026-01-01T00:00:00Z');
  const future = new Date('2026-12-31T00:00:00Z');

  it('is "sent" when nothing has been paid', () => {
    expect(deriveInvoiceStatus(100, 0, future, now)).toBe('sent');
    expect(deriveInvoiceStatus(100, -5, future, now)).toBe('sent');
  });

  it('is "paid" when fully (or over) paid, regardless of due date', () => {
    expect(deriveInvoiceStatus(100, 100, past, now)).toBe('paid');
    expect(deriveInvoiceStatus(100, 150, future, now)).toBe('paid');
  });

  it('is "overdue" when partially paid and past the due date', () => {
    expect(deriveInvoiceStatus(100, 40, past, now)).toBe('overdue');
  });

  it('is "partially_paid" when partially paid and not yet due', () => {
    expect(deriveInvoiceStatus(100, 40, future, now)).toBe('partially_paid');
  });

  it('is "partially_paid" when partially paid with no due date', () => {
    expect(deriveInvoiceStatus(100, 40, null, now)).toBe('partially_paid');
  });

  it('prefers paid over overdue when fully paid but past due', () => {
    expect(deriveInvoiceStatus(100, 100, past, now)).toBe('paid');
  });
});
