import { toClient } from './serialize';

export interface PaginateOptions {
  where: any;
  include?: any;
  orderBy?: any;
  page?: string;
  limit?: string;
}

/**
 * Executes a paginated Prisma findMany + count and returns the standard
 * `{ data, total, page, pages }` envelope. Defaults: page=1, limit=25, max=100.
 */
export async function paginate<T>(
  model: { findMany: (...args: any[]) => Promise<any[]>; count: (...args: any[]) => Promise<number> },
  opts: PaginateOptions,
): Promise<{ data: T[]; total: number; page: number; pages: number }> {
  const p = Math.max(1, parseInt(opts.page ?? '1') || 1);
  const take = Math.min(100, parseInt(opts.limit ?? '25') || 25);

  const [raw, total] = await Promise.all([
    model.findMany({
      where: opts.where,
      include: opts.include,
      orderBy: opts.orderBy,
      skip: (p - 1) * take,
      take,
    }),
    model.count({ where: opts.where }),
  ]);

  return {
    data: toClient(raw) as T[],
    total,
    page: p,
    pages: Math.ceil(total / take),
  };
}

/**
 * Builds a Prisma `{ gte, lte }` date range filter. Extends `to` to end of day.
 * Returns undefined when neither boundary is provided.
 */
export function dateRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const r: { gte?: Date; lte?: Date } = {};
  if (from) r.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    r.lte = d;
  }
  return r;
}
