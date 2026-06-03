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
      return { customers: [], deals: [], leads: [], products: [], expenses: [], invoices: [], quotes: [], purchaseOrders: [], vendorBills: [], projects: [], tasks: [] };
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const [customerScope, dealScope, expenseScope, invoiceScope, leadScope] = await Promise.all([
      this.visibility.ownershipWhere(user, 'contacts', 'ownerId'),
      this.visibility.ownershipWhere(user, 'deals', 'ownerId'),
      this.visibility.ownershipWhere(user, 'expenses', 'userId'),
      this.visibility.ownershipWhere(user, 'finance', 'createdById'),
      this.visibility.ownershipWhere(user, 'leads', 'ownerId'),
    ]);

    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null, ...customerScope, OR: [{ name: contains }, { email: contains }, { phone: contains }] },
      select: { id: true, name: true, email: true, phone: true, status: true },
      take: LIMIT,
    });
    const customerIds = customers.map((c) => c.id);

    const [deals, leads, products, expenses, invoices, quotes, purchaseOrders, vendorBills, projects, tasks] = await Promise.all([
      this.prisma.deal.findMany({
        where: {
          deletedAt: null,
          ...dealScope,
          OR: [{ title: contains }, { notes: contains }, { source: contains }, { customerId: { in: customerIds } }],
        },
        select: { id: true, title: true, status: true, price: true, currency: true, customer: { select: { id: true, name: true } } },
        take: LIMIT,
      }),
      this.prisma.lead.findMany({
        where: { deletedAt: null, ...leadScope, OR: [{ name: contains }, { email: contains }, { phone: contains }, { company: contains }] },
        select: { id: true, name: true, email: true, phone: true, status: true, company: true },
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
      this.prisma.quote.findMany({
        where: { deletedAt: null, OR: [{ quoteNumber: contains }, { title: contains }] },
        select: { id: true, quoteNumber: true, title: true, status: true, total: true, currency: true, customer: { select: { id: true, name: true } } },
        take: LIMIT,
      }),
      this.prisma.purchaseOrder.findMany({
        where: { deletedAt: null, OR: [{ poNumber: contains }, { title: contains }] },
        select: { id: true, poNumber: true, title: true, status: true, total: true, currency: true, supplier: { select: { id: true, name: true } } },
        take: LIMIT,
      }),
      this.prisma.vendorBill.findMany({
        where: { deletedAt: null, OR: [{ billNumber: contains }, { title: contains }] },
        select: { id: true, billNumber: true, title: true, status: true, total: true, currency: true, supplier: { select: { id: true, name: true } } },
        take: LIMIT,
      }),
      this.prisma.project.findMany({
        where: { deletedAt: null, OR: [{ name: contains }, { description: contains }] },
        select: { id: true, name: true, status: true, priority: true },
        take: LIMIT,
      }),
      this.prisma.task.findMany({
        where: { deletedAt: null, OR: [{ title: contains }, { description: contains }] },
        select: { id: true, title: true, status: true, priority: true },
        take: LIMIT,
      }),
    ]);

    return {
      customers: toClient(customers),
      deals: toClient(deals),
      leads: toClient(leads),
      products: toClient(products),
      expenses: toClient(expenses),
      invoices: toClient(invoices),
      quotes: toClient(quotes),
      purchaseOrders: toClient(purchaseOrders),
      vendorBills: toClient(vendorBills),
      projects: toClient(projects),
      tasks: toClient(tasks),
    };
  }
}
