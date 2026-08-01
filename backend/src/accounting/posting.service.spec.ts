import { PostingService } from './posting.service';
import { CurrencyService } from '../common/currency.service';

interface MakeOpts {
  existing?: { id: string } | null;
  glConfig?: Record<string, unknown>;
  // toBase(amount, currency, rate?) -> base amount
  toBase?: (amount: number, currency: string, rate?: number | null) => number;
}

function make(opts: MakeOpts = {}) {
  const created: any[] = [];
  const prisma: any = {
    journalEntry: {
      findUnique: jest.fn().mockResolvedValue(opts.existing ?? null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => {
        created.push(data);
        return Promise.resolve({ id: `je-${created.length}` });
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    chartOfAccount: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        if (where.code) return Promise.resolve({ id: `coa-${where.code}` });
        if (where.cashAccountId) return Promise.resolve({ id: 'coa-cash' });
        return Promise.resolve(null);
      }),
    },
  };
  const toBase = opts.toBase ?? ((amt: number, cur: string) => (cur === 'EGP' ? amt : amt * 50));
  const currency: any = {
    getBaseCurrency: jest.fn().mockResolvedValue('EGP'),
    toBase: jest.fn().mockImplementation((a: number, c: string, r?: number | null) => Promise.resolve(toBase(a, c, r))),
    convert: jest.fn().mockImplementation(async (
      amount: number,
      from: string,
      to: string,
      fromRate?: number | null,
      toRate?: number | null,
    ) => {
      if (from === to) return amount;
      const inBase = toBase(amount, from, fromRate);
      return to === 'EGP' ? inBase : inBase / (toRate ?? 50);
    }),
  };
  const workspaceConfig: any = {
    get: jest.fn().mockResolvedValue({ glConfig: opts.glConfig ?? { glEnabled: true } }),
  };
  const numbers: any = { nextNumber: jest.fn().mockResolvedValue('JE-0001') };
  const periods: any = { isDateLocked: jest.fn().mockResolvedValue(false) };
  const svc = new PostingService(prisma, currency, workspaceConfig, numbers, periods);
  return { svc, prisma, created, currency, periods };
}

function postedEntry() {
  return {
    id: 'orig',
    entryNumber: 'JE-0001',
    status: 'posted',
    sourceType: 'Invoice',
    lines: [
      { accountId: 'a', debit: 100, credit: 0, currency: 'EGP', baseAmount: 100 },
      { accountId: 'b', debit: 0, credit: 100, currency: 'EGP', baseAmount: -100 },
    ],
  };
}

describe('PostingService.post', () => {
  it('writes a balanced entry with signed base amounts', async () => {
    const { svc, prisma, created } = make();
    await svc.post({
      sourceType: 'X', sourceId: '1', date: new Date(),
      lines: [{ accountId: 'a', debit: 100 }, { accountId: 'b', credit: 100 }],
    });
    expect(prisma.journalEntry.create).toHaveBeenCalledTimes(1);
    const lines = created[0].lines.create;
    expect(lines[0].baseAmount).toBe(100);
    expect(lines[1].baseAmount).toBe(-100);
  });

  it('rejects an unbalanced entry', async () => {
    const { svc } = make();
    await expect(
      svc.post({
        sourceType: 'X', sourceId: '2', date: new Date(),
        lines: [{ accountId: 'a', debit: 100 }, { accountId: 'b', credit: 90 }],
      }),
    ).rejects.toThrow(/Unbalanced/);
  });

  it('is idempotent — no create when an entry already exists', async () => {
    const { svc, prisma } = make({ existing: { id: 'existing' } });
    const r = await svc.post({
      sourceType: 'X', sourceId: '1', date: new Date(),
      lines: [{ accountId: 'a', debit: 1 }, { accountId: 'b', credit: 1 }],
    });
    expect(r).toEqual({ id: 'existing' });
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it('rejects posting into a locked (closed) period', async () => {
    const { svc, prisma } = make();
    (svc as any).periods.isDateLocked = jest.fn().mockResolvedValue(true);
    await expect(
      svc.post({
        sourceType: 'X', sourceId: '9', date: new Date('2026-01-15'),
        lines: [{ accountId: 'a', debit: 10 }, { accountId: 'b', credit: 10 }],
      }),
    ).rejects.toThrow(/period is closed/);
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });
});

describe('PostingService.postInvoiceIssued', () => {
  it('books Dr AR / Cr Income / Cr Tax, balanced', async () => {
    const { svc, created } = make({
      glConfig: { glEnabled: true, defaultArAccount: '1200', defaultIncomeAccount: '4100', defaultTaxPayable: '2200' },
    });
    await svc.postInvoiceIssued({
      id: 'inv1', invoiceNumber: 'INV-1', issueDate: new Date(), currency: 'EGP', exchangeRate: null,
      subtotal: 1000, tax: 140, total: 1140, customerId: 'c1',
    });
    const lines = created[0].lines.create;
    const sum = lines.reduce((s: number, l: any) => s + l.baseAmount, 0);
    expect(Math.abs(sum)).toBeLessThan(0.005);
    expect(lines.find((l: any) => l.accountId === 'coa-1200').debit).toBe(1140);
    expect(lines.find((l: any) => l.accountId === 'coa-4100').credit).toBe(1000);
    expect(lines.find((l: any) => l.accountId === 'coa-2200').credit).toBe(140);
  });

  it('does not post when GL is disabled', async () => {
    const { svc, prisma } = make({ glConfig: { glEnabled: false } });
    await svc.postInvoiceIssued({
      id: 'inv2', invoiceNumber: 'INV-2', issueDate: new Date(), currency: 'EGP', exchangeRate: null,
      subtotal: 100, tax: 0, total: 100, customerId: 'c1',
    });
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });
});

describe('PostingService.postInvoicePayment — realized FX', () => {
  it('posts a balanced entry with the FX gain when the rate rose', async () => {
    // base EGP; invoice in USD booked at 50; payment in USD received at 55.
    const { svc, created } = make({
      glConfig: { glEnabled: true, defaultArAccount: '1200', defaultFxGainLossAccount: '4900' },
      toBase: (amt, cur, rate) => (cur === 'EGP' ? amt : amt * (rate ?? 55)),
    });
    await svc.postInvoicePayment(
      { id: 'p1', amount: 100, currency: 'USD', date: new Date(), accountId: 'acc1' },
      { id: 'inv1', invoiceNumber: 'INV-1', currency: 'USD', exchangeRate: 50, customerId: 'c1' },
    );
    const lines = created[0].lines.create;
    const sum = lines.reduce((s: number, l: any) => s + l.baseAmount, 0);
    expect(Math.abs(sum)).toBeLessThan(0.005);
    expect(lines.find((l: any) => l.accountId === 'coa-cash').baseAmount).toBeCloseTo(5500); // 100*55
    expect(lines.find((l: any) => l.accountId === 'coa-1200').baseAmount).toBeCloseTo(-5000); // 100*50
    const fx = lines.find((l: any) => l.accountId === 'coa-4900');
    expect(fx.baseAmount).toBeCloseTo(-500); // credit = FX gain
    expect(fx.credit).toBeCloseTo(500);
  });

  it('skips posting a payment with no cash account', async () => {
    const { svc, prisma } = make({ glConfig: { glEnabled: true, defaultArAccount: '1200' } });
    await svc.postInvoicePayment(
      { id: 'p2', amount: 100, currency: 'EGP', date: new Date(), accountId: null },
      { id: 'inv1', invoiceNumber: 'INV-1', currency: 'EGP', exchangeRate: null, customerId: 'c1' },
    );
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  // Audit P0: payment units are reused as document-currency units (posting.service.ts:390-392).
  it.failing('cross-currency invoice payment relieves AR by the document amount without an FX line', async () => {
    const { svc, created } = make({
      glConfig: { glEnabled: true, defaultArAccount: '1200', defaultFxGainLossAccount: '4900' },
    });

    await svc.postInvoicePayment(
      { id: 'p-egp', amount: 5_000, currency: 'EGP', date: new Date('2026-08-01'), accountId: 'acc1' },
      { id: 'inv-usd', invoiceNumber: 'INV-USD', currency: 'USD', exchangeRate: 50, customerId: 'c1' },
    );

    const lines = created[0].lines.create;
    expect({
      arBaseAmount: lines.find((line: any) => line.accountId === 'coa-1200')?.baseAmount,
      fxLineCount: lines.filter((line: any) => line.accountId === 'coa-4900').length,
    }).toEqual({ arBaseAmount: -5_000, fxLineCount: 0 });
  });
});

describe('PostingService.reverse', () => {
  it('writes a mirror entry flipping debit/credit and negating base, then marks original reversed', async () => {
    const { svc, prisma, created } = make();
    prisma.journalEntry.findUnique.mockResolvedValueOnce({
      id: 'orig', entryNumber: 'JE-0001', status: 'posted',
      lines: [
        { accountId: 'a', debit: 100, credit: 0, currency: 'EGP', baseAmount: 100 },
        { accountId: 'b', debit: 0, credit: 100, currency: 'EGP', baseAmount: -100 },
      ],
    });
    await svc.reverse('Invoice', 'inv1');
    const mirror = created[0];
    expect(mirror.reversesEntryId).toBe('orig');
    expect(mirror.lines.create[0]).toMatchObject({ debit: 0, credit: 100, baseAmount: -100 });
    expect(mirror.lines.create[1]).toMatchObject({ debit: 100, credit: 0, baseAmount: 100 });
    expect(prisma.journalEntry.update).toHaveBeenCalledWith({ where: { id: 'orig' }, data: { status: 'reversed' } });
  });

  // Audit P1: reverse() bypasses the reversal-date lock (posting.service.ts:275).
  it.failing('reverse rejects a reversal dated in a closed period', async () => {
    const { svc, prisma, periods } = make();
    prisma.journalEntry.findUnique.mockResolvedValueOnce(postedEntry());
    periods.isDateLocked.mockResolvedValue(true);

    await expect(
      svc.reverse('Invoice', 'inv1', { date: new Date('2026-01-15T00:00:00.000Z') }),
    ).rejects.toThrow(/closed/i);
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  // Audit P1: reverseLive() bypasses the reversal-date lock (posting.service.ts:312).
  it.failing('reverseLive rejects a reversal dated in a closed period', async () => {
    const { svc, prisma, periods } = make();
    prisma.journalEntry.findFirst.mockResolvedValueOnce(postedEntry());
    periods.isDateLocked.mockResolvedValue(true);

    await expect(
      svc.reverseLive('Invoice', 'inv1', { date: new Date('2026-01-15T00:00:00.000Z') }),
    ).rejects.toThrow(/closed/i);
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });
});

describe('PostingService.postVendorBillPayment — cross-currency settlement', () => {
  // Audit P0: payment units are reused as document-currency units (posting.service.ts:592-594).
  it.failing('cross-currency vendor payment relieves AP by the document amount without an FX line', async () => {
    const { svc, created } = make({
      glConfig: { glEnabled: true, defaultApAccount: '2100', defaultFxGainLossAccount: '4900' },
    });

    await svc.postVendorBillPayment(
      { id: 'p-egp', amount: 5_000, currency: 'EGP', date: new Date('2026-08-01'), accountId: 'acc1' },
      { id: 'bill-usd', billNumber: 'BILL-USD', currency: 'USD', exchangeRate: 50, supplierId: 's1' },
    );

    const lines = created[0].lines.create;
    expect({
      apBaseAmount: lines.find((line: any) => line.accountId === 'coa-2100')?.baseAmount,
      fxLineCount: lines.filter((line: any) => line.accountId === 'coa-4900').length,
    }).toEqual({ apBaseAmount: 5_000, fxLineCount: 0 });
  });
});

describe('PostingService.postInvoiceIssued — exchange-rate validation', () => {
  // Audit P0: a missing rate silently falls back to 1:1 (currency.service.ts:42).
  it.failing('foreign-currency invoice posting rejects a missing exchange rate', async () => {
    const { svc, prisma } = make({
      glConfig: { glEnabled: true, defaultArAccount: '1200', defaultIncomeAccount: '4100' },
    });
    prisma.exchangeRate = { findMany: jest.fn().mockResolvedValue([]) };
    (svc as any).currency = new CurrencyService(
      prisma,
      { get: jest.fn().mockResolvedValue({ baseCurrency: 'EGP' }) } as any,
    );

    await expect(
      svc.postInvoiceIssued({
        id: 'inv-no-rate',
        invoiceNumber: 'INV-NO-RATE',
        issueDate: new Date('2026-08-01'),
        currency: 'USD',
        exchangeRate: null,
        subtotal: 100,
        tax: 0,
        total: 100,
        customerId: 'c1',
      }),
    ).rejects.toThrow(/exchange rate|rate.*USD/i);
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });
});
