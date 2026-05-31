import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { toClient } from '../common/serialize';

const LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async search(q: string, user: AuthUser) {
    if (!q || q.length < 2) {
      return { customers: [], deals: [], products: [], expenses: [], invoices: [] };
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const [customerScope, dealScope, expenseScope, invoiceScope] = await Promise.all([
      this.visibility.ownershipWhere(user, 'contacts', 'ownerId'),
      this.visibility.ownershipWhere(user, 'deals', 'ownerId'),
      this.visibility.ownershipWhere(user, 'expenses', 'userId'),
      this.visibility.ownershipWhere(user, 'finance', 'createdById'),
    ]);

    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null, ...customerScope, OR: [{ name: contains }, { email: contains }, { phone: contains }] },
      select: { id: true, name: true, email: true, phone: true, status: true },
      take: LIMIT,
    });
    const customerIds = customers.map((c) => c.id);

    const [deals, products, expenses, invoices] = await Promise.all([
      this.prisma.deal.findMany({
        where: {
          deletedAt: null,
          ...dealScope,
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
        where: { deletedAt: null, OR: [{ name: contains }, { type: contains }, { description: contains }] },
        select: { id: true, name: true, type: true },
        take: LIMIT,
      }),
      this.prisma.expenseReport.findMany({
        where: { deletedAt: null, ...expenseScope, OR: [{ title: contains }] },
        select: { id: true, title: true, approvalStatus: true, createdAt: true },
        take: LIMIT,
      }),
      this.prisma.invoice.findMany({
        where: { deletedAt: null, ...invoiceScope, OR: [{ invoiceNumber: contains }, { title: contains }] },
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
