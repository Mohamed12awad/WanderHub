// Pure money/calculation helpers for the finance module. Kept free of Prisma so
// they can be unit-tested in isolation and reused.

export interface RawLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface ComputedLineItem extends RawLineItem {
  discount: number;
  total: number;
}

export interface Totals {
  items: ComputedLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Computes per-line and document totals. `discount` is a percentage (0-100)
 * applied to the line's gross; `taxRate` is a percentage applied to the
 * subtotal.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcTotals(items: RawLineItem[], taxRate = 0): Totals {
  const computed = items.map((i) => {
    const disc = (i.discount ?? 0) / 100;
    return { ...i, discount: i.discount ?? 0, total: round2(i.quantity * i.unitPrice * (1 - disc)) };
  });
  const subtotal = round2(computed.reduce((s, i) => s + i.total, 0));
  const tax = round2(subtotal * (taxRate / 100));
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
