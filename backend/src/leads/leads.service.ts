import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';
import { VisibilityService } from '../common/visibility.service';
import { toClient } from '../common/serialize';
import { cleanData } from '../common/clean-data';
import { paginate, dateRange } from '../common/paginate';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly visibility: VisibilityService,
  ) {}

  async create(body: CreateLeadDto, userId: string) {
    const data = cleanData(body as any, {
      emptyToNull: ['expectedCloseDate', 'rating'],
      numeric: ['budget'],
    });

    // Dedup: warn if phone/email matches an existing Lead or Customer
    if (data.phone || data.email) {
      const dupLead = await this.prisma.lead.findFirst({
        where: {
          deletedAt: null,
          OR: [
            data.phone ? { phone: data.phone } : undefined,
            data.email ? { email: data.email } : undefined,
          ].filter(Boolean) as any[],
        },
      });
      if (dupLead) throw new BadRequestException('A lead with this phone or email already exists');

      const dupCustomer = await this.prisma.customer.findFirst({
        where: {
          deletedAt: null,
          OR: [
            data.phone ? { phone: data.phone } : undefined,
            data.email ? { email: data.email } : undefined,
          ].filter(Boolean) as any[],
        },
      });
      if (dupCustomer) throw new BadRequestException('A customer with this phone or email already exists');
    }

    data.createdById = userId;
    const lead = await this.prisma.lead.create({ data: data as any });

    if (lead.ownerId && lead.ownerId !== userId) {
      await this.dispatcher.dispatch({
        userId: lead.ownerId,
        type: 'lead_assigned',
        title: `Lead assigned: ${lead.name}`,
        link: `/leads/${lead.id}`,
      });
    }

    return toClient(lead);
  }

  async findAll(query: Record<string, string>, user: AuthUser) {
    const { page, limit, q, status, rating, ownerId, source, createdAt_from, createdAt_to } = query;
    const ownerSelect = { select: { id: true, name: true } };
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');

    const where: any = { deletedAt: null, ...scopeWhere };
    if (q) {
      where.OR = [
        { name:    { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { email:   { contains: q, mode: 'insensitive' } },
        { phone:   { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (rating) where.rating = rating;
    if (ownerId) where.ownerId = ownerId;
    if (source) where.source = source;
    const dr = dateRange(createdAt_from, createdAt_to);
    if (dr) where.createdAt = dr;

    return paginate(this.prisma.lead, {
      where,
      include: { owner: ownerSelect },
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    });
  }

  async findOne(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
      include: {
        owner: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        convertedTo: { select: { id: true, name: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return toClient(lead);
  }

  async update(id: string, body: UpdateLeadDto, userId: string) {
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Lead not found');

    const cleaned = cleanData(body as any, {
      emptyToNull: ['expectedCloseDate', 'rating'],
      numeric: ['budget'],
    });
    const oldOwnerId = existing.ownerId;
    const lead = await this.prisma.lead.update({ where: { id }, data: cleaned });

    if (cleaned.ownerId && cleaned.ownerId !== oldOwnerId && cleaned.ownerId !== userId) {
      await this.dispatcher.dispatch({
        userId: cleaned.ownerId,
        type: 'lead_assigned',
        title: `Lead assigned: ${lead.name}`,
        link: `/leads/${lead.id}`,
      });
    }

    return toClient(lead);
  }

  async remove(id: string) {
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Lead not found');
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async convertToCustomer(id: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Idempotent: if it's already converted, return the linked contact instead of erroring.
    if (lead.status === 'converted') {
      if (lead.convertedToId) {
        const existing = await this.prisma.customer.findUnique({ where: { id: lead.convertedToId } });
        if (existing) return toClient(existing);
      }
      throw new BadRequestException('Lead is already converted');
    }

    // Customer.phone is required + unique — fall back to mobile, otherwise block with a clear message.
    const phone = lead.phone ?? lead.mobile;
    if (!phone) {
      throw new BadRequestException('Add a phone or mobile number to this lead before converting it to a contact');
    }

    // Preserve the richer lead fields that have no dedicated Customer column.
    const extra: Record<string, unknown> = {};
    if (lead.company) extra.company = lead.company;
    if (lead.jobTitle) extra.jobTitle = lead.jobTitle;
    if (lead.website) extra.website = lead.website;
    if (lead.rating) extra.rating = lead.rating;
    if (lead.budget != null) extra.budget = lead.budget;
    if (lead.currency) extra.currency = lead.currency;
    if (lead.campaign) extra.campaign = lead.campaign;
    if (lead.expectedCloseDate) extra.expectedCloseDate = lead.expectedCloseDate;

    // Create the contact and flip the lead atomically so the link can never be lost.
    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name: lead.name,
          phone,
          email: lead.email ?? undefined,
          mobile: lead.mobile ?? undefined,
          source: lead.source ?? undefined,
          status: 'In Progress',
          notes: lead.notes ?? undefined,
          ownerId: lead.ownerId ?? undefined,
          ...((lead.city || lead.country) ? { location: [lead.city, lead.country].filter(Boolean).join(', ') } : {}),
          ...(Object.keys(extra).length ? { customFields: extra } : {}),
        } as any,
      });
      await tx.lead.update({
        where: { id },
        data: { status: 'converted', convertedAt: new Date(), convertedToId: created.id },
      });
      return created;
    });

    await this.timeline.log(
      'contact.created',
      `Lead "${lead.name}" converted to customer`,
      customer.id,
      'Customer',
      { fromLead: lead.id },
      userId,
    );

    return toClient(customer);
  }

  async statsByStatus() {
    const counts = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });
    const result: Record<string, number> = { new: 0, contacted: 0, qualified: 0, unqualified: 0, converted: 0 };
    counts.forEach(({ status, _count }) => { result[status] = _count.id; });
    return result;
  }
}
