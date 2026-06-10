import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { toClient } from '../common/serialize';
import { UNPAGINATED_MAX } from '../common/paginate';
import { buildCfConditions } from '../common/customFields';
import { CustomFieldsService } from '../common/custom-fields.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly numberSequence: NumberSequenceService,
    private readonly visibility: VisibilityService,
    private readonly customFields: CustomFieldsService,
  ) {}

  /** Maps frontend deal payload (customer/owner as strings) to Prisma data. */
  private cleanData(body: object) {
    const {
      _id, id, customer, product, owner,
      totalPaid, quantity, createdAt, updatedAt,
      quotes, invoices, partialPayments, activities, tasks,
      startDate, endDate,
      ...rest
    } = body as Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest };
    if (customer !== undefined) {
      data.customerId = typeof customer === 'object' ? (customer as { _id?: string })?._id : customer;
    }
    if (owner !== undefined) {
      data.ownerId = owner === '' || owner === null ? null : (typeof owner === 'object' ? (owner as { _id?: string })?._id : owner);
    }
    return data;
  }

  async create(body: CreateDealDto, userId: string) {
    const data = this.cleanData(body);
    data.customFields = await this.customFields.validateAndClean(
      'deals',
      data.customFields as Record<string, unknown> | undefined,
    );
    const deal = await this.prisma.deal.create({ data: data as Prisma.DealUncheckedCreateInput });

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

  async findAll(query: Record<string, string>, user: AuthUser) {
    const { page, limit: limitRaw, q, status, source, currency, customerId, priority, ownerId, closeDate_from, closeDate_to, createdAt_from, createdAt_to, price_min, price_max } = query;
    const customerSelect = { select: { id: true, name: true } };
    const ownerSelect = { select: { id: true, name: true } };
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');

    if (!page) {
      const deals = await this.prisma.deal.findMany({
        where: { deletedAt: null, ...scopeWhere },
        include: { customer: customerSelect, owner: ownerSelect },
        orderBy: { createdAt: 'desc' },
        take: UNPAGINATED_MAX,
      });
      return toClient(deals);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: Prisma.DealWhereInput = { deletedAt: null, ...scopeWhere };
    if (customerId) where.customerId = customerId;
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;
    if (source) where.source = source;
    if (currency) where.currency = currency;
    if (priority) where.priority = priority;
    if (ownerId) where.ownerId = ownerId;
    if (closeDate_from || closeDate_to) {
      const range: Prisma.DateTimeNullableFilter = {};
      if (closeDate_from) range.gte = new Date(closeDate_from);
      if (closeDate_to) range.lte = new Date(closeDate_to);
      where.expectedCloseDate = range;
    }
    if (createdAt_from || createdAt_to) {
      const range: Prisma.DateTimeFilter = {};
      if (createdAt_from) range.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); range.lte = d; }
      where.createdAt = range;
    }
    if (price_min || price_max) {
      const range: Prisma.FloatFilter = {};
      if (price_min) range.gte = parseFloat(price_min);
      if (price_max) range.lte = parseFloat(price_max);
      where.price = range;
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) {
      where.AND = [
        ...((where.AND as Prisma.DealWhereInput[]) ?? []),
        ...(cfConditions as Prisma.DealWhereInput[]),
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: { customer: customerSelect, owner: ownerSelect },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, includePayments: boolean, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const deal = await this.prisma.deal.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
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
        owner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, status: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!deal) throw new NotFoundException('deal not found');

    // Payments are unified on invoices: pull the payments recorded against
    // this deal's invoices rather than the removed PartialPayment table.
    let payments: unknown[] = [];
    if (includePayments) {
      payments = await this.prisma.invoicePayment.findMany({
        where: { invoice: { dealId: id } },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      });
    }

    return { deal: toClient(deal), payments: toClient(payments) };
  }

  async update(id: string, body: UpdateDealDto, user: AuthUser, userId: string) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const oldDeal = await this.prisma.deal.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!oldDeal) throw new NotFoundException('deal not found');

    const cleaned = this.cleanData(body);
    if ('customFields' in cleaned) {
      cleaned.customFields = await this.customFields.validateAndClean(
        'deals',
        cleaned.customFields as Record<string, unknown> | undefined,
      );
    }
    const newStatus = body.status as string | undefined;
    const deal = await this.prisma.deal.update({
      where: { id },
      data: cleaned as Prisma.DealUncheckedUpdateInput,
    });

    if (newStatus && newStatus !== oldDeal.status) {
      const eventType =
        newStatus === 'won' ? 'deal.won'
        : newStatus === 'lost' ? 'deal.lost'
        : 'deal.stage_changed';
      await this.timeline.log(
        eventType,
        `Status changed: ${oldDeal.status} → ${newStatus}`,
        id, 'Deal',
        { from: oldDeal.status, to: newStatus },
        userId,
      );
    }

    const TRACKED_FIELDS = ['title', 'price', 'currency', 'priority', 'probability', 'source', 'category', 'dealType', 'expectedCloseDate', 'lostReason'];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of TRACKED_FIELDS) {
      if (cleaned[field] === undefined) continue;
      const oldVal = (oldDeal as Record<string, unknown>)[field];
      const newVal = cleaned[field];
      const oldStr = oldVal instanceof Date ? oldVal.toISOString().slice(0, 10) : String(oldVal ?? '');
      const newStr = newVal instanceof Date ? (newVal as Date).toISOString().slice(0, 10) : String(newVal ?? '');
      if (oldStr !== newStr) changes[field] = { from: oldVal, to: newVal };
    }
    if (Object.keys(changes).length > 0) {
      await this.timeline.log('deal.updated', 'Deal updated', id, 'Deal', { changes }, userId);
    }

    return toClient(deal);
  }

  async createQuoteFromDeal(id: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true } } },
    });
    if (!deal) throw new NotFoundException('deal not found');

    const items = [
      {
        description: deal.title,
        quantity: 1,
        unitPrice: deal.price,
        discount: 0,
        total: deal.price,
      },
    ];

    const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
    const quoteNumber = await this.numberSequence.nextNumber('quote', 'QUO');

    // Respect the workspace approval config — same behaviour as finance.createQuote.
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals = (config?.approvals as Array<{ module?: string; enabled?: boolean }>) ?? [];
    const quoteCfg = approvals.find((c) => c.module === 'quotes');
    const approvalStatus = quoteCfg?.enabled ? 'pending' : 'approved';

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
        currency: deal.currency || 'EGP',
        approvalStatus,
        createdById: userId,
      },
      include: { items: true },
    });

    await this.timeline.log(
      'quote.created',
      `Quote ${quoteNumber} created from deal`,
      quote.id, 'Quote',
      { total: quote.total, currency: quote.currency },
      userId,
    );

    // Advance the deal to "proposal" stage if it's still in early discovery.
    if (['lead', 'qualified'].includes(deal.status as string)) {
      await this.prisma.deal.update({ where: { id }, data: { status: 'proposal' } });
    }

    return toClient(quote);
  }

  async remove(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'deals', 'ownerId');
    const deal = await this.prisma.deal.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!deal) throw new NotFoundException('deal not found');

    // Block deletion while the deal still has financially-open invoices.
    const openInvoices = await this.prisma.invoice.count({
      where: { dealId: id, deletedAt: null, status: { notIn: ['paid', 'cancelled'] } },
    });
    if (openInvoices > 0) {
      throw new BadRequestException(
        `Cannot delete deal with ${openInvoices} open invoice(s). Settle or cancel them first.`,
      );
    }

    // Cascade the soft-delete to the deal's quotes and (settled) invoices.
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.quote.updateMany({ where: { dealId: id, deletedAt: null }, data: { deletedAt: now } });
      await tx.invoice.updateMany({ where: { dealId: id, deletedAt: null }, data: { deletedAt: now } });
      await tx.deal.update({ where: { id }, data: { deletedAt: now } });
    });
    return true;
  }

  /** Soft-deletes all deals for a customer — called by CustomersService.remove(). */
  async softDeleteByCustomer(customerId: string, deletedAt: Date) {
    await this.prisma.deal.updateMany({ where: { customerId }, data: { deletedAt } });
  }
}
