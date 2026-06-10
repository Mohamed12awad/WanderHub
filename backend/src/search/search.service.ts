import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { toClient } from '../common/serialize';

const LIMIT = 5;

function can(user: AuthUser, permission: string): boolean {
  return (
    user.permissions.includes('*') ||
    user.permissions.some((p) => p === permission || p.startsWith(`${permission}:`))
  );
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  async search(q: string, user: AuthUser) {
    if (!q || q.length < 2) {
      return { customers: [], deals: [], leads: [], products: [], expenses: [], invoices: [], quotes: [], salesOrders: [], purchaseOrders: [], vendorBills: [], projects: [], tasks: [] };
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const [customerScope, dealScope, expenseScope, invoiceScope, leadScope, quoteScope, salesOrderScope, poScope, billScope, projectScope, taskScope] = await Promise.all([
      can(user, 'contacts:view')   ? this.visibility.ownershipWhere(user, 'contacts',   'ownerId')      : Promise.resolve({}),
      can(user, 'deals:view')      ? this.visibility.ownershipWhere(user, 'deals',       'ownerId')      : Promise.resolve({}),
      can(user, 'expenses:view')   ? this.visibility.ownershipWhere(user, 'expenses',    'userId')       : Promise.resolve({}),
      can(user, 'finance:view')    ? this.visibility.ownershipWhere(user, 'finance',     'createdById')  : Promise.resolve({}),
      can(user, 'leads:view')      ? this.visibility.ownershipWhere(user, 'leads',       'ownerId')      : Promise.resolve({}),
      can(user, 'quotes:view')     ? this.visibility.ownershipWhere(user, 'quotes',      'createdById')  : Promise.resolve({}),
      can(user, 'sales:view')      ? this.visibility.ownershipWhere(user, 'sales',       'createdById')  : Promise.resolve({}),
      can(user, 'procurement:view') ? this.visibility.ownershipWhere(user, 'procurement', 'createdById') : Promise.resolve({}),
      can(user, 'procurement:view') ? this.visibility.ownershipWhere(user, 'procurement', 'createdById') : Promise.resolve({}),
      can(user, 'projects:view')   ? this.visibility.ownershipWhere(user, 'projects',   'managerId')    : Promise.resolve({}),
      can(user, 'tasks:view')      ? this.visibility.ownershipWhere(user, 'tasks',       'assignedToId') : Promise.resolve({}),
    ]);

    const customers = can(user, 'contacts:view')
      ? await this.prisma.customer.findMany({
          where: { deletedAt: null, ...customerScope, OR: [{ name: contains }, { email: contains }, { phone: contains }] },
          select: { id: true, name: true, email: true, phone: true, status: true },
          take: LIMIT,
        })
      : [];
    const customerIds = customers.map((c) => c.id);

    const [deals, leads, products, expenses, invoices, quotes, salesOrders, purchaseOrders, vendorBills, projects, tasks] = await Promise.all([
      can(user, 'deals:view')
        ? this.prisma.deal.findMany({
            where: { deletedAt: null, ...dealScope, OR: [{ title: contains }, { notes: contains }, { source: contains }, { customerId: { in: customerIds } }] },
            select: { id: true, title: true, status: true, price: true, currency: true, customer: { select: { id: true, name: true } } },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'leads:view')
        ? this.prisma.lead.findMany({
            where: { deletedAt: null, ...leadScope, OR: [{ name: contains }, { email: contains }, { phone: contains }, { company: contains }] },
            select: { id: true, name: true, email: true, phone: true, status: true, company: true },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'products:view')
        ? this.prisma.product.findMany({
            where: { deletedAt: null, OR: [{ name: contains }, { type: contains }, { description: contains }] },
            select: { id: true, name: true, type: true },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'expenses:view')
        ? this.prisma.expenseReport.findMany({
            where: { deletedAt: null, ...expenseScope, OR: [{ title: contains }] },
            select: { id: true, title: true, approvalStatus: true, createdAt: true },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'finance:view')
        ? this.prisma.invoice.findMany({
            where: { deletedAt: null, ...invoiceScope, OR: [{ invoiceNumber: contains }, { title: contains }] },
            select: { id: true, invoiceNumber: true, title: true, status: true, total: true, currency: true, customer: { select: { id: true, name: true } } },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'quotes:view')
        ? this.prisma.quote.findMany({
            where: { deletedAt: null, ...quoteScope, OR: [{ quoteNumber: contains }, { title: contains }] },
            select: { id: true, quoteNumber: true, title: true, status: true, total: true, currency: true, customer: { select: { id: true, name: true } } },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'sales:view')
        ? this.prisma.salesOrder.findMany({
            where: { deletedAt: null, ...salesOrderScope, OR: [{ orderNumber: contains }, { title: contains }] },
            select: { id: true, orderNumber: true, title: true, status: true, total: true, currency: true, customer: { select: { id: true, name: true } } },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'procurement:view')
        ? this.prisma.purchaseOrder.findMany({
            where: { deletedAt: null, ...poScope, OR: [{ poNumber: contains }, { title: contains }] },
            select: { id: true, poNumber: true, title: true, status: true, total: true, currency: true, supplier: { select: { id: true, name: true } } },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'procurement:view')
        ? this.prisma.vendorBill.findMany({
            where: { deletedAt: null, ...billScope, OR: [{ billNumber: contains }, { title: contains }] },
            select: { id: true, billNumber: true, title: true, status: true, total: true, currency: true, supplier: { select: { id: true, name: true } } },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'projects:view')
        ? this.prisma.project.findMany({
            where: { deletedAt: null, ...projectScope, OR: [{ name: contains }, { description: contains }] },
            select: { id: true, name: true, status: true, priority: true },
            take: LIMIT,
          })
        : Promise.resolve([]),
      can(user, 'tasks:view')
        ? this.prisma.task.findMany({
            where: { deletedAt: null, ...taskScope, OR: [{ title: contains }, { description: contains }] },
            select: { id: true, title: true, status: true, priority: true },
            take: LIMIT,
          })
        : Promise.resolve([]),
    ]);

    return {
      customers: toClient(customers),
      deals: toClient(deals),
      leads: toClient(leads),
      products: toClient(products),
      expenses: toClient(expenses),
      invoices: toClient(invoices),
      quotes: toClient(quotes),
      salesOrders: toClient(salesOrders),
      purchaseOrders: toClient(purchaseOrders),
      vendorBills: toClient(vendorBills),
      projects: toClient(projects),
      tasks: toClient(tasks),
    };
  }
}
