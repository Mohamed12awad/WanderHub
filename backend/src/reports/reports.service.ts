import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../common/currency.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { toClient } from '../common/serialize';
import { Prisma } from '@prisma/client';
import {
  ReportParams,
  periodSelect,
  bucketLabel,
  ownerScopeSql,
  ownerEqSql,
} from './report-utils';

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'];

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly visibility: VisibilityService,
  ) {}

  // ── Legacy accounting / booking reports ──────────────────────────────────

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
        include: { customer: true },
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
      include: { customer: true },
    });
    return toClient(deals);
  }

  // ── Revenue (payments collected) per period ──────────────────────────────

  async getRevenueByMonth(params: ReportParams, user: AuthUser) {
    const { range, groupBy, ownerId, currency } = params;
    const dateClause =
      range?.gte && range?.lte
        ? Prisma.sql`AND p.date >= ${range.gte}::timestamp AND p.date <= ${range.lte}::timestamp`
        : Prisma.sql``;
    const currencyClause = currency ? Prisma.sql`AND p.currency = ${currency}` : Prisma.sql``;
    const scope = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const ownerClause = ownerScopeSql(scope, 'createdById', Prisma.sql`i."createdById"`);
    const ownerEq = ownerEqSql(ownerId, Prisma.sql`i."createdById"`);

    const rows = await this.prisma.$queryRaw<{ year: number; period: number; currency: string; revenue: number; count: number }[]>(
      Prisma.sql`
        SELECT
          ${periodSelect(Prisma.sql`p.date`, groupBy)},
          p.currency AS currency,
          ROUND(SUM(p.amount)::numeric, 2)::float AS revenue,
          COUNT(*)::int AS count
        FROM "InvoicePayment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        WHERE i."deletedAt" IS NULL
        ${dateClause}
        ${currencyClause}
        ${ownerClause}
        ${ownerEq}
        GROUP BY year, period, p.currency
        ORDER BY year, period
      `,
    );

    // When a single currency is selected, no consolidation is needed.
    const merged = new Map<string, { year: number; period: number; revenue: number; count: number }>();
    for (const r of rows) {
      const key = `${r.year}-${r.period}`;
      const base = currency ? r.revenue : await this.currency.toBase(r.revenue, r.currency);
      const acc = merged.get(key) ?? { year: r.year, period: r.period, revenue: 0, count: 0 };
      acc.revenue += base;
      acc.count += r.count;
      merged.set(key, acc);
    }
    return [...merged.values()].map((r) => ({
      month: bucketLabel(r.year, r.period, groupBy),
      revenue: Math.round(r.revenue * 100) / 100,
      count: r.count,
    }));
  }

  // ── Deal pipeline funnel ─────────────────────────────────────────────────

  async getPipelineFunnel(params: ReportParams, user: AuthUser) {
    const { range, ownerId, currency } = params;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const where: Prisma.DealWhereInput = {
      deletedAt: null,
      ...scopeWhere,
      ...(ownerId ? { ownerId } : {}),
      ...(currency ? { currency } : {}),
      ...(range?.gte && range?.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
    };
    const rows = await this.prisma.deal.groupBy({
      by: ['status', 'currency'],
      where,
      _count: { id: true },
      _sum: { price: true },
    });
    const byStage = new Map<string, { count: number; value: number }>();
    for (const r of rows) {
      const base = currency ? Number(r._sum?.price ?? 0) : await this.currency.toBase(Number(r._sum?.price ?? 0), r.currency);
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

  // ── Expenses by category ─────────────────────────────────────────────────

  async getExpensesByCategory(params: ReportParams, user: AuthUser) {
    const { range, ownerId } = params;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'expenses', 'userId');
    const rows = await this.prisma.expenseItem.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: { id: true },
      where: {
        ...(range ? { date: range } : {}),
        expenseReport: { deletedAt: null, ...scopeWhere, ...(ownerId ? { userId: ownerId } : {}) },
      },
      orderBy: { _sum: { amount: 'desc' } },
    });
    return rows.map((r) => ({
      category: r.category || 'uncategorized',
      total: Math.round(Number(r._sum.amount ?? 0)),
      count: r._count.id,
    }));
  }

  // ── Outstanding invoices ─────────────────────────────────────────────────

  async getOutstandingInvoices(params: ReportParams, user: AuthUser) {
    const { range, ownerId, status } = params;
    const allowed = ['sent', 'partially_paid', 'overdue'];
    const statusFilter = status && allowed.includes(status) ? [status] : allowed;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const invoices = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: { in: statusFilter },
        ...scopeWhere,
        ...(ownerId ? { createdById: ownerId } : {}),
        ...(range?.gte && range?.lte ? { dueDate: { gte: range.gte, lte: range.lte } } : {}),
      },
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

  // ── Customer acquisition per period ──────────────────────────────────────

  async getCustomerAcquisition(params: ReportParams, user: AuthUser) {
    const { range, groupBy, ownerId } = params;
    const dateClause =
      range?.gte && range?.lte
        ? Prisma.sql`AND "createdAt" >= ${range.gte}::timestamp AND "createdAt" <= ${range.lte}::timestamp`
        : Prisma.sql``;
    const scope = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');
    const ownerClause = ownerScopeSql(scope, 'ownerId', Prisma.sql`"ownerId"`);
    const ownerEq = ownerEqSql(ownerId, Prisma.sql`"ownerId"`);

    const rows = await this.prisma.$queryRaw<{ year: number; period: number; count: number }[]>(
      Prisma.sql`
        SELECT
          ${periodSelect(Prisma.sql`"createdAt"`, groupBy)},
          COUNT(*)::int AS count
        FROM "Customer"
        WHERE "deletedAt" IS NULL
        ${dateClause}
        ${ownerClause}
        ${ownerEq}
        GROUP BY year, period
        ORDER BY year, period
      `,
    );
    return rows.map((r) => ({ month: bucketLabel(r.year, r.period, groupBy), customers: r.count }));
  }

  // ── Leads funnel ─────────────────────────────────────────────────────────

  async getLeadsFunnel(params: ReportParams, user: AuthUser) {
    const { range, ownerId } = params;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');
    const counts = await this.prisma.lead.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ...scopeWhere,
        ...(ownerId ? { ownerId } : {}),
        ...(range?.gte && range?.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
      },
      _count: { id: true },
    });
    const result: Record<string, number> = { new: 0, contacted: 0, qualified: 0, unqualified: 0, converted: 0 };
    counts.forEach(({ status, _count }) => { result[status] = _count.id; });
    return result;
  }

  // ════════════════════════════════════════════════════════════════════════
  // New analytics — Sales
  // ════════════════════════════════════════════════════════════════════════

  /** Won deals (count + base-currency value) grouped by owner. */
  async getSalesLeaderboard(params: ReportParams, user: AuthUser) {
    const { range } = params;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        status: 'won',
        ...scopeWhere,
        ...(range?.gte && range?.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
      },
      select: { ownerId: true, price: true, currency: true, owner: { select: { name: true } } },
    });
    const byOwner = new Map<string, { ownerId: string; name: string; count: number; value: number }>();
    for (const d of deals) {
      const key = d.ownerId ?? 'unassigned';
      const base = await this.currency.toBase(Number(d.price), d.currency);
      const acc = byOwner.get(key) ?? { ownerId: key, name: d.owner?.name ?? 'Unassigned', count: 0, value: 0 };
      acc.count += 1;
      acc.value += base;
      byOwner.set(key, acc);
    }
    return [...byOwner.values()]
      .map((o) => ({ ...o, value: Math.round(o.value) }))
      .sort((a, b) => b.value - a.value);
  }

  /** Lead→qualified→won conversion funnel with conversion percentages. */
  async getConversionFunnel(params: ReportParams, user: AuthUser) {
    const { range, ownerId } = params;
    const [leadScope, dealScope] = await Promise.all([
      this.visibility.ownershipWhere(user, 'leads', 'ownerId'),
      this.visibility.ownershipWhere(user, 'deals', 'ownerId'),
    ]);
    const dateLead = range?.gte && range?.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {};
    const [leads, deals] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...leadScope, ...(ownerId ? { ownerId } : {}), ...dateLead },
        _count: { id: true },
      }),
      this.prisma.deal.groupBy({
        by: ['status'],
        where: { deletedAt: null, ...dealScope, ...(ownerId ? { ownerId } : {}), ...dateLead },
        _count: { id: true },
      }),
    ]);
    const leadCount = leads.reduce((a, r) => a + r._count.id, 0);
    const dealCount = deals.reduce((a, r) => a + r._count.id, 0);
    const wonCount = deals.find((r) => r.status === 'won')?._count.id ?? 0;
    const stages = [
      { stage: 'Leads', count: leadCount },
      { stage: 'Deals', count: dealCount },
      { stage: 'Won', count: wonCount },
    ];
    return stages.map((s, i) => ({
      ...s,
      conversion: i === 0 ? 100 : stages[0].count ? Math.round((s.count / stages[0].count) * 100) : 0,
    }));
  }

  /** Headline deal metrics: average won deal size, average sales cycle, win rate. */
  async getDealMetrics(params: ReportParams, user: AuthUser) {
    const { range } = params;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const dateClause = range?.gte && range?.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {};
    const deals = await this.prisma.deal.findMany({
      where: { deletedAt: null, ...scopeWhere, ...dateClause },
      select: { status: true, price: true, currency: true, createdAt: true, expectedCloseDate: true },
    });
    let wonValue = 0;
    let wonCount = 0;
    let cycleDaysTotal = 0;
    let cycleSamples = 0;
    const closed = deals.filter((d) => d.status === 'won' || d.status === 'lost').length;
    for (const d of deals) {
      if (d.status === 'won') {
        wonValue += await this.currency.toBase(Number(d.price), d.currency);
        wonCount += 1;
        if (d.expectedCloseDate) {
          cycleDaysTotal += Math.max(0, (d.expectedCloseDate.getTime() - d.createdAt.getTime()) / 86_400_000);
          cycleSamples += 1;
        }
      }
    }
    return {
      totalDeals: deals.length,
      wonCount,
      avgDealSize: wonCount ? Math.round(wonValue / wonCount) : 0,
      avgSalesCycleDays: cycleSamples ? Math.round(cycleDaysTotal / cycleSamples) : 0,
      winRate: closed ? Math.round((wonCount / closed) * 100) : 0,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // New analytics — Finance
  // ════════════════════════════════════════════════════════════════════════

  /** Revenue (payments) vs approved expenses per period, with net profit. */
  async getProfitLoss(params: ReportParams, user: AuthUser) {
    const revenueSeries = await this.getRevenueByMonth(params, user);
    const { range, groupBy } = params;
    const dateClause =
      range?.gte && range?.lte
        ? Prisma.sql`AND ei.date >= ${range.gte}::timestamp AND ei.date <= ${range.lte}::timestamp`
        : Prisma.sql``;
    const expenseRows = await this.prisma.$queryRaw<{ year: number; period: number; total: number }[]>(
      Prisma.sql`
        SELECT
          ${periodSelect(Prisma.sql`ei.date`, groupBy)},
          ROUND(SUM(ei.amount)::numeric, 2)::float AS total
        FROM "ExpenseItem" ei
        JOIN "ExpenseReport" er ON er.id = ei."expenseReportId"
        WHERE er."deletedAt" IS NULL AND er."approvalStatus"::text = 'approved'
        ${dateClause}
        GROUP BY year, period
        ORDER BY year, period
      `,
    );
    const expenseByLabel = new Map<string, number>();
    for (const r of expenseRows) expenseByLabel.set(bucketLabel(r.year, r.period, groupBy), r.total);

    const labels = new Set<string>([...revenueSeries.map((r) => r.month), ...expenseByLabel.keys()]);
    return [...labels].map((label) => {
      const revenue = revenueSeries.find((r) => r.month === label)?.revenue ?? 0;
      const expenses = Math.round(expenseByLabel.get(label) ?? 0);
      return { period: label, revenue, expenses, profit: Math.round(revenue - expenses) };
    });
  }

  /** Outstanding invoice balances bucketed by how overdue they are. */
  async getArAging(params: ReportParams, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const invoices = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: { in: ['sent', 'partially_paid', 'overdue'] },
        ...scopeWhere,
        ...(params.ownerId ? { createdById: params.ownerId } : {}),
      },
      select: { total: true, totalPaid: true, currency: true, dueDate: true },
    });
    const buckets = [
      { bucket: 'Current', min: -Infinity, max: 0, total: 0, count: 0 },
      { bucket: '1-30', min: 0, max: 30, total: 0, count: 0 },
      { bucket: '31-60', min: 30, max: 60, total: 0, count: 0 },
      { bucket: '61-90', min: 60, max: 90, total: 0, count: 0 },
      { bucket: '90+', min: 90, max: Infinity, total: 0, count: 0 },
    ];
    const now = Date.now();
    for (const inv of invoices) {
      const outstanding = Number(inv.total) - Number(inv.totalPaid);
      if (outstanding <= 0) continue;
      const base = await this.currency.toBase(outstanding, inv.currency);
      const daysOverdue = inv.dueDate ? (now - inv.dueDate.getTime()) / 86_400_000 : 0;
      const target = buckets.find((b) => daysOverdue > b.min && daysOverdue <= b.max) ?? buckets[0];
      target.total += base;
      target.count += 1;
    }
    return buckets.map((b) => ({ bucket: b.bucket, total: Math.round(b.total), count: b.count }));
  }

  /** Top customers by collected revenue (base currency). */
  async getTopCustomers(params: ReportParams, user: AuthUser, limit = 10) {
    const { range } = params;
    const dateClause =
      range?.gte && range?.lte
        ? Prisma.sql`AND p.date >= ${range.gte}::timestamp AND p.date <= ${range.lte}::timestamp`
        : Prisma.sql``;
    const scope = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const ownerClause = ownerScopeSql(scope, 'createdById', Prisma.sql`i."createdById"`);
    const rows = await this.prisma.$queryRaw<{ customerId: string; name: string; currency: string; revenue: number }[]>(
      Prisma.sql`
        SELECT c.id AS "customerId", c.name AS name, p.currency AS currency,
               ROUND(SUM(p.amount)::numeric, 2)::float AS revenue
        FROM "InvoicePayment" p
        JOIN "Invoice" i ON i.id = p."invoiceId"
        JOIN "Customer" c ON c.id = i."customerId"
        WHERE i."deletedAt" IS NULL
        ${dateClause}
        ${ownerClause}
        GROUP BY c.id, c.name, p.currency
      `,
    );
    const byCustomer = new Map<string, { customerId: string; name: string; revenue: number }>();
    for (const r of rows) {
      const base = await this.currency.toBase(r.revenue, r.currency);
      const acc = byCustomer.get(r.customerId) ?? { customerId: r.customerId, name: r.name, revenue: 0 };
      acc.revenue += base;
      byCustomer.set(r.customerId, acc);
    }
    return [...byCustomer.values()]
      .map((c) => ({ ...c, revenue: Math.round(c.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /** Approved expense totals per period. */
  async getExpenseTrend(params: ReportParams, user: AuthUser) {
    const { range, groupBy } = params;
    const scope = await this.visibility.ownershipWhere(user, 'expenses', 'userId');
    const ownerClause = ownerScopeSql(scope, 'userId', Prisma.sql`er."userId"`);
    const ownerEq = ownerEqSql(params.ownerId, Prisma.sql`er."userId"`);
    const dateClause =
      range?.gte && range?.lte
        ? Prisma.sql`AND ei.date >= ${range.gte}::timestamp AND ei.date <= ${range.lte}::timestamp`
        : Prisma.sql``;
    const rows = await this.prisma.$queryRaw<{ year: number; period: number; total: number }[]>(
      Prisma.sql`
        SELECT
          ${periodSelect(Prisma.sql`ei.date`, groupBy)},
          ROUND(SUM(ei.amount)::numeric, 2)::float AS total
        FROM "ExpenseItem" ei
        JOIN "ExpenseReport" er ON er.id = ei."expenseReportId"
        WHERE er."deletedAt" IS NULL AND er."approvalStatus"::text = 'approved'
        ${dateClause}
        ${ownerClause}
        ${ownerEq}
        GROUP BY year, period
        ORDER BY year, period
      `,
    );
    return rows.map((r) => ({ period: bucketLabel(r.year, r.period, groupBy), total: Math.round(r.total) }));
  }

  // ════════════════════════════════════════════════════════════════════════
  // New analytics — Operations
  // ════════════════════════════════════════════════════════════════════════

  /** Top products by quantity sold and revenue from invoice line items. */
  async getTopProducts(params: ReportParams, user: AuthUser, limit = 10) {
    const { range } = params;
    const dateClause =
      range?.gte && range?.lte
        ? Prisma.sql`AND i."issueDate" >= ${range.gte}::timestamp AND i."issueDate" <= ${range.lte}::timestamp`
        : Prisma.sql``;
    const scope = await this.visibility.ownershipWhere(user, 'finance', 'createdById');
    const ownerClause = ownerScopeSql(scope, 'createdById', Prisma.sql`i."createdById"`);
    const rows = await this.prisma.$queryRaw<{ productId: string; name: string; currency: string; qty: number; revenue: number }[]>(
      Prisma.sql`
        SELECT li."productId" AS "productId",
               COALESCE(pr.name, li.description) AS name,
               i.currency AS currency,
               SUM(li.quantity)::float AS qty,
               ROUND(SUM(li.total)::numeric, 2)::float AS revenue
        FROM "InvoiceLineItem" li
        JOIN "Invoice" i ON i.id = li."invoiceId"
        LEFT JOIN "Product" pr ON pr.id = li."productId"
        WHERE i."deletedAt" IS NULL
        ${dateClause}
        ${ownerClause}
        GROUP BY li."productId", COALESCE(pr.name, li.description), i.currency
      `,
    );
    const byProduct = new Map<string, { productId: string | null; name: string; qty: number; revenue: number }>();
    for (const r of rows) {
      const key = r.productId ?? r.name;
      const base = await this.currency.toBase(r.revenue, r.currency);
      const acc = byProduct.get(key) ?? { productId: r.productId ?? null, name: r.name, qty: 0, revenue: 0 };
      acc.qty += r.qty;
      acc.revenue += base;
      byProduct.set(key, acc);
    }
    return [...byProduct.values()]
      .map((p) => ({ ...p, qty: Math.round(p.qty), revenue: Math.round(p.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /** On-hand stock valuation snapshot and low-stock count. */
  async getInventoryValuation() {
    const items = await this.prisma.stockItem.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: { quantityOnHand: 'desc' },
    });
    let lowStock = 0;
    const products = items.map((s) => {
      const low = s.quantityOnHand <= s.reorderLevel;
      if (low) lowStock += 1;
      return {
        productId: s.productId,
        name: s.product?.name ?? s.productId,
        quantityOnHand: s.quantityOnHand,
        reorderLevel: s.reorderLevel,
        location: s.location,
        lowStock: low,
      };
    });
    return { totalProducts: items.length, lowStock, products };
  }

  /** Task throughput per period: created, completed, and overdue counts. */
  async getTaskStats(params: ReportParams, user: AuthUser) {
    const { range, groupBy, ownerId } = params;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'tasks', 'assignedToId');
    const dateClause = range?.gte && range?.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {};
    const tasks = await this.prisma.task.findMany({
      where: { deletedAt: null, ...scopeWhere, ...(ownerId ? { assignedToId: ownerId } : {}), ...dateClause },
      select: { status: true, createdAt: true, completedAt: true, dueDate: true },
    });
    const byLabel = new Map<string, { period: string; created: number; completed: number; overdue: number }>();
    const now = Date.now();
    for (const t of tasks) {
      const label = bucketLabel(
        t.createdAt.getFullYear(),
        groupBy === 'year' ? 1 : groupBy === 'quarter' ? Math.floor(t.createdAt.getMonth() / 3) + 1 : t.createdAt.getMonth() + 1,
        groupBy,
      );
      const acc = byLabel.get(label) ?? { period: label, created: 0, completed: 0, overdue: 0 };
      acc.created += 1;
      if (t.status === 'done' || t.completedAt) acc.completed += 1;
      else if (t.dueDate && t.dueDate.getTime() < now) acc.overdue += 1;
      byLabel.set(label, acc);
    }
    return [...byLabel.values()];
  }
}
