/** Period helpers — a period is a calendar month keyed `YYYY-MM` (UTC). */

export function ym(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function isValidPeriod(p: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

export function monthRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // day 0 of next month = last day
  return { start, end };
}

export function priorPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return ym(new Date(Date.UTC(y, m - 2, 1)));
}
