import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { ApprovalService } from '../common/approval.service';
import { CustomFieldsService } from '../common/custom-fields.service';
import { toClient } from '../common/serialize';
import { UNPAGINATED_MAX } from '../common/paginate';
import { calcTotals } from '../finance/finance.math';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

// Sentinel used to roll back the conversion transaction when a concurrent
// request won the race to invoice the same sales order.
class AlreadyInvoicedError extends Error {}

const SO_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  project: { select: { id: true, name: true } },
  fromQuote: { select: { id: true, quoteNumber: true } },
  items: { orderBy: { order: 'asc' as const } },
  invoices: { select: { id: true, invoiceNumber: true, status: true, total: true } },
};

// Allowed manual status transitions (conversion to `invoiced` is handled
// separately by convertToInvoice).
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['fulfilled', 'cancelled'],
  fulfilled: ['confirmed', 'cancelled'],
  invoiced: [],
  cancelled: [],
};

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
  ) {}

  private async getApprovalConfig(): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === 'salesOrders');
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    if (!approverRoles.length) return false;
    return approverRoles.includes(userRole);
  }

  // Maps the GenericTable column header (sent as `sort`) to a Prisma orderBy.
  // Defaults to newest-first when no/unknown sort is given.
  private resolveOrderBy(sort?: string, dir?: string): Prisma.SalesOrderOrderByWithRelationInput {
    const direction = dir === 'asc' ? 'asc' : 'desc';
    const map: Record<string, string> = {
      'Order Number': 'orderNumber',
      Total: 'total',
      Created: 'createdAt',
    };
    const field = sort ? map[sort] : undefined;
    return field
      ? ({ [field]: direction } as Prisma.SalesOrderOrderByWithRelationInput)
      : { createdAt: 'desc' };
  }

  async getAll(query: Record<string, string>) {
    const { status, customer, deal, page, limit: limitRaw, q } = query;
    const where: Prisma.SalesOrderWhereInput = { deletedAt: null };
    if (status) where.status = status as Prisma.SalesOrderWhereInput['status'];
    if (customer) where.customerId = customer;
    if (deal) where.dealId = deal;
    if (q) where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } },
    ];
    const orderBy = this.resolveOrderBy(query.sort, query.dir);

    if (!page) {
      const orders = await this.prisma.salesOrder.findMany({
        where, include: SO_INCLUDE, orderBy, take: UNPAGINATED_MAX,
      });
      return toClient(orders);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.salesOrder.findMany({ where, include: SO_INCLUDE, orderBy, skip: (p - 1) * limit, take: limit }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, deletedAt: null }, include: SO_INCLUDE });
    if (!order) throw new NotFoundException('Sales order not found');
    return toClient(order);
  }

  async create(body: CreateSalesOrderDto, userId: string) {
    const { items = [], taxRate = 0, customer, deal, project, customFields: rawCf, ...rest } = body;
    const totals = calcTotals(items, taxRate);
    const orderNumber = await this.numberSequence.nextNumber('salesOrder', 'SO');
    const enabled = await this.approvals.isEnabled('salesOrders');
    const customFields = await this.customFields.validateAndClean('salesOrders', rawCf);

    const order = await this.prisma.salesOrder.create({
      data: {
        ...rest,
        ...(customFields !== undefined ? { customFields } : {}),
        orderNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        approvalStatus: enabled ? 'pending' : 'approved',
        ...(rest.expectedDate ? { expectedDate: new Date(rest.expectedDate) } : {}),
        customerId: customer,
        ...(deal ? { dealId: deal } : {}),
        ...(project ? { projectId: project } : {}),
        createdById: userId,
        items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
      } as Prisma.SalesOrderUncheckedCreateInput,
      include: SO_INCLUDE,
    });

    if (enabled) {
      const overall = await this.approvals.initSteps(this.prisma, 'SalesOrder', order.id, 'salesOrders', order.total);
      if (overall === 'approved') {
        await this.prisma.salesOrder.update({ where: { id: order.id }, data: { approvalStatus: 'approved' } });
        (order as { approvalStatus: string }).approvalStatus = 'approved';
      }
    }
    await this.timeline.log('salesOrder.created', `Sales order ${order.orderNumber} created`, order.id, 'SalesOrder', { total: order.total, currency: order.currency }, userId);
    return toClient(order);
  }

  async update(id: string, body: UpdateSalesOrderDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (['invoiced', 'cancelled'].includes(order.status)) {
      throw new BadRequestException(`A ${order.status} sales order cannot be edited`);
    }
    const { items, taxRate, customer: _customer, deal: _deal, project: _project, expectedDate, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (expectedDate !== undefined) data.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'salesOrders',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    if (order.approvalStatus === 'rejected') data.approvalStatus = 'pending';
    // Post-approval edits reset the document back to pending for re-review.
    if (items && order.approvalStatus === 'approved') data.approvalStatus = 'pending';

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        const tr = taxRate !== undefined ? taxRate : order.taxRate;
        const totals = calcTotals(items, tr);
        await tx.salesOrderLineItem.deleteMany({ where: { salesOrderId: id } });
        data.taxRate = tr;
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.items = { create: totals.items.map((it, idx) => ({ ...it, order: idx })) };
      } else if (taxRate !== undefined) {
        data.taxRate = taxRate;
      }
      return tx.salesOrder.update({
        where: { id },
        data: data as Prisma.SalesOrderUncheckedUpdateInput,
        include: SO_INCLUDE,
      });
    });
    return toClient(updated);
  }

  async updateStatus(id: string, status: string, userId: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, deletedAt: null } });
    if (!order) throw new NotFoundException('Sales order not found');
    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot change a ${order.status} sales order to ${status}`);
    }
    if (status === 'confirmed') {
      const { enabled } = await this.getApprovalConfig();
      if (enabled && order.approvalStatus !== 'approved') {
        throw new BadRequestException('Sales order must be approved before it can be confirmed');
      }
    }
    const updated = await this.prisma.salesOrder.update({ where: { id }, data: { status: status as Prisma.SalesOrderUpdateInput['status'] }, include: SO_INCLUDE });
    await this.timeline.log('salesOrder.status', `Sales order ${order.orderNumber} marked ${status}`, id, 'SalesOrder', { status }, userId);
    return toClient(updated);
  }

  async remove(id: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, deletedAt: null } });
    if (!order) throw new NotFoundException('Sales order not found');
    await this.prisma.salesOrder.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async approve(id: string, userId: string, userRole: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, deletedAt: null } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.approvalStatus === 'approved') return toClient(order);

    const steps = await this.approvals.listSteps('SalesOrder', id);
    if (steps.length) {
      const result = await this.approvals.act('SalesOrder', id, userId, userRole, order.createdById, 'approve');
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.salesOrder.update({
        where: { id },
        data: { approvalStatus: result.status, ...(finalApproved ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null } : {}) },
        include: SO_INCLUDE,
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig();
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to approve sales orders');
    if (order.createdById === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot approve a sales order you created');
    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: SO_INCLUDE,
    });
    return toClient(updated);
  }

  async reject(id: string, userId: string, reason: string, userRole: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, deletedAt: null } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.approvalStatus === 'rejected') return toClient(order);

    const steps = await this.approvals.listSteps('SalesOrder', id);
    if (steps.length) {
      await this.approvals.act('SalesOrder', id, userId, userRole, order.createdById, 'reject', reason);
      const updated = await this.prisma.salesOrder.update({
        where: { id },
        data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
        include: SO_INCLUDE,
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig();
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to reject sales orders');
    if (order.createdById === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot reject a sales order you created');
    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: SO_INCLUDE,
    });
    return toClient(updated);
  }

  /**
   * Generates a draft Invoice from the sales order and marks the SO `invoiced`.
   * Uses an atomic claim (status flip via updateMany) so two concurrent requests
   * can't bill the same order twice. Stock is deducted later when the invoice is
   * sent — matching the existing quote→invoice path — so nothing double-counts.
   */
  async convertToInvoice(id: string, userId: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, deletedAt: null }, include: { items: true } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.status === 'invoiced') throw new BadRequestException('Sales order already invoiced');
    if (order.status === 'cancelled') throw new BadRequestException('A cancelled sales order cannot be invoiced');

    const { enabled } = await this.getApprovalConfig();
    if (enabled && order.approvalStatus !== 'approved') {
      throw new BadRequestException('Sales order must be approved before invoicing');
    }

    const invoiceNumber = await this.numberSequence.nextNumber('invoice', 'INV');
    const invoiceApprovalEnabled = await this.approvals.isEnabled('invoices');

    try {
      const invoice = await this.prisma.$transaction(async (tx) => {
        const created = await tx.invoice.create({
          data: {
            invoiceNumber,
            title: order.title,
            customerId: order.customerId,
            dealId: order.dealId,
            projectId: order.projectId,
            salesOrderId: order.id,
            status: 'draft',
            approvalStatus: invoiceApprovalEnabled ? 'pending' : 'approved',
            subtotal: order.subtotal,
            taxRate: order.taxRate,
            tax: order.tax,
            total: order.total,
            currency: order.currency,
            notes: order.notes,
            terms: order.terms,
            issueDate: new Date(),
            createdById: userId,
            items: {
              create: order.items.map((it) => ({
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                discount: it.discount,
                taxRate: it.taxRate,
                taxCode: it.taxCode,
                productId: it.productId,
                total: it.total,
                order: it.order,
              })),
            },
          },
          include: { customer: { select: { id: true, name: true } } },
        });

        const claim = await tx.salesOrder.updateMany({
          where: { id, status: { notIn: ['invoiced', 'cancelled'] } },
          data: { status: 'invoiced' },
        });
        if (claim.count === 0) throw new AlreadyInvoicedError();
        return created;
      });
      await this.timeline.log('salesOrder.invoiced', `Sales order ${order.orderNumber} invoiced as ${invoice.invoiceNumber}`, id, 'SalesOrder', { invoiceId: invoice.id }, userId);
      return toClient(invoice);
    } catch (e) {
      if (e instanceof AlreadyInvoicedError) throw new BadRequestException('Sales order already invoiced');
      throw e;
    }
  }

  /**
   * Builds (does NOT persist) purchase-order prefill data for the sales order's
   * line items that we can't currently fulfil from stock. Only product-linked
   * lines whose required quantity exceeds quantity-on-hand are returned, with the
   * shortfall as the suggested PO quantity. The frontend opens the PO form with
   * this data; the user picks a supplier and saves.
   */
  async getPurchaseOrderPrefill(id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Sales order not found');

    const items = order.items.map((it) => ({
      description: it.description,
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice, // suggestion only — purchase cost is edited by the user
      discount: 0,
      taxRate: 0,
    }));

    return {
      hasShortfall: items.length > 0,
      title: `Restock for ${order.orderNumber}`,
      currency: order.currency,
      salesOrderId: order.id,
      salesOrderNumber: order.orderNumber,
      items,
    };
  }
}
