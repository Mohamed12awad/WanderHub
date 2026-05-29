import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisibilityService } from '../common/visibility.service';
import { toClient } from '../common/serialize';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationsService,
    private readonly visibility: VisibilityService,
  ) {}

  private cleanData(body: Record<string, any>) {
    const { _id, id, owner, createdAt, updatedAt, convertedTo, ...rest } = body;
    const data: Record<string, any> = { ...rest };
    if (owner !== undefined) {
      data.ownerId = owner === '' || owner === null ? null : (typeof owner === 'object' ? owner?._id : owner);
    }
    return data;
  }

  async create(body: CreateLeadDto, userId: string) {
    const data = this.cleanData(body as any);

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
      await this.notifications.create({
        userId: lead.ownerId,
        type: 'lead_assigned',
        title: `Lead assigned: ${lead.name}`,
        link: `/leads/${lead.id}`,
      });
    }

    return toClient(lead);
  }

  async findAll(query: Record<string, string>, user: AuthUser) {
    const { page, limit: limitRaw, q, status, ownerId, source, createdAt_from, createdAt_to } = query;
    const ownerSelect = { select: { id: true, name: true } };
    const scopeWhere = await this.visibility.ownershipWhere(user, 'leads', 'ownerId');

    if (!page) {
      const leads = await this.prisma.lead.findMany({
        where: { deletedAt: null, ...scopeWhere },
        include: { owner: ownerSelect },
        orderBy: { createdAt: 'desc' },
      });
      return toClient(leads);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = { deletedAt: null, ...scopeWhere };
    if (q) where.name = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (source) where.source = source;
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: { owner: ownerSelect },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
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
    return lead ? toClient(lead) : null;
  }

  async update(id: string, body: UpdateLeadDto, userId: string) {
    const existing = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    const cleaned = this.cleanData(body as any);
    const oldOwnerId = existing.ownerId;
    const lead = await this.prisma.lead.update({ where: { id }, data: cleaned });

    if (cleaned.ownerId && cleaned.ownerId !== oldOwnerId && cleaned.ownerId !== userId) {
      await this.notifications.create({
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
    if (!existing) return null;
    await this.prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async convertToCustomer(id: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) return null;
    if (lead.status === 'converted') throw new BadRequestException('Lead is already converted');

    const customer = await this.prisma.customer.create({
      data: {
        name: lead.name,
        phone: lead.phone ?? undefined,
        email: lead.email ?? undefined,
        mobile: lead.mobile ?? undefined,
        source: lead.source ?? undefined,
        notes: lead.notes ?? undefined,
        ownerId: lead.ownerId ?? undefined,
      },
    });

    await this.prisma.lead.update({
      where: { id },
      data: { status: 'converted', convertedAt: new Date(), convertedToId: customer.id },
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
