import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { cleanData } from '../common/clean-data';
import { paginate, dateRange } from '../common/paginate';
import { buildCfConditions } from '../common/customFields';
import { CustomFieldsService } from '../common/custom-fields.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { DealsService } from '../deals/deals.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly visibility: VisibilityService,
    private readonly customFields: CustomFieldsService,
    private readonly deals: DealsService,
  ) {}

  async create(body: CreateCustomerDto, userId: string) {
    const data = cleanData(body, { emptyToNull: ['dateOfBirth'] });
    data.customFields = await this.customFields.validateAndClean(
      'customers',
      data.customFields as Record<string, unknown> | undefined,
    );
    const customer = await this.prisma.customer.create({
      data: data as Prisma.CustomerUncheckedCreateInput,
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
    const { page, limit, q, status, gender, phone, createdAt_from, createdAt_to } = query;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');

    const where: Prisma.CustomerWhereInput = { deletedAt: null, ...scopeWhere };
    if (q) {
      where.OR = [
        { name:  { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (phone) where.phone = { contains: phone, mode: 'insensitive' };
    const dr = dateRange(createdAt_from, createdAt_to);
    if (dr) where.createdAt = dr;

    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) {
      where.AND = [
        ...((where.AND as Prisma.CustomerWhereInput[]) ?? []),
        ...(cfConditions as Prisma.CustomerWhereInput[]),
      ];
    }

    return paginate(this.prisma.customer, {
      where,
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    });
  }

  async findOne(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
      include: { deals: { where: { deletedAt: null } }, owner: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return toClient(customer);
  }

  async update(id: string, body: UpdateCustomerDto, userId?: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    const cleaned = cleanData(body, { emptyToNull: ['dateOfBirth'] });
    if ('customFields' in cleaned) {
      cleaned.customFields = await this.customFields.validateAndClean(
        'customers',
        cleaned.customFields as Record<string, unknown> | undefined,
      );
    }
    const customer = await this.prisma.customer.update({
      where: { id },
      data: cleaned as Prisma.CustomerUncheckedUpdateInput,
    });

    const TRACKED_FIELDS = ['name', 'email', 'phone', 'mobile', 'location', 'status', 'gender', 'source', 'notes'];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of TRACKED_FIELDS) {
      if (cleaned[field] === undefined) continue;
      const oldVal = (existing as Record<string, unknown>)[field];
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
    if (!existing) throw new NotFoundException('Customer not found');

    // Block deletion while the customer still has financially-open invoices —
    // soft-deleting would orphan live receivables from every list view.
    const openInvoices = await this.prisma.invoice.count({
      where: { customerId: id, deletedAt: null, status: { notIn: ['paid', 'cancelled'] } },
    });
    if (openInvoices > 0) {
      throw new BadRequestException(
        `Cannot delete customer with ${openInvoices} open invoice(s). Settle or cancel them first.`,
      );
    }

    // Cascade the soft-delete to the customer's deals, quotes and (settled)
    // invoices in one transaction so nothing is left pointing at a deleted parent.
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.deal.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt: now } });
      await tx.quote.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt: now } });
      await tx.invoice.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt: now } });
      await tx.customer.update({ where: { id }, data: { deletedAt: now } });
    });
    return true;
  }
}
