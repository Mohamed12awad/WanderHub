import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';
import { VisibilityService } from '../common/visibility.service';
import { CustomFieldsService } from '../common/custom-fields.service';
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
    private readonly customFields: CustomFieldsService,
  ) {}

  async create(body: CreateLeadDto, userId: string) {
    const data = cleanData(body, {
      emptyToNull: ['expectedCloseDate', 'rating'],
      numeric: ['budget'],
    });

    // Dedup: warn if phone/email matches an existing Lead or Customer
    const phone = data.phone as string | undefined;
    const email = data.email as string | undefined;
    if (phone || email) {
      const dupLead = await this.prisma.lead.findFirst({
        where: {
          deletedAt: null,
          OR: [
            phone ? { phone } : undefined,
            email ? { email } : undefined,
          ].filter(Boolean) as Prisma.LeadWhereInput[],
        },
      });
      if (dupLead) throw new BadRequestException('A lead with this phone or email already exists');

      const dupCustomer = await this.prisma.customer.findFirst({
        where: {
          deletedAt: null,
          OR: [
            phone ? { phone } : undefined,
            email ? { email } : undefined,
          ].filter(Boolean) as Prisma.CustomerWhereInput[],
        },
      });
      if (dupCustomer) throw new BadRequestException('A customer with this phone or email already exists');
    }

    data.createdById = userId;
    data.customFields = await this.customFields.validateAndClean(
      'leads',
      data.customFields as Record<string, unknown> | undefined,
    );
    const lead = await this.prisma.lead.create({ data: data as Prisma.LeadUncheckedCreateInput });

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

    const where: Prisma.LeadWhereInput = { deletedAt: null, ...scopeWhere };
    if (q) {
      where.OR = [
        { name:    { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { email:   { contains: q, mode: 'insensitive' } },
        { phone:   { contains: q, mode: 'insensitive' } },
      ];
    }
    // Converted leads are kept but hidden from the active list: the default
    // ("All") view excludes them; selecting the "Converted" tab shows them.
    if (status) where.status = status as Prisma.LeadWhereInput['status'];
    else where.status = { not: 'converted' } as Prisma.LeadWhereInput['status'];
    if (rating) where.rating = rating as Prisma.LeadWhereInput['rating'];
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
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return toClient(lead);
  }

  async update(id: string, body: UpdateLeadDto, user: AuthUser, userId: string) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!existing) throw new NotFoundException('Lead not found');

    const cleaned = cleanData(body, {
      emptyToNull: ['expectedCloseDate', 'rating'],
      numeric: ['budget'],
    });
    if ('customFields' in cleaned) {
      cleaned.customFields = await this.customFields.validateAndClean(
        'leads',
        cleaned.customFields as Record<string, unknown> | undefined,
      );
    }
    const oldOwnerId = existing.ownerId;
    const lead = await this.prisma.lead.update({
      where: { id },
      data: cleaned as Prisma.LeadUncheckedUpdateInput,
    });

    const newOwnerId = cleaned.ownerId as string | undefined;
    if (newOwnerId && newOwnerId !== oldOwnerId && newOwnerId !== userId) {
      await this.dispatcher.dispatch({
        userId: newOwnerId,
        type: 'lead_assigned',
        title: `Lead assigned: ${lead.name}`,
        link: `/leads/${lead.id}`,
      });
    }

    return toClient(lead);
  }

  async remove(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!existing) throw new NotFoundException('Lead not found');
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async convertToCustomer(id: string, userId: string, createDeal = false) {
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

    // Create the contact and flip the lead atomically so the link can never be lost.
    // The deal is optional — created only when the user asks to start the pipeline.
    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          name: lead.name,
          phone,
          email: lead.email ?? undefined,
          mobile: lead.mobile ?? undefined,
          company: lead.company ?? undefined,
          jobTitle: lead.jobTitle ?? undefined,
          website: lead.website ?? undefined,
          source: lead.source ?? undefined,
          status: 'In Progress',
          notes: lead.notes ?? undefined,
          ownerId: lead.ownerId ?? undefined,
          ...((lead.city || lead.country) ? { location: [lead.city, lead.country].filter(Boolean).join(', ') } : {}),
        } as Prisma.CustomerUncheckedCreateInput,
      });
      await tx.lead.update({
        where: { id },
        data: { status: 'converted', convertedAt: new Date(), convertedToId: created.id },
      });

      // Seed the deal from the lead's opportunity details — only when requested.
      if (createDeal) {
        await tx.deal.create({
          data: {
            title: lead.name,
            customerId: created.id,
            price: lead.budget ?? 0,
            currency: lead.currency ?? 'EGP',
            status: 'qualified',
            source: lead.source ?? undefined,
            ownerId: lead.ownerId ?? undefined,
            expectedCloseDate: lead.expectedCloseDate ?? undefined,
          } as Prisma.DealUncheckedCreateInput,
        });
      }

      return created;
    });

    await this.timeline.log(
      'contact.created',
      `Lead "${lead.name}" converted to ${createDeal ? 'contact + deal' : 'contact'}`,
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
