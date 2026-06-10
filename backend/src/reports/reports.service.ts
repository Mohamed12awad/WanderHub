import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../common/currency.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { toClient } from '../common/serialize';
import { Prisma } from '@prisma/client';

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'];

function toMonthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function parseDateRange(q: Record<string, string>): { gte?: Date; lte?: Date } | null {
  if (!q.startDate && !q.endDate) return null;
  const range: { gte?: Date; lte?: Date } = {};
  if (q.startDate) range.gte = new Date(q.startDate);
  if (q.endDate) range.lte = new Date(q.endDate);
  return range;
}

/**
 * Converts a Prisma-style ownershipWhere result into a raw SQL fragment.
 * ownerField is the quoted column name to filter on (e.g. '"createdById"').
 */
function toSqlOwnerClause(scopeWhere: Record<string, unknown>, ownerField: string): Prisma.Sql {
  if (!(ownerField.replace(/"/g, '') in scopeWhere)) return Prisma.sql``;
  const val = scopeWhere[ownerField.replace(/"/g, '')];
  if (typeof val === 'string') {
    return Prisma.sql`AND ${Prisma.raw(ownerField)} = ${val}`;
  }
  if (val && typeof val === 'object' && 'in' in val) {
    const ids = (val as { in: string[] }).in;
    if (!ids.length) return Prisma.sql`AND FALSE`;
    return Prisma.sql`AND ${Prisma.raw(ownerField)} IN (${Prisma.join(ids)})`;
  }
  return Prisma.sql``;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly visibility: VisibilityService,
  ) {}

  async getAccountingReport(startDate: string, endDate: string, user: AuthUser) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const [dealScope, purchaseScope, expenseScope] = await Promise.all([
      this.visibility.ownershipWhere(user, 'deals', 'ownerId'),
      this.visibility.ownershipWhere(user, 'procurement', 'createdById'),
      this.visibility.ownershipWhere(user, 'expenses', 'userId'),
    ]);
    const [deals, purchases, expenses] = await Promise.all([
      this.prisma.deal.findMany({
        where: { deletedAt: null, createdAt: { gte: start, lte: end }, ...dealScope },
        include: { customer: true, product: true },
      }),
      this.prisma.purchaseOrder.findMany({ where: { deletedAt: null, createdAt: { gte: start, lte: end }, ...purchaseScope } }),
      this.prisma.expenseReport.findMany({
        where: { deletedAt: null, createdAt: { gte: start, lte: end }, ...expenseScope },
        include: { expenses: true },
      }),
    ]);
    return toClient({ bookings: deals, purchases, expenses });
  }

  async getBookingReport(startDate: string, endDate: string, user: AuthUser, location?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: start, lte: end },
        ...scopeWhere,
        ...(location ? { customer: { location } } : {}),
      },
      include: { customer: true, product: true },
    });
    return toClient(deals);
  }

  async getRevenueByMonth(query: Record<string, string>, user: AuthUser) {
    const range = parseDateRange(query);
    // Exclude payments belonging to soft-deleted invoices.
    const dateClause = range
      ? Prisma.sql`AND p.date >= ${range.gte!}::timestamp AND p.date <= ${range.lte!}::timestamp`
      : Prisma.sql``;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const ownerClause = toSqlOwnerClause(scopeWhere, '"createdById"');

    // Group by currency as well so each currency's payments can be converted to
    // base before being merged into a single monthly revenue figure.
    const rows = await this.prisma.$queryRaw<{ year: number; month: number; currency: string; revenue: number; count: number }[]>(
      Prisma.sql`
        SELECT
          EXTRACT(YEAR FROM p.date)::int AS year,
          EXTRACT(MONTH FROM p.date)::int AS month,
          p.currency AS currency,
          ROUND(SUM(p.amount)::numeric, 2)::float AS revenue,
          COUNT(*)::int AS count
        FROM "InvoicePayment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."deletedAt" IS NULL
        ${dateClause}
        ${ownerClause}
        GROUP BY year, month, p.currency
        ORDER BY year, month
      `,
    );

    const merged = new Map<string, { year: number; month: number; revenue: number; count: number }>();
    for (const r of rows) {
      const key = `${r.year}-${r.month}`;
      const base = await this.currency.toBase(r.revenue, r.currency);
      const acc = merged.get(key) ?? { year: r.year, month: r.month, revenue: 0, count: 0 };
      acc.revenue += base;
      acc.count += r.count;
      merged.set(key, acc);
    }
    return [...merged.values()].map((r) => ({
      month: toMonthLabel(r.year, r.month),
      revenue: Math.round(r.revenue * 100) / 100,
      count: r.count,
    }));
  }

  async getPipelineFunnel(user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    // Group by currency too so per-currency deal values convert to base before
    // being summed into a single comparable figure per stage.
    const rows = await this.prisma.deal.groupBy({
      by: ['status', 'currency'],
      where: { deletedAt: null, ...scopeWhere },
      _count: { id: true },
      _sum: { price: true },
    });
    const byStage = new Map<string, { count: number; value: number }>();
    for (const r of rows) {
      const base = await this.currency.toBase(Number(r._sum?.price ?? 0), r.currency);
      const acc = byStage.get(r.status) ?? { count: 0, value: 0 };
      acc.count += r._count?.id ?? 0;
      acc.value += base;
      byStage.set(r.status, acc);
    }
    return STAGES.map((s) => ({
      stage: s,
      count: byStage.get(s)?.count ?? 0,
      value: Math.round(byStage.get(s)?.value ?? 0),
    }));
  }

  async getExpensesByCategory(query: Record<string, string>, user: AuthUser) {
    const range = parseDateRange(query);
    const scopeWhere = await this.visibility.ownershipWhere(user, 'expenses', 'userId');
    const rows = await this.prisma.expenseItem.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: { id: true },
      where: { ...(range ? { date: range } : {}), expenseReport: { deletedAt: null, ...scopeWhere } },
      orderBy: { _sum: { amount: 'desc' } },
    });
    return rows.map((r) => ({
      category: r.category || 'uncategorized',
      total: Math.round(Number(r._sum.amount ?? 0)),
      count: r._count.id,
    }));
  }

  async getOutstandingInvoices(user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const invoices = await this.prisma.invoice.findMany({
      where: { deletedAt: null, status: { in: ['sent', 'partially_paid', 'overdue'] }, ...scopeWhere },
      include: {
        customer: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });
    return invoices.map((inv) => ({
      _id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      title: inv.title,
      customer: inv.customer ? { _id: inv.customer.id, name: inv.customer.name } : null,
      deal: inv.deal ? { _id: inv.deal.id, title: inv.deal.title } : null,
      total: Number(inv.total),
      totalPaid: Number(inv.totalPaid),
      outstanding: Number(inv.total) - Number(inv.totalPaid),
      dueDate: inv.dueDate,
      status: inv.status,
      currency: inv.currency,
    }));
  }

  async getCustomerAcquisition(query: Record<string, string>, user: AuthUser) {
    const range = parseDateRange(query);
    const dateClause = range
      ? Prisma.sql`AND "createdAt" >= ${range.gte!}::timestamp AND "createdAt" <= ${range.lte!}::timestamp`
      : Prisma.sql``;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');
    const ownerClause = toSqlOwnerClause(scopeWhere, '"ownerId"');

    const rows = await this.prisma.$queryRaw<{ year: number; month: number; count: number }[]>(
      Prisma.sql`
        SELECT
          EXTRACT(YEAR FROM "createdAt")::int AS year,
          EXTRACT(MONTH FROM "createdAt")::int AS month,
          COUNT(*)::int AS count
        FROM "Customer"
        WHERE "deletedAt" IS NULL
        ${dateClause}
        ${ownerClause}
        GROUP BY year, month
        ORDER BY year, month
      `,
    );
    return rows.map((r) => ({ month: toMonthLabel(r.year, r.month), customers: r.count }));
  }

  async getLeadsFunnel(user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');
    const counts = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...scopeWhere },
      _count: { id: true },
    });
    const result: Record<string, number> = { new: 0, contacted: 0, qualified: 0, unqualified: 0, converted: 0 };
    counts.forEach(({ status, _count }) => { result[status] = _count.id; });
    return result;
  }
}
