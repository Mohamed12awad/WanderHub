import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { calcTotals } from './finance.math';
import { ApprovalService } from '../common/approval.service';
import { CustomFieldsService } from '../common/custom-fields.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { dateRange, UNPAGINATED_MAX } from '../common/paginate';

// Sentinel used to roll back the conversion transaction when a concurrent
// request won the race to convert the same quote.
class AlreadyConvertedError extends Error {}

const QUOTE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  items: { orderBy: { order: 'asc' as const } },
  convertedToInvoice: { select: { id: true, invoiceNumber: true } },
  salesOrder: { select: { id: true, orderNumber: true } },
  updatedBy: { select: { id: true, name: true } },
};

// The invoice returned by conversion now carries InvoicesService's own include
// (a superset of the old local one), since conversion routes through the shared
// creation path.

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
    private readonly visibility: VisibilityService,
    private readonly invoices: InvoicesService,
  ) {}

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string, permissions: string[]): boolean {
    if (permissions.includes('*')) return true;
    // Empty approverRoles with approvals enabled means admins-only; don't let anyone through.
    if (!approverRoles.length) return false;
    return approverRoles.includes(userRole);
  }

  private resolveOrderBy(sort?: string, dir?: string): Prisma.QuoteOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const fields = {
      quoteNumber: 'quoteNumber',
      total: 'total',
      validUntil: 'validUntil',
      createdAt: 'createdAt',
    } as const;
    const field = fields[sort as keyof typeof fields];
    if (!field) throw new BadRequestException(`Unsupported quote sort field: ${sort}`);
    if (dir && dir !== 'asc' && dir !== 'desc') throw new BadRequestException(`Unsupported sort direction: ${dir}`);
    return { [field]: dir === 'asc' ? 'asc' : 'desc' } as Prisma.QuoteOrderByWithRelationInput;
  }

  private parseListNumber(value: string, field: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new BadRequestException(`Invalid numeric filter: ${field}`);
    return parsed;
  }

  async getQuotes(query: Record<string, string>, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'quotes', 'createdById');
    const where: Prisma.QuoteWhereInput = { deletedAt: null, ...scopeWhere };
    if (query.status) where.status = query.status as Prisma.QuoteWhereInput['status'];
    if (query.customer) where.customerId = query.customer;
    if (query.deal) where.dealId = query.deal;
    if (query.q) where.OR = [
      { quoteNumber: { contains: query.q, mode: 'insensitive' } },
      { title: { contains: query.q, mode: 'insensitive' } },
      { customer: { name: { contains: query.q, mode: 'insensitive' } } },
      { deal: { title: { contains: query.q, mode: 'insensitive' } } },
    ];
    if (query.currency) where.currency = query.currency;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus as Prisma.QuoteWhereInput['approvalStatus'];
    if (query.total_min || query.total_max) {
      const range: { gte?: number; lte?: number } = {};
      if (query.total_min) range.gte = this.parseListNumber(query.total_min, 'total_min');
      if (query.total_max) range.lte = this.parseListNumber(query.total_max, 'total_max');
      where.total = range;
    }
    const validUntilRange = dateRange(query.validUntil_from, query.validUntil_to);
    if (validUntilRange) where.validUntil = validUntilRange;
    const createdAtRange = dateRange(query.createdAt_from, query.createdAt_to);
    if (createdAtRange) where.createdAt = createdAtRange;
    const orderBy = this.resolveOrderBy(query.sort, query.dir);

    if (!query.page) {
      const quotes = await this.prisma.quote.findMany({
        where, include: QUOTE_INCLUDE, orderBy, take: UNPAGINATED_MAX,
      });
      return toClient(quotes);
    }
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 25);
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where, include: QUOTE_INCLUDE, orderBy, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);
    return { data: toClient(data), total, page, pages: Math.ceil(total / limit) };
  }

  async getQuoteById(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'quotes', 'createdById');
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null, ...scopeWhere }, include: QUOTE_INCLUDE });
    return quote ? toClient(quote) : null;
  }

  async createQuote(body: CreateQuoteDto, userId: string) {
    const { items = [], taxRate = 0, customer, deal, customFields: rawCf, ...rest } = body;
    const totals = calcTotals(items, taxRate);
    const quoteNumber = await this.numberSequence.nextNumber('quote', 'QUO');
    const enabled = await this.approvals.isEnabled('quotes');
    const customFields = await this.customFields.validateAndClean('quotes', rawCf);
    const quote = await this.prisma.quote.create({
      data: {
        ...rest,
        ...(customFields !== undefined ? { customFields } : {}),
        quoteNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        approvalStatus: enabled ? 'pending' : 'approved',
        customerId: customer,
        ...(deal ? { dealId: deal } : {}),
        createdById: userId,
        items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
      } as Prisma.QuoteUncheckedCreateInput,
      include: QUOTE_INCLUDE,
    });
    if (enabled) {
      const overall = await this.approvals.initSteps(this.prisma, 'Quote', quote.id, 'quotes', Number(quote.total));
      if (overall === 'approved') {
        await this.prisma.quote.update({ where: { id: quote.id }, data: { approvalStatus: 'approved' } });
        (quote as { approvalStatus: string }).approvalStatus = 'approved';
      }
    }
    await this.timeline.log('quote.created', `Quote ${quote.quoteNumber} created`, quote.id, 'Quote', { total: quote.total, currency: quote.currency }, userId);
    return toClient(quote);
  }

  async updateQuote(id: string, body: UpdateQuoteDto, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'quotes', 'createdById');
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!quote) throw new NotFoundException('Quote not found');
    // customer/deal are extracted to keep them out of `rest`; the update path
    // intentionally does not reassign them. The DTO has already stripped any
    // server-controlled fields, so `rest` is safe to spread.
    const { items, taxRate, customer: _customer, deal: _deal, validUntil, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'quotes',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    if (quote.approvalStatus === 'rejected') data.approvalStatus = 'pending';
    // Post-approval edits reset the document back to pending for re-review.
    if (items && quote.approvalStatus === 'approved') data.approvalStatus = 'pending';

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        const tr = taxRate !== undefined ? taxRate : quote.taxRate;
        const totals = calcTotals(items, tr);
        // Replace line items atomically with the recomputed totals.
        await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
        data.taxRate = tr;
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.items = { create: totals.items.map((it, idx) => ({ ...it, order: idx })) };
      } else if (taxRate !== undefined) {
        data.taxRate = taxRate;
      }
      return tx.quote.update({
        where: { id },
        data: data as Prisma.QuoteUncheckedUpdateInput,
        include: QUOTE_INCLUDE,
      });
    });
    return toClient(updated);
  }

  async approveQuote(id: string, userId: string, userRole: string, userPermissions: string[] = []) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.approvalStatus === 'approved') return toClient(quote);

    const steps = await this.approvals.listSteps('Quote', id);
    if (steps.length) {
      const result = await this.approvals.act('Quote', id, userId, userRole, quote.createdById, 'approve', undefined, userPermissions);
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.quote.update({
        where: { id },
        data: { approvalStatus: result.status, ...(finalApproved ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null } : {}) },
        include: QUOTE_INCLUDE,
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('quotes');
    if (!this.canUserApprove(approverRoles, userRole, userPermissions)) throw new ForbiddenException('You are not authorized to approve quotes');
    if (quote.createdById === userId && !userPermissions.includes('*')) throw new ForbiddenException('You cannot approve a quote you created');
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: QUOTE_INCLUDE,
    });
    return toClient(updated);
  }

  async rejectQuote(id: string, userId: string, reason: string, userRole: string, userPermissions: string[] = []) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.approvalStatus === 'rejected') return toClient(quote);

    const steps = await this.approvals.listSteps('Quote', id);
    if (steps.length) {
      await this.approvals.act('Quote', id, userId, userRole, quote.createdById, 'reject', reason, userPermissions);
      const updated = await this.prisma.quote.update({
        where: { id },
        data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
        include: QUOTE_INCLUDE,
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('quotes');
    if (!this.canUserApprove(approverRoles, userRole, userPermissions)) throw new ForbiddenException('You are not authorized to reject quotes');
    if (quote.createdById === userId && !userPermissions.includes('*')) throw new ForbiddenException('You cannot reject a quote you created');
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: QUOTE_INCLUDE,
    });
    return toClient(updated);
  }

  async deleteQuote(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'quotes', 'createdById');
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!quote) throw new NotFoundException('Quote not found');
    await this.prisma.quote.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async convertQuoteToInvoice(id: string, userId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.convertedToInvoiceId) throw new BadRequestException('Quote already converted to invoice');

    const { enabled: quotesApprovalEnabled } = await this.getApprovalConfig('quotes');
    if (quotesApprovalEnabled && quote.approvalStatus !== 'approved') {
      throw new BadRequestException('Quote must be approved before conversion to invoice');
    }

    const invoiceNumber = await this.numberSequence.nextNumber('invoice', 'INV');
    const { enabled: invoiceApprovalEnabled } = await this.getApprovalConfig('invoices');

    try {
      const invoice = await this.prisma.$transaction(async (tx) => {
        // Atomically claim the quote: only the first converter flips
        // convertedToInvoiceId from null. A concurrent request updating 0 rows
        // means it was already converted — bail out.
        // Audit 2026-08 (P0): this used to write the invoice row directly and
        // post nothing, so with invoice approvals disabled a converted quote
        // produced an APPROVED invoice carrying no AR, revenue, tax, stock
        // movement or COGS — revenue simply missing from the books. Routed
        // through the shared creation path so conversion has identical
        // financial effects to creating the invoice normally. It runs on this
        // transaction, so the claim below still rolls everything back on a
        // lost race.
        const created = await this.invoices.createInvoiceInTx(tx, {
          data: {
            invoiceNumber,
            title: quote.title,
            customerId: quote.customerId,
            dealId: quote.dealId,
            status: 'draft',
            approvalStatus: invoiceApprovalEnabled ? 'pending' : 'approved',
            subtotal: quote.subtotal,
            taxRate: quote.taxRate,
            tax: quote.tax,
            total: quote.total,
            currency: quote.currency,
            notes: quote.notes,
            terms: quote.terms,
            issueDate: new Date(),
            createdById: userId,
            items: {
              create: quote.items.map((it) => ({
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
          } as Prisma.InvoiceUncheckedCreateInput,
          lineItems: quote.items,
          approvalsEnabled: invoiceApprovalEnabled,
          userId,
        });

        const claim = await tx.quote.updateMany({
          where: { id, convertedToInvoiceId: null },
          data: { convertedToInvoiceId: created.id, status: 'accepted' },
        });
        if (claim.count === 0) {
          // Lost the race; abort so the just-created invoice is rolled back.
          throw new AlreadyConvertedError();
        }
        return created;
      });
      return toClient(invoice);
    } catch (e) {
      if (e instanceof AlreadyConvertedError) throw new BadRequestException('Quote already converted to invoice');
      throw e;
    }
  }

  /**
   * Converts a quote into a Sales Order. The SO's unique `fromQuoteId` is the
   * concurrency claim: two requests racing to convert the same quote both try to
   * create an SO with the same `fromQuoteId`, and the loser hits the unique
   * constraint (surfaced as 409 by the global filter). The direct
   * quote→invoice path remains available and untouched.
   */
  async convertQuoteToSalesOrder(id: string, userId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null },
      include: { items: true, salesOrder: { select: { id: true, orderNumber: true } } },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.salesOrder) throw new BadRequestException('Quote already converted to a sales order');

    const { enabled: quotesApprovalEnabled } = await this.getApprovalConfig('quotes');
    if (quotesApprovalEnabled && quote.approvalStatus !== 'approved') {
      throw new BadRequestException('Quote must be approved before conversion to a sales order');
    }

    const orderNumber = await this.numberSequence.nextNumber('salesOrder', 'SO');
    const { enabled: soApprovalEnabled } = await this.getApprovalConfig('salesOrders');

    const order = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        title: quote.title,
        customerId: quote.customerId,
        dealId: quote.dealId,
        fromQuoteId: quote.id,
        status: 'draft',
        approvalStatus: soApprovalEnabled ? 'pending' : 'approved',
        subtotal: quote.subtotal,
        taxRate: quote.taxRate,
        tax: quote.tax,
        total: quote.total,
        currency: quote.currency,
        notes: quote.notes,
        terms: quote.terms,
        createdById: userId,
        items: {
          create: quote.items.map((it) => ({
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

    // Mark the quote accepted, mirroring the quote→invoice conversion.
    await this.prisma.quote.update({ where: { id }, data: { status: 'accepted' } });

    if (soApprovalEnabled) {
      const overall = await this.approvals.initSteps(this.prisma, 'SalesOrder', order.id, 'salesOrders', Number(order.total));
      if (overall === 'approved') {
        await this.prisma.salesOrder.update({ where: { id: order.id }, data: { approvalStatus: 'approved' } });
      }
    }
    await this.timeline.log('quote.converted', `Quote ${quote.quoteNumber} converted to sales order ${order.orderNumber}`, quote.id, 'Quote', { salesOrderId: order.id }, userId);
    return toClient(order);
  }
}
