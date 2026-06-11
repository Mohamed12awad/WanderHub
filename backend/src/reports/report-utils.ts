import { Prisma } from '@prisma/client';
import { dateRange } from '../common/paginate';

/** Time bucket granularity for time-series reports. */
export type GroupBy = 'month' | 'quarter' | 'year';

/** Normalized, reusable filter set shared by every report endpoint. */
export interface ReportParams {
  /** Inclusive date range (end extended to end-of-day by `dateRange`). */
  range: { gte?: Date; lte?: Date } | undefined;
  groupBy: GroupBy;
  /** Narrow to a single owner/creator within the caller's visibility scope. */
  ownerId?: string;
  /** Status/stage filter, meaning is per-report. */
  status?: string;
  /** Restrict to a single currency (skips base-currency consolidation). */
  currency?: string;
}

/** Parse raw query params into the shared {@link ReportParams} shape. */
export function parseReportParams(query: Record<string, string>): ReportParams {
  const g = query.groupBy;
  const groupBy: GroupBy = g === 'quarter' || g === 'year' ? g : 'month';
  return {
    range: dateRange(query.startDate, query.endDate),
    groupBy,
    ownerId: query.ownerId?.trim() || undefined,
    status: query.status?.trim() || undefined,
    currency: query.currency?.trim() || undefined,
  };
}

/**
 * SELECT fragment that buckets `col` into `year` + `period` columns for the
 * given granularity (period is 1 for year, 1-4 for quarter, 1-12 for month).
 * Pair with {@link bucketLabel} to render and `GROUP BY year, period`.
 */
export function periodSelect(col: Prisma.Sql, groupBy: GroupBy): Prisma.Sql {
  const periodExpr =
    groupBy === 'year'
      ? Prisma.sql`1`
      : groupBy === 'quarter'
        ? Prisma.sql`EXTRACT(QUARTER FROM ${col})::int`
        : Prisma.sql`EXTRACT(MONTH FROM ${col})::int`;
  return Prisma.sql`EXTRACT(YEAR FROM ${col})::int AS year, ${periodExpr} AS period`;
}

/** Human label for a {@link periodSelect} bucket. */
export function bucketLabel(year: number, period: number, groupBy: GroupBy): string {
  if (groupBy === 'year') return String(year);
  if (groupBy === 'quarter') return `Q${period} ${year}`;
  return new Date(year, period - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Turn a Prisma `ownershipWhere` result into a raw SQL fragment. `scopeKey` is
 * the (unquoted) key the visibility service used (e.g. `createdById`); `sqlCol`
 * is the actual, possibly table-qualified column to filter (e.g. `i."createdById"`),
 * which lets callers disambiguate joins.
 */
export function ownerScopeSql(
  scope: Record<string, unknown>,
  scopeKey: string,
  sqlCol: Prisma.Sql,
): Prisma.Sql {
  if (!(scopeKey in scope)) return Prisma.sql``;
  const val = scope[scopeKey];
  if (typeof val === 'string') return Prisma.sql`AND ${sqlCol} = ${val}`;
  if (val && typeof val === 'object' && 'in' in val) {
    const ids = (val as { in: string[] }).in;
    if (!ids.length) return Prisma.sql`AND FALSE`;
    return Prisma.sql`AND ${sqlCol} IN (${Prisma.join(ids)})`;
  }
  return Prisma.sql``;
}

/** Optional `AND <col> = <ownerId>` fragment for an explicit owner filter. */
export function ownerEqSql(ownerId: string | undefined, sqlCol: Prisma.Sql): Prisma.Sql {
  return ownerId ? Prisma.sql`AND ${sqlCol} = ${ownerId}` : Prisma.sql``;
}

/** `month` label kept for callers that always bucket by calendar month. */
export function toMonthLabel(year: number, month: number): string {
  return bucketLabel(year, month, 'month');
}
