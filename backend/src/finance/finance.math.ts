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
}

export interface ComputedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxCode?: string;
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
 */
export function calcTotals(items: RawLineItem[], docTaxRate = 0): Totals {
  const perLine = items.some((i) => i.taxRate !== undefined && i.taxRate !== null);
  let taxSum = 0;
  const computed: ComputedLineItem[] = items.map((i) => {
    const disc = (i.discount ?? 0) / 100;
    const net = round2(i.quantity * i.unitPrice * (1 - disc));
    const rate = perLine ? (i.taxRate ?? 0) : docTaxRate;
    taxSum += net * (rate / 100);
    return {
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount ?? 0,
      taxRate: rate,
      ...(i.taxCode !== undefined ? { taxCode: i.taxCode } : {}),
      total: net,
    };
  });
  const subtotal = round2(computed.reduce((s, i) => s + i.total, 0));
  const tax = round2(taxSum);
  return { items: computed, subtotal, tax, total: round2(subtotal + tax) };
}

export type InvoiceStatus =
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'partially_paid';

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
  if (totalPaid <= 0) return 'sent';
  if (totalPaid >= total) return 'paid';
  if (dueDate && dueDate < now && totalPaid < total) return 'overdue';
  return 'partially_paid';
}
