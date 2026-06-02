import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { EditPaymentDto } from './dto/edit-payment.dto';
import { calcTotals, deriveInvoiceStatus } from './finance.math';

// Sentinel used to roll back the conversion transaction when a concurrent
// request won the race to convert the same quote.
class AlreadyConvertedError extends Error {}

const QUOTE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  items: { orderBy: { order: 'asc' as const } },
  convertedToInvoice: { select: { id: true, invoiceNumber: true } },
};

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  fromQuote: { select: { id: true, quoteNumber: true } },
  items: { orderBy: { order: 'asc' as const } },
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
  ) {}

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals = (config?.approvals as any[]) ?? [];
    const cfg = approvals.find((c: any) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    // Empty approverRoles with approvals enabled means admins-only; don't let anyone through.
    if (!approverRoles.length) return false;
    return approverRoles.includes(userRole);
  }

  /**
   * Recomputes an invoice's totalPaid as the authoritative SUM of its payments,
   * derives its status, and keeps the linked deal's won/active state in sync.
   * Running on every payment mutation (record, edit, delete) ensures the deal
   * can never stay "won" after a payment is reversed.
   */
  private async recalcInvoiceTotals(tx: Prisma.TransactionClient, invoiceId: string) {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return null;
    const agg = await tx.invoicePayment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    const totalPaid = agg._sum.amount ?? 0;
    const status = deriveInvoiceStatus(invoice.total, totalPaid, invoice.dueDate) as any;
    const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { totalPaid, status } });

    // Sync the linked deal's pipeline stage with payment state.
    if (invoice.dealId) {
      const deal = await tx.deal.findUnique({ where: { id: invoice.dealId } });
      if (deal && deal.status !== 'lost' && deal.status !== 'cancelled') {
        if (totalPaid >= invoice.total) {
          await tx.deal.update({ where: { id: invoice.dealId }, data: { status: 'won' } });
        } else if (deal.status === 'won') {
          // Payment reversed or reduced — walk the deal back to an active stage.
          await tx.deal.update({ where: { id: invoice.dealId }, data: { status: 'negotiation' } });
        }
      }
    }

    return updated;
  }

  /**
   * Moves an account's balance by `delta` (positive = money in) atomically.
   * Blocks cross-currency moves rather than silently corrupting the balance.
   */
  private async applyAccountDelta(
    tx: Prisma.TransactionClient,
    accountId: string | null | undefined,
    paymentCurrency: string,
    delta: number,
  ) {
    if (!accountId || !delta) return;
    const account = await tx.account.findFirst({ where: { id: accountId, deletedAt: null } });
    if (!account) throw new BadRequestException('Account not found');
    if (account.currency !== paymentCurrency) {
      throw new BadRequestException(
        `Payment currency (${paymentCurrency}) must match the account currency (${account.currency})`,
      );
    }
    await tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
  }

  // ── Quotes ──────────────────────────────────────────────────────────────────

  async getQuotes(query: Record<string, string>) {
    const where: any = { deletedAt: null };
    if (query.status) where.status = query.status;
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
    const { items = [], taxRate = 0, customer, deal, ...rest } = body;
    const totals = calcTotals(items, taxRate);
    const quoteNumber = await this.numberSequence.nextNumber('quote', 'QUO');
    const { enabled } = await this.getApprovalConfig('quotes');
    const quote = await this.prisma.quote.create({
      data: {
        ...rest,
        quoteNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        approvalStatus: enabled ? 'pending' : 'approved',
        customerId: typeof customer === 'object' ? customer?._id : customer,
        ...(deal ? { dealId: typeof deal === 'object' ? deal?._id : deal } : {}),
        createdById: userId,
        items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
      } as any,
      include: QUOTE_INCLUDE,
    });
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
    const data: any = { ...rest };
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
      return tx.quote.update({ where: { id }, data, include: QUOTE_INCLUDE });
    });
    return toClient(updated);
  }

  async approveQuote(id: string, userId: string, userRole: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, deletedAt: null } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.approvalStatus === 'approved') return toClient(quote);
    const { approverRoles } = await this.getApprovalConfig('quotes');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to approve quotes');
    // Separation of duties: the creator cannot approve their own quote.
    if (quote.createdById === userId) throw new ForbiddenException('You cannot approve a quote you created');
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
    const { approverRoles } = await this.getApprovalConfig('quotes');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to reject quotes');
    if (quote.createdById === userId) throw new ForbiddenException('You cannot reject a quote you created');
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
    if (quote.approvalStatus !== 'approved') throw new BadRequestException('Quote must be approved before conversion to invoice');

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
                total: it.total,
                order: it.order,
              })),
            },
          },
          include: INVOICE_INCLUDE,
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

  // ── Invoices ─────────────────────────────────────────────────────────────────

  async getInvoices(query: Record<string, string>) {
    const { status, customer, deal, page, limit: limitRaw, q } = query;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (customer) where.customerId = customer;
    if (deal) where.dealId = deal;
    if (q) where.OR = [{ invoiceNumber: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }];

    if (!page) {
      const invoices = await this.prisma.invoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { createdAt: 'desc' } });
      return toClient(invoices);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null }, include: INVOICE_INCLUDE });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const payments = await this.prisma.invoicePayment.findMany({
      where: { invoiceId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    return { invoice: toClient(invoice), payments: toClient(payments) };
  }

  async createInvoice(body: CreateInvoiceDto, userId: string) {
    const { items = [], taxRate = 0, customer, deal, ...rest } = body;
    const totals = calcTotals(items, taxRate);
    const invoiceNumber = await this.numberSequence.nextNumber('invoice', 'INV');
    const { enabled } = await this.getApprovalConfig('invoices');
    const invoice = await this.prisma.invoice.create({
      data: {
        ...rest,
        invoiceNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        approvalStatus: enabled ? 'pending' : 'approved',
        issueDate: rest.issueDate ? new Date(rest.issueDate) : new Date(),
        customerId: typeof customer === 'object' ? customer?._id : customer,
        ...(deal ? { dealId: typeof deal === 'object' ? deal?._id : deal } : {}),
        createdById: userId,
        items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
      } as any,
      include: INVOICE_INCLUDE,
    });
    await this.timeline.log('invoice.created', `Invoice ${invoice.invoiceNumber} created`, invoice.id, 'Invoice', { total: invoice.total, currency: invoice.currency }, userId);
    return toClient(invoice);
  }

  async updateInvoice(id: string, body: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const { items, taxRate, customer: _customer, deal: _deal, ...rest } = body;
    const data: any = { ...rest };
    if (invoice.approvalStatus === 'rejected') data.approvalStatus = 'pending';
    // Post-approval edits reset the document back to pending for re-review.
    if (items && invoice.approvalStatus === 'approved') data.approvalStatus = 'pending';

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        const tr = taxRate !== undefined ? taxRate : invoice.taxRate;
        const totals = calcTotals(items, tr);
        // Replace line items atomically with the recomputed totals.
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        data.taxRate = tr;
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.items = { create: totals.items.map((it, idx) => ({ ...it, order: idx })) };
      }
      await tx.invoice.update({ where: { id }, data });
      // Totals changed → re-derive paid status from the existing payments.
      if (items) await this.recalcInvoiceTotals(tx, id);
      return tx.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    });
    return toClient(updated);
  }

  async sendInvoice(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus !== 'approved') throw new BadRequestException('Invoice must be approved before sending');
    if (invoice.status !== 'draft') return this.getInvoiceById(id);
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
      include: INVOICE_INCLUDE,
    });
    await this.timeline.log('invoice.sent', `Invoice ${invoice.invoiceNumber} sent`, id, 'Invoice', {}, userId);
    return toClient(updated);
  }

  async deleteInvoice(id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    // Soft delete; payment history is preserved for audit but excluded from
    // listings (payments are filtered by invoice.deletedAt).
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async approveInvoice(id: string, userId: string, userRole: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus === 'approved') return toClient(invoice);
    const { approverRoles } = await this.getApprovalConfig('invoices');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to approve invoices');
    if (invoice.createdById === userId) throw new ForbiddenException('You cannot approve an invoice you created');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: INVOICE_INCLUDE,
    });
    return toClient(updated);
  }

  async rejectInvoice(id: string, userId: string, reason: string, userRole: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus === 'rejected') return toClient(invoice);
    const { approverRoles } = await this.getApprovalConfig('invoices');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to reject invoices');
    if (invoice.createdById === userId) throw new ForbiddenException('You cannot reject an invoice you created');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: INVOICE_INCLUDE,
    });
    return toClient(updated);
  }

  async recordPayment(invoiceId: string, body: RecordPaymentDto, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus !== 'approved') throw new BadRequestException('Invoice must be approved before recording payment');

    const amount = Number(body.amount);
    const currency = body.currency ?? invoice.currency;

    const { payment, updatedInvoice } = await this.prisma.$transaction(async (tx) => {
      // Reject payments that would push totalPaid past the invoice total.
      // Only enforceable when the payment shares the invoice's currency.
      const agg = await tx.invoicePayment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
      const alreadyPaid = agg._sum.amount ?? 0;
      const outstanding = invoice.total - alreadyPaid;
      if (currency === invoice.currency && amount > outstanding + 0.005) {
        throw new BadRequestException(
          `Payment of ${amount} ${currency} exceeds the outstanding balance of ${outstanding.toFixed(2)} ${invoice.currency}`,
        );
      }

      const payment = await tx.invoicePayment.create({
        data: { ...body, amount, currency, date: new Date(body.date), invoiceId, createdById: userId } as any,
        include: { createdBy: { select: { id: true, name: true } } },
      });

      // Money in: increment the linked account's balance (currency-checked).
      await this.applyAccountDelta(tx, body.accountId, currency, amount);

      const updatedInvoice = await this.recalcInvoiceTotals(tx, invoiceId);
      return { payment, updatedInvoice };
    });

    await this.timeline.log('payment.received', `Payment of ${amount} ${currency} recorded`, invoiceId, 'Invoice', { amount, currency, method: payment.method }, userId);

    const full = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: INVOICE_INCLUDE });
    return { payment: toClient(payment), invoice: toClient(full) };
  }

  async deleteInvoicePayment(invoiceId: string, paymentId: string) {
    const payment = await this.prisma.invoicePayment.findFirst({ where: { id: paymentId, invoiceId } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.invoicePayment.delete({ where: { id: paymentId } });
      // Money out: reverse the balance move this payment had applied.
      await this.applyAccountDelta(tx, payment.accountId, payment.currency, -payment.amount);
      await this.recalcInvoiceTotals(tx, invoiceId);
    });
    return true;
  }

  async editPayment(invoiceId: string, paymentId: string, body: EditPaymentDto) {
    const payment = await this.prisma.invoicePayment.findFirst({ where: { id: paymentId, invoiceId } });
    if (!payment) throw new NotFoundException('Payment not found');
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const newAmount = Number(body.amount);
    const newCurrency = body.currency ?? payment.currency;
    const newAccountId = body.accountId !== undefined ? body.accountId : payment.accountId;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Reject edits that would push totalPaid (excluding this payment) past the
      // invoice total. Only enforceable when the payment shares the invoice's currency.
      const agg = await tx.invoicePayment.aggregate({
        where: { invoiceId, id: { not: paymentId } },
        _sum: { amount: true },
      });
      const outstanding = invoice.total - (agg._sum.amount ?? 0);
      if (newCurrency === invoice.currency && newAmount > outstanding + 0.005) {
        throw new BadRequestException(
          `Payment of ${newAmount} ${newCurrency} exceeds the outstanding balance of ${outstanding.toFixed(2)} ${invoice.currency}`,
        );
      }

      // Reverse the old payment's effect on its account, then apply the new one.
      // Handles amount, currency, and account changes (including moving between
      // accounts) without double-counting.
      await this.applyAccountDelta(tx, payment.accountId, payment.currency, -payment.amount);

      const updated = await tx.invoicePayment.update({
        where: { id: paymentId },
        data: { ...body, amount: newAmount, currency: newCurrency, date: body.date ? new Date(body.date) : payment.date } as any,
      });

      await this.applyAccountDelta(tx, newAccountId, newCurrency, newAmount);
      await this.recalcInvoiceTotals(tx, invoiceId);
      return updated;
    });

    return toClient(updated);
  }

  async getPayments(query: Record<string, string>) {
    const p = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 25);
    // Exclude payments whose invoice has been (soft) deleted.
    const where = { invoice: { deletedAt: null } };
    const [data, total] = await Promise.all([
      this.prisma.invoicePayment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, title: true, customer: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.invoicePayment.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }
}
