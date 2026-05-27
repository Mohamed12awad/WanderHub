import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly numberSequence: NumberSequenceService,
  ) {}

  /** Maps frontend deal payload (customer/product as strings) to Prisma data. */
  private cleanData(body: Record<string, any>) {
    const {
      _id,
      id,
      customer,
      product,
      totalPaid,
      createdAt,
      updatedAt,
      quotes,
      invoices,
      partialPayments,
      activities,
      tasks,
      ...rest
    } = body;
    const data: Record<string, any> = { ...rest };
    if (customer !== undefined) {
      data.customerId = typeof customer === 'object' ? customer?._id : customer;
    }
    if (product !== undefined && product !== '' && product !== null) {
      data.productId = typeof product === 'object' ? product?._id : product;
    } else if (product === '' || product === null) {
      data.productId = null;
    }
    if (totalPaid !== undefined) data.totalPaid = totalPaid;
    return data;
  }

  async create(body: Record<string, any>, userId: string) {
    const { totalPaid } = body;
    const deal = await this.prisma.deal.create({ data: this.cleanData(body) as any });

    if (totalPaid && totalPaid > 0) {
      await this.prisma.partialPayment.create({
        data: {
          dealId: deal.id,
          amount: totalPaid,
          date: new Date(),
          createdById: userId,
        },
      });
    }

    await this.timeline.log(
      'deal.created',
      `Deal "${deal.title}" created`,
      deal.id,
      'Deal',
      { title: deal.title, status: deal.status },
      userId,
    );

    return toClient(deal);
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status, source, currency, closeDate_from, closeDate_to, createdAt_from, createdAt_to, price_min, price_max } = query;
    const customerSelect = { select: { id: true, name: true } };
    const productSelect = { select: { id: true, name: true } };

    if (!page) {
      const deals = await this.prisma.deal.findMany({
        include: { customer: customerSelect, product: productSelect },
        orderBy: { createdAt: 'desc' },
      });
      return toClient(deals);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = {};
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;
    if (source) where.source = source;
    if (currency) where.currency = currency;
    if (closeDate_from || closeDate_to) {
      where.expectedCloseDate = {};
      if (closeDate_from) where.expectedCloseDate.gte = new Date(closeDate_from);
      if (closeDate_to) where.expectedCloseDate.lte = new Date(closeDate_to);
    }
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    if (price_min || price_max) {
      where.price = {};
      if (price_min) where.price.gte = parseFloat(price_min);
      if (price_max) where.price.lte = parseFloat(price_max);
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) where.AND = [...(where.AND ?? []), ...cfConditions];
    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: { customer: customerSelect, product: productSelect },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, includePayments: boolean) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            mobile: true,
            owner: { select: { id: true, name: true, phone: true } },
          },
        },
        product: { select: { id: true, name: true } },
      },
    });
    if (!deal) return null;

    let payments: any[] = [];
    if (includePayments) {
      payments = await this.prisma.partialPayment.findMany({
        where: { dealId: id },
        include: { createdBy: { select: { id: true, name: true } } },
      });
    }

    return { deal: toClient(deal), payments: toClient(payments) };
  }

  async getInvoiceData(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: { customer: true, product: true },
    });
    if (!deal) return null;
    const payments = await this.prisma.partialPayment.findMany({
      where: { dealId: id },
    });
    return { deal: toClient(deal), payments: toClient(payments) };
  }

  async update(id: string, body: Record<string, any>, userId: string) {
    const oldDeal = await this.prisma.deal.findUnique({ where: { id } });
    if (!oldDeal) return null;

    const newStatus = body.status as string | undefined;
    const deal = await this.prisma.deal.update({
      where: { id },
      data: this.cleanData(body),
    });

    if (newStatus && newStatus !== oldDeal.status) {
      const eventType =
        newStatus === 'won'
          ? 'deal.won'
          : newStatus === 'lost'
            ? 'deal.lost'
            : 'deal.stage_changed';
      await this.timeline.log(
        eventType,
        `Status changed: ${oldDeal.status} → ${newStatus}`,
        id,
        'Deal',
        { from: oldDeal.status, to: newStatus },
        userId,
      );
    }

    return toClient(deal);
  }

  async createQuoteFromDeal(id: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    if (!deal) return null;

    const items = deal.product
      ? [
          {
            description: deal.product.name ?? 'Service',
            quantity: deal.quantity || 1,
            unitPrice: deal.price,
            discount: 0,
            total: deal.price * (deal.quantity || 1),
          },
        ]
      : [
          {
            description: deal.title,
            quantity: 1,
            unitPrice: deal.price,
            discount: 0,
            total: deal.price,
          },
        ];

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const quoteNumber = await this.numberSequence.nextNumber('quote', 'QUO');

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        title: `Quote for ${deal.title}`,
        customerId: deal.customerId,
        dealId: deal.id,
        items: { create: items.map((it, idx) => ({ ...it, order: idx })) },
        subtotal,
        taxRate: 0,
        tax: 0,
        total: subtotal,
        currency: deal.currency || 'USD',
        createdById: userId,
      },
      include: { items: true },
    });

    return toClient(quote);
  }

  async remove(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) return null;
    await this.prisma.partialPayment.deleteMany({ where: { dealId: id } });
    await this.prisma.deal.delete({ where: { id } });
    return true;
  }
}
