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

// Sentinel used to roll back the conversion transaction when a concurrent
// request won the race to convert the same quote.
class AlreadyConvertedError extends Error {}

const QUOTE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  items: { orderBy: { order: 'asc' as const } },
  convertedToInvoice: { select: { id: true, invoiceNumber: true } },
  salesOrder: { select: { id: true, orderNumber: true } },
};

// Minimal include for the invoice returned by quote→invoice conversion.
const INVOICE_RETURN_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  fromQuote: { select: { id: true, quoteNumber: true } },
  items: { orderBy: { order: 'asc' as const } },
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
  ) {}

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    // Empty approverRoles with approvals enabled means admins-only; don't let anyone through.
    if (!approverRoles.length) return false;
    return approverRoles.includes(userRole);
  }

  async getQuotes(query: Record<string, string>) {
    const where: Prisma.QuoteWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status as Prisma.QuoteWhereInput['status'];
    if (query.customer) where.customerId = query.customer;
    if (query.deal) where.dealId = query.deal;
    const quotes = await this.prisma.quote.findMany({ where, include: QUOTE_INCLUDE, orderBy: { createdAt: 'desc' } });
    return toClient(quotes);
  }

  async getQuoteById(id: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null }, include: QUOTE_INCLUDE });
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
      const overall = await this.approvals.initSteps(this.prisma, 'Quote', quote.id, 'quotes', quote.total);
      if (overall === 'approved') {
        await this.prisma.quote.update({ where: { id: quote.id }, data: { approvalStatus: 'approved' } });
        (quote as { approvalStatus: string }).approvalStatus = 'approved';
      }
    }
    await this.timeline.log('quote.created', `Quote ${quote.quoteNumber} created`, quote.id, 'Quote', { total: quote.total, currency: quote.currency }, userId);
    return toClient(quote);
  }

  async updateQuote(id: string, body: UpdateQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');
    // customer/deal are extracted to keep them out of `rest`; the update path
    // intentionally does not reassign them. The DTO has already stripped any
    // server-controlled fields, so `rest` is safe to spread.
    const { items, taxRate, customer: _customer, deal: _deal, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
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

  async approveQuote(id: string, userId: string, userRole: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.approvalStatus === 'approved') return toClient(quote);

    const steps = await this.approvals.listSteps('Quote', id);
    if (steps.length) {
      const result = await this.approvals.act('Quote', id, userId, userRole, quote.createdById, 'approve');
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.quote.update({
        where: { id },
        data: { approvalStatus: result.status, ...(finalApproved ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null } : {}) },
        include: QUOTE_INCLUDE,
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('quotes');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to approve quotes');
    // Separation of duties: the creator cannot approve their own quote.
    if (quote.createdById === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot approve a quote you created');
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: QUOTE_INCLUDE,
    });
    return toClient(updated);
  }

  async rejectQuote(id: string, userId: string, reason: string, userRole: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.approvalStatus === 'rejected') return toClient(quote);

    const steps = await this.approvals.listSteps('Quote', id);
    if (steps.length) {
      await this.approvals.act('Quote', id, userId, userRole, quote.createdById, 'reject', reason);
      const updated = await this.prisma.quote.update({
        where: { id },
        data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
        include: QUOTE_INCLUDE,
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('quotes');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to reject quotes');
    if (quote.createdById === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot reject a quote you created');
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: QUOTE_INCLUDE,
    });
    return toClient(updated);
  }

  async deleteQuote(id: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null } });
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
        const created = await tx.invoice.create({
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
          },
          include: INVOICE_RETURN_INCLUDE,
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
      const overall = await this.approvals.initSteps(this.prisma, 'SalesOrder', order.id, 'salesOrders', order.total);
      if (overall === 'approved') {
        await this.prisma.salesOrder.update({ where: { id: order.id }, data: { approvalStatus: 'approved' } });
      }
    }
    await this.timeline.log('quote.converted', `Quote ${quote.quoteNumber} converted to sales order ${order.orderNumber}`, quote.id, 'Quote', { salesOrderId: order.id }, userId);
    return toClient(order);
  }
}
