import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly visibility: VisibilityService,
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

  async create(body: CreateCustomerDto, userId: string) {
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

  async findAll(query: Record<string, string>, user: AuthUser) {
    const { page, limit: limitRaw, q, status, gender, phone, createdAt_from, createdAt_to } = query;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');
    if (!page) {
      const customers = await this.prisma.customer.findMany({
        where: { deletedAt: null, ...scopeWhere },
        orderBy: { createdAt: 'desc' },
      });
      return toClient(customers);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = { deletedAt: null, ...scopeWhere };
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

  async findOne(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
      include: { deals: { where: { deletedAt: null } }, owner: true },
    });
    if (!customer) return null;
    return toClient(customer);
  }

  async update(id: string, body: UpdateCustomerDto, userId?: string) {
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
    const existing = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    // Soft delete: also soft-delete the customer's deals so neither resurfaces
    // in listings. Related quotes/invoices keep their own lifecycle.
    const now = new Date();
    await this.prisma.deal.updateMany({ where: { customerId: id }, data: { deletedAt: now } });
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: now } });
    return true;
  }
}
