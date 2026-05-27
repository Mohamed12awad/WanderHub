import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { toClient } from '../common/serialize';

interface RawLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

function calcTotals(items: RawLineItem[], taxRate = 0) {
  const computed = items.map((i) => {
    const disc = (i.discount ?? 0) / 100;
    return { ...i, discount: i.discount ?? 0, total: i.quantity * i.unitPrice * (1 - disc) };
  });
  const subtotal = computed.reduce((s, i) => s + i.total, 0);
  const tax = subtotal * (taxRate / 100);
  return { items: computed, subtotal, tax, total: subtotal + tax };
}

function deriveInvoiceStatus(total: number, totalPaid: number, dueDate?: Date | null): string {
  if (totalPaid <= 0) return 'sent';
  if (totalPaid >= total) return 'paid';
  if (dueDate && dueDate < new Date() && totalPaid < total) return 'overdue';
  return 'partially_paid';
}

const QUOTE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  items: { orderBy: { order: 'asc' as const } },
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
  ) {}

  // ── Quotes ──────────────────────────────────────────────────────────────────

  async getQuotes(query: Record<string, string>) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.customer) where.customerId = query.customer;
    if (query.deal) where.dealId = query.deal;
    const quotes = await this.prisma.quote.findMany({ where, include: QUOTE_INCLUDE, orderBy: { createdAt: 'desc' } });
    return toClient(quotes);
  }

  async getQuoteById(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
    return quote ? toClient(quote) : null;
  }

  async createQuote(body: Record<string, any>, userId: string) {
    const { items = [], taxRate = 0, customer, deal, ...rest } = body;
    const totals = calcTotals(items, taxRate);
    const quoteNumber = await this.numberSequence.nextNumber('quote', 'QUO');
    const quote = await this.prisma.quote.create({
      data: {
        ...rest,
        quoteNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        customerId: typeof customer === 'object' ? customer?._id : customer,
        ...(deal ? { dealId: typeof deal === 'object' ? deal?._id : deal } : {}),
        createdById: userId,
        items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
      } as any,
      include: QUOTE_INCLUDE,
    });
    return toClient(quote);
  }

  async updateQuote(id: string, body: Record<string, any>) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) return null;
    const { items, taxRate, customer, deal, _id, id: _id2, createdAt, updatedAt, ...rest } = body;
    const data: any = { ...rest };
    if (items) {
      const tr = taxRate !== undefined ? taxRate : quote.taxRate;
      const totals = calcTotals(items, tr);
      await this.prisma.quoteLineItem.deleteMany({ where: { quoteId: id } });
      data.taxRate = tr;
      data.subtotal = totals.subtotal;
      data.tax = totals.tax;
      data.total = totals.total;
      data.items = { create: totals.items.map((it, idx) => ({ ...it, order: idx })) };
    } else if (taxRate !== undefined) {
      data.taxRate = taxRate;
    }
    const updated = await this.prisma.quote.update({ where: { id }, data, include: QUOTE_INCLUDE });
    return toClient(updated);
  }

  async approveQuote(id: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) return null;
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: QUOTE_INCLUDE,
    });
    return toClient(updated);
  }

  async rejectQuote(id: string, userId: string, reason: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) return null;
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: QUOTE_INCLUDE,
    });
    return toClient(updated);
  }

  async deleteQuote(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) return null;
    await this.prisma.quote.delete({ where: { id } });
    return true;
  }

  async convertQuoteToInvoice(id: string, userId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) return null;
    if (quote.convertedToInvoiceId) return { alreadyConverted: true };

    const invoiceNumber = await this.numberSequence.nextNumber('invoice', 'INV');
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        title: quote.title,
        customerId: quote.customerId,
        dealId: quote.dealId,
        status: 'draft',
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

    await this.prisma.quote.update({
      where: { id },
      data: { convertedToInvoiceId: invoice.id, status: 'accepted' },
    });

    return toClient(invoice);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────

  async getInvoices(query: Record<string, string>) {
    const { status, customer, deal, page, limit: limitRaw, q } = query;
    const where: any = {};
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
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    if (!invoice) return null;
    const payments = await this.prisma.invoicePayment.findMany({
      where: { invoiceId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    return { invoice: toClient(invoice), payments: toClient(payments) };
  }

  async createInvoice(body: Record<string, any>, userId: string) {
    const { items = [], taxRate = 0, customer, deal, ...rest } = body;
    const totals = calcTotals(items, taxRate);
    const invoiceNumber = await this.numberSequence.nextNumber('invoice', 'INV');
    const invoice = await this.prisma.invoice.create({
      data: {
        ...rest,
        invoiceNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        issueDate: rest.issueDate ? new Date(rest.issueDate) : new Date(),
        customerId: typeof customer === 'object' ? customer?._id : customer,
        ...(deal ? { dealId: typeof deal === 'object' ? deal?._id : deal } : {}),
        createdById: userId,
        items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
      } as any,
      include: INVOICE_INCLUDE,
    });
    return toClient(invoice);
  }

  async updateInvoice(id: string, body: Record<string, any>) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return null;
    const { items, taxRate, customer, deal, _id, id: _id2, createdAt, updatedAt, payments, fromQuote, ...rest } = body;
    const data: any = { ...rest };
    if (items) {
      const tr = taxRate !== undefined ? taxRate : invoice.taxRate;
      const totals = calcTotals(items, tr);
      await this.prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      data.taxRate = tr;
      data.subtotal = totals.subtotal;
      data.tax = totals.tax;
      data.total = totals.total;
      data.items = { create: totals.items.map((it, idx) => ({ ...it, order: idx })) };
    }
    const updated = await this.prisma.invoice.update({ where: { id }, data, include: INVOICE_INCLUDE });
    return toClient(updated);
  }

  async deleteInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return null;
    await this.prisma.invoicePayment.deleteMany({ where: { invoiceId: id } });
    await this.prisma.invoice.delete({ where: { id } });
    return true;
  }

  async approveInvoice(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return null;
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: INVOICE_INCLUDE,
    });
    return toClient(updated);
  }

  async rejectInvoice(id: string, userId: string, reason: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return null;
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: INVOICE_INCLUDE,
    });
    return toClient(updated);
  }

  async recordPayment(invoiceId: string, body: Record<string, any>, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return null;

    const { _id, id, createdAt, updatedAt, ...paymentData } = body;
    const payment = await this.prisma.invoicePayment.create({
      data: { ...paymentData, amount: Number(body.amount), date: new Date(body.date), invoiceId, createdById: userId },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    const newTotalPaid = (invoice.totalPaid ?? 0) + Number(body.amount);
    const newStatus = deriveInvoiceStatus(invoice.total, newTotalPaid, invoice.dueDate) as any;
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { totalPaid: newTotalPaid, status: newStatus },
      include: INVOICE_INCLUDE,
    });

    if (invoice.dealId && newTotalPaid >= invoice.total) {
      await this.prisma.deal.update({ where: { id: invoice.dealId }, data: { status: 'won' } });
    }

    return { payment: toClient(payment), invoice: toClient(updatedInvoice) };
  }

  async deleteInvoicePayment(invoiceId: string, paymentId: string) {
    const payment = await this.prisma.invoicePayment.findFirst({ where: { id: paymentId, invoiceId } });
    if (!payment) return null;
    await this.prisma.invoicePayment.delete({ where: { id: paymentId } });

    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) {
      const newTotalPaid = Math.max(0, (invoice.totalPaid ?? 0) - payment.amount);
      const newStatus = deriveInvoiceStatus(invoice.total, newTotalPaid, invoice.dueDate) as any;
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { totalPaid: newTotalPaid, status: newStatus } });
    }
    return true;
  }

  async editPayment(invoiceId: string, paymentId: string, body: Record<string, any>) {
    const payment = await this.prisma.invoicePayment.findFirst({ where: { id: paymentId, invoiceId } });
    if (!payment) return null;

    const oldAmount = payment.amount;
    const { _id, id, createdAt, updatedAt, ...data } = body;
    const updated = await this.prisma.invoicePayment.update({
      where: { id: paymentId },
      data: { ...data as any, amount: Number(body.amount), date: body.date ? new Date(body.date) : payment.date },
    });

    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (invoice) {
      const newTotalPaid = Math.max(0, (invoice.totalPaid ?? 0) - oldAmount + updated.amount);
      const newStatus = deriveInvoiceStatus(invoice.total, newTotalPaid, invoice.dueDate) as any;
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { totalPaid: newTotalPaid, status: newStatus } });
    }

    return toClient(updated);
  }

  async getPayments(query: Record<string, string>) {
    const p = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 25);
    const [data, total] = await Promise.all([
      this.prisma.invoicePayment.findMany({
        include: {
          invoice: { select: { id: true, invoiceNumber: true, title: true, customer: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.invoicePayment.count(),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }
}
