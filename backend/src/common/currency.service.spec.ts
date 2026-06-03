import { CurrencyService } from './currency.service';

function makeService(opts?: { base?: string; rows?: { currency: string; rate: number }[] }) {
  const base = opts?.base ?? 'EGP';
  const rows = opts?.rows ?? [
    // findMany returns newest-first; the first row per currency is the latest.
    { currency: 'USD', rate: 50 },
    { currency: 'USD', rate: 49 }, // older — must be ignored
    { currency: 'EUR', rate: 55 },
  ];
  const prisma: any = { exchangeRate: { findMany: jest.fn().mockResolvedValue(rows) } };
  const workspaceConfig: any = { get: jest.fn().mockResolvedValue({ baseCurrency: base }) };
  return new CurrencyService(prisma, workspaceConfig);
}

describe('CurrencyService.toBase', () => {
  beforeEach(() => jest.clearAllMocks());
  it('passes through an amount already in the base currency', async () => {
    expect(await makeService().toBase(100, 'EGP')).toBe(100);
  });

  it('applies the latest rate for a foreign currency', async () => {
    expect(await makeService().toBase(10, 'USD')).toBe(500); // 10 * 50, not 49
  });

  it('uses an explicit rate override when provided', async () => {
    expect(await makeService().toBase(10, 'USD', 49)).toBe(490);
  });

  it('passes the amount through unchanged for an unknown currency (never zeroes)', async () => {
    expect(await makeService().toBase(10, 'GBP')).toBe(10);
  });
});

describe('CurrencyService.sumToBase', () => {
  beforeEach(() => jest.clearAllMocks());
  it('collapses a multi-currency map into one base total', async () => {
    // 100 EGP + (10 USD * 50) + (2 EUR * 55) = 100 + 500 + 110 = 710
    const total = await makeService().sumToBase({ EGP: 100, USD: 10, EUR: 2 });
    expect(total).toBe(710);
  });

  it('treats unknown currencies as 1:1 rather than dropping them', async () => {
    const total = await makeService().sumToBase({ EGP: 100, GBP: 25 });
    expect(total).toBe(125);
  });

  it('rounds to 2 decimal places', async () => {
    const svc = makeService({ rows: [{ currency: 'USD', rate: 49.999 }] });
    // 1 USD * 49.999 = 49.999 -> 50.00
    expect(await svc.sumToBase({ USD: 1 })).toBe(50);
  });
});

describe('CurrencyService caching', () => {
  beforeEach(() => jest.clearAllMocks());
  it('caches rate lookups and clears them on invalidate()', async () => {
    const svc = makeService();
    const prisma: any = (svc as any).prisma;
    await svc.sumToBase({ USD: 1 });
    await svc.sumToBase({ USD: 1 });
    expect(prisma.exchangeRate.findMany).toHaveBeenCalledTimes(1); // cached
    svc.invalidate();
    await svc.sumToBase({ USD: 1 });
    expect(prisma.exchangeRate.findMany).toHaveBeenCalledTimes(2); // refetched
  });
});
