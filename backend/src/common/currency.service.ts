import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceConfigService } from './workspace-config.service';

/**
 * Converts amounts to the workspace base currency using the latest manual
 * ExchangeRate per currency. Rates are cached briefly to avoid re-querying on
 * every aggregation. When no rate is known for a currency the amount is passed
 * through unchanged (rather than zeroed) so totals never silently collapse.
 */
@Injectable()
export class CurrencyService {
  private cache: { rates: Record<string, number>; at: number } | null = null;
  private readonly ttlMs = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceConfig: WorkspaceConfigService,
  ) {}

  async getBaseCurrency(): Promise<string> {
    return (await this.workspaceConfig.get()).baseCurrency;
  }

  private async getRates(): Promise<Record<string, number>> {
    if (this.cache && Date.now() - this.cache.at < this.ttlMs) return this.cache.rates;
    const base = await this.getBaseCurrency();
    // Ordered newest-first so the first row seen per currency is the latest.
    const rows = await this.prisma.exchangeRate.findMany({ orderBy: { asOf: 'desc' } });
    const rates: Record<string, number> = {};
    for (const r of rows) if (!(r.currency in rates)) rates[r.currency] = r.rate;
    rates[base] = 1;
    this.cache = { rates, at: Date.now() };
    return rates;
  }

  /** Convert a single amount in `currency` to base currency. */
  async toBase(amount: number, currency: string, rateOverride?: number | null): Promise<number> {
    const base = await this.getBaseCurrency();
    if (currency === base) return amount;
    const rate = rateOverride ?? (await this.getRates())[currency];
    return rate ? amount * rate : amount;
  }

  /**
   * Convert `amount` from one currency to another, routed through the base
   * currency. `fromRateOverride`/`toRateOverride` pin a historical rate (e.g. an
   * invoice's recorded `exchangeRate`) instead of the latest market rate. When a
   * needed rate is unknown the amount passes through unconverted rather than
   * collapsing to zero.
   */
  async convert(
    amount: number,
    from: string,
    to: string,
    fromRateOverride?: number | null,
    toRateOverride?: number | null,
  ): Promise<number> {
    if (from === to) return amount;
    const base = await this.getBaseCurrency();
    const inBase = await this.toBase(amount, from, fromRateOverride);
    if (to === base) return inBase;
    const toRate = toRateOverride ?? (await this.getRates())[to];
    return toRate ? inBase / toRate : inBase;
  }

  /** Collapse a per-currency map (e.g. { USD: 100, EGP: 50 }) into one base total. */
  async sumToBase(byCurrency: Record<string, number>): Promise<number> {
    const base = await this.getBaseCurrency();
    const rates = await this.getRates();
    let total = 0;
    for (const [cur, amt] of Object.entries(byCurrency)) {
      total += cur === base ? amt : amt * (rates[cur] ?? 1);
    }
    return Math.round(total * 100) / 100;
  }

  invalidate(): void {
    this.cache = null;
  }
}
