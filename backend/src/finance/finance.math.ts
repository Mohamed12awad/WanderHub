// Pure money/calculation helpers for the finance module. Kept free of Prisma so
// they can be unit-tested in isolation and reused.

export interface RawLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  /** Per-line tax rate (percentage). When omitted on every line, the document
   *  rate passed to calcTotals is applied instead (legacy behaviour). */
  taxRate?: number;
  taxCode?: string;
  /** Optional link to a catalog product, used for stock movements. */
  productId?: string;
}

export interface ComputedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxCode?: string;
  productId?: string;
  /** Line net of discount, EXCLUDING tax. */
  total: number;
}

export interface Totals {
  items: ComputedLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes per-line and document totals. `discount` is a percentage (0-100)
 * applied to the line's gross. Tax is per-line: each line's `taxRate` applies
 * to its net, and the document tax is the sum of line taxes. If no line carries
 * a `taxRate`, the document-level `docTaxRate` is applied to every line — so
 * existing single-rate callers behave exactly as before.
 *
 * `taxInclusive` controls how `unitPrice` relates to tax:
 *   - false (default): prices are net; tax is added on top (total = subtotal + tax).
 *   - true: prices already include tax; tax is back-calculated out of the line
 *     amount (net = amount / (1 + rate), tax = amount − net). The document total
 *     equals the sum of the original tax-inclusive line amounts.
 * Either way `subtotal` is the net (tax-exclusive) figure and
 * `total = subtotal + tax`, so downstream payment/GL logic is unchanged.
 */
export function calcTotals(items: RawLineItem[], docTaxRate = 0, taxInclusive = false): Totals {
  const perLine = items.some(
    (i) => i.taxRate !== undefined && i.taxRate !== null,
  );
  let taxSum = 0;
  const computed: ComputedLineItem[] = items.map((i) => {
    const disc = (i.discount ?? 0) / 100;
    const lineAmount = round2(i.quantity * i.unitPrice * (1 - disc));
    const rate = perLine ? (i.taxRate ?? 0) : docTaxRate;
    let net: number;
    if (taxInclusive) {
      net = round2(lineAmount / (1 + rate / 100));
      taxSum += lineAmount - net;
    } else {
      net = lineAmount;
      taxSum += net * (rate / 100);
    }
    return {
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount ?? 0,
      taxRate: rate,
      ...(i.taxCode !== undefined ? { taxCode: i.taxCode } : {}),
      ...(i.productId !== undefined ? { productId: i.productId } : {}),
      total: net,
    };
  });
  const subtotal = round2(computed.reduce((s, i) => s + i.total, 0));
  const tax = round2(taxSum);
  return { items: computed, subtotal, tax, total: round2(subtotal + tax) };
}

/**
 * Half of one minor unit of `currency` — the largest rounding/FX-conversion
 * drift we accept when comparing a payment against an outstanding balance.
 * Currency-aware (2 dp for USD/EUR/EGP, 0 for JPY, 3 for some) so a flat pad
 * never over- or under-reconciles across currencies of different precision.
 * Falls back to 2 decimals for unknown currency codes.
 */
export function paymentTolerance(currency: string): number {
  let decimals = 2;
  try {
    decimals =
      new Intl.NumberFormat("en-US", { style: "currency", currency })
        .resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Unknown/invalid currency code → keep the 2-decimal default.
  }
  return 0.5 * Math.pow(10, -decimals);
}

export type InvoiceStatus = "sent" | "paid" | "overdue" | "partially_paid";

/**
 * Derives an invoice's payment status from its total, amount paid, and due date.
 * `now` is injectable for deterministic testing.
 */
export function deriveInvoiceStatus(
  total: number,
  totalPaid: number,
  dueDate?: Date | null,
  now: Date = new Date(),
): InvoiceStatus {
  if (totalPaid <= 0) return "sent";
  if (totalPaid >= total) return "paid";
  if (dueDate && dueDate < now && totalPaid < total) return "overdue";
  return "partially_paid";
}
