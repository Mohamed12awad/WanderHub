import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

const LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.length < 2) {
      return { customers: [], deals: [], products: [], expenses: [], invoices: [] };
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const customers = await this.prisma.customer.findMany({
      where: { OR: [{ name: contains }, { email: contains }, { phone: contains }] },
      select: { id: true, name: true, email: true, phone: true, status: true },
      take: LIMIT,
    });
    const customerIds = customers.map((c) => c.id);

    const [deals, products, expenses, invoices] = await Promise.all([
      this.prisma.deal.findMany({
        where: {
          OR: [
            { title: contains },
            { notes: contains },
            { source: contains },
            { customerId: { in: customerIds } },
          ],
        },
        select: { id: true, title: true, status: true, price: true, currency: true, customer: { select: { id: true, name: true } } },
        take: LIMIT,
      }),
      this.prisma.product.findMany({
        where: { OR: [{ name: contains }, { type: contains }, { description: contains }] },
        select: { id: true, name: true, type: true },
        take: LIMIT,
      }),
      this.prisma.expenseReport.findMany({
        where: { OR: [{ title: contains }] },
        select: { id: true, title: true, approved: true, createdAt: true },
        take: LIMIT,
      }),
      this.prisma.invoice.findMany({
        where: { OR: [{ invoiceNumber: contains }, { title: contains }] },
        select: { id: true, invoiceNumber: true, title: true, status: true, total: true, currency: true, customer: { select: { id: true, name: true } } },
        take: LIMIT,
      }),
    ]);

    return {
      customers: toClient(customers),
      deals: toClient(deals),
      products: toClient(products),
      expenses: toClient(expenses),
      invoices: toClient(invoices),
    };
  }
}
