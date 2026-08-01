import { BadRequestException, Injectable } from '@nestjs/common';
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

  /**
   * Convert a single amount in `currency` to base currency, passing the amount
   * through unchanged when no rate is known.
   *
   * This lenient behaviour is deliberate for *reporting* aggregates, where a
   * missing rate should not collapse a dashboard total to zero. It is NOT safe
   * for posting to the ledger — use `toBaseOrThrow()` there.
   */
  async toBase(amount: number, currency: string, rateOverride?: number | null): Promise<number> {
    const base = await this.getBaseCurrency();
    if (currency === base) return amount;
    const rate = rateOverride ?? (await this.getRates())[currency];
    return rate ? amount * rate : amount;
  }

  /**
   * Strict conversion for the posting path.
   *
   * Audit 2026-08 (P0): the GL used the lenient `toBase()`, so a foreign-currency
   * document with no rate on file posted 1:1 — a USD 1,000 invoice booked AR as
   * EGP 1,000 instead of ~50,000. Nothing detected it, because every leg was
   * wrong by the same factor and the entry still balanced. Refuse to guess.
   */
  async toBaseOrThrow(amount: number, currency: string, rateOverride?: number | null): Promise<number> {
    const base = await this.getBaseCurrency();
    if (currency === base) return amount;
    const rate = rateOverride ?? (await this.getRates())[currency];
    if (!rate) {
      throw new BadRequestException(
        `No exchange rate for ${currency} → ${base}. Record one (Settings → Exchange Rates) ` +
          `dated on or before the document, or set the document's exchange rate, before posting.`,
      );
    }
    return amount * rate;
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
