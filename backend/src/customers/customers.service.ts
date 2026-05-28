import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  /** Strips relation/virtual fields the frontend may echo back on writes. */
  private cleanData(body: Record<string, any>) {
    const { _id, id, owner, deals, createdAt, updatedAt, bookingHistory, ...rest } = body;
    if (typeof owner === 'string') {
      rest.ownerId = owner;
    } else if (owner && typeof owner === 'object' && owner._id) {
      rest.ownerId = owner._id;
    }
    // Prisma rejects empty strings for DateTime fields — coerce to null
    for (const field of ['dateOfBirth'] as const) {
      if (rest[field] === '') rest[field] = null;
    }
    return rest;
  }

  async create(body: Record<string, any>, userId: string) {
    const customer = await this.prisma.customer.create({
      data: this.cleanData(body) as any,
    });

    await this.timeline.log(
      'contact.created',
      `Contact "${customer.name}" created`,
      customer.id,
      'Customer',
      { name: customer.name },
      userId,
    );

    return toClient(customer);
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status, gender, phone, createdAt_from, createdAt_to } = query;
    if (!page) {
      const customers = await this.prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return toClient(customers);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (phone) where.phone = { contains: phone, mode: 'insensitive' };
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    // Custom fields: cf_{fieldId}=value params
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) where.AND = [...(where.AND ?? []), ...cfConditions];
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { deals: true, owner: true },
    });
    if (!customer) return null;
    return toClient(customer);
  }

  async update(id: string, body: Record<string, any>, userId?: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) return null;
    const cleaned = this.cleanData(body);
    const customer = await this.prisma.customer.update({ where: { id }, data: cleaned });

    const TRACKED_FIELDS = ['name', 'email', 'phone', 'mobile', 'location', 'status', 'gender', 'source', 'notes'];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of TRACKED_FIELDS) {
      if (cleaned[field] === undefined) continue;
      const oldVal = (existing as any)[field];
      const newVal = cleaned[field];
      if (String(oldVal ?? '') !== String(newVal ?? '')) changes[field] = { from: oldVal, to: newVal };
    }
    if (Object.keys(changes).length > 0 && userId) {
      await this.timeline.log('contact.updated', 'Contact updated', id, 'Customer', { changes }, userId);
    }

    return toClient(customer);
  }

  async remove(id: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) return null;

    const deals = await this.prisma.deal.findMany({
      where: { customerId: id },
      select: { id: true },
    });
    const dealIds = deals.map((d) => d.id);

    if (dealIds.length > 0) {
      await this.prisma.partialPayment.deleteMany({
        where: { dealId: { in: dealIds } },
      });
      await this.prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
    }

    await this.prisma.customer.delete({ where: { id } });
    return true;
  }
}
