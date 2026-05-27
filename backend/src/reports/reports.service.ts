import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccountingReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const [deals, purchases, expenses] = await Promise.all([
      this.prisma.deal.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { customer: true, product: true },
      }),
      this.prisma.purchase.findMany({ where: { createdAt: { gte: start, lte: end } } }),
      this.prisma.expenseReport.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { expenses: true },
      }),
    ]);
    return toClient({ bookings: deals, purchases, expenses });
  }

  async getBookingReport(startDate: string, endDate: string, location?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const deals = await this.prisma.deal.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(location ? { customer: { location } } : {}),
      },
      include: { customer: true, product: true },
    });
    return toClient(deals);
  }

  async getRevenueByMonth(query: Record<string, string>) {
    const range = parseDateRange(query);
    const whereClause = range
      ? Prisma.sql`WHERE date >= ${range.gte!}::timestamp AND date <= ${range.lte!}::timestamp`
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<{ year: number; month: number; revenue: number; count: number }[]>(
      Prisma.sql`
        SELECT
          EXTRACT(YEAR FROM date)::int AS year,
          EXTRACT(MONTH FROM date)::int AS month,
          ROUND(SUM(amount)::numeric, 2)::float AS revenue,
          COUNT(*)::int AS count
        FROM "InvoicePayment"
        ${whereClause}
        GROUP BY year, month
        ORDER BY year, month
      `,
    );
    return rows.map((r) => ({ month: toMonthLabel(r.year, r.month), revenue: r.revenue, count: r.count }));
  }

  async getPipelineFunnel() {
    const rows = await this.prisma.deal.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { price: true },
    });
    const map = Object.fromEntries(rows.map((r) => [r.status, r]));
    return STAGES.map((s) => ({
      stage: s,
      count: map[s]?._count?.id ?? 0,
      value: Math.round(map[s]?._sum?.price ?? 0),
    }));
  }

  async getExpensesByCategory(query: Record<string, string>) {
    const range = parseDateRange(query);
    const rows = await this.prisma.expenseItem.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: { id: true },
      where: range ? { date: range } : undefined,
      orderBy: { _sum: { amount: 'desc' } },
    });
    return rows.map((r) => ({
      category: r.category || 'uncategorized',
      total: Math.round(r._sum.amount ?? 0),
      count: r._count.id,
    }));
  }

  async getOutstandingInvoices() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['sent', 'partially_paid', 'overdue'] } },
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
      total: inv.total,
      totalPaid: inv.totalPaid,
      outstanding: inv.total - inv.totalPaid,
      dueDate: inv.dueDate,
      status: inv.status,
      currency: inv.currency,
    }));
  }

  async getCustomerAcquisition(query: Record<string, string>) {
    const range = parseDateRange(query);
    const whereClause = range
      ? Prisma.sql`WHERE "createdAt" >= ${range.gte!}::timestamp AND "createdAt" <= ${range.lte!}::timestamp`
      : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<{ year: number; month: number; count: number }[]>(
      Prisma.sql`
        SELECT
          EXTRACT(YEAR FROM "createdAt")::int AS year,
          EXTRACT(MONTH FROM "createdAt")::int AS month,
          COUNT(*)::int AS count
        FROM "Customer"
        ${whereClause}
        GROUP BY year, month
        ORDER BY year, month
      `,
    );
    return rows.map((r) => ({ month: toMonthLabel(r.year, r.month), customers: r.count }));
  }
}
