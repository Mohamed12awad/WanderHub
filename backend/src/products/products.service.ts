import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';
import { CustomFieldsService } from '../common/custom-fields.service';
import { UNPAGINATED_MAX } from '../common/paginate';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customFields: CustomFieldsService,
    private readonly timeline: TimelineService,
  ) {}

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, type, createdAt_from, createdAt_to } = query;
    if (!page) {
      const products = await this.prisma.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(products);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: Prisma.ProductWhereInput = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { type: { contains: q, mode: 'insensitive' } }] }
      : {};
    where.deletedAt = null;
    if (type) where.type = { contains: type, mode: 'insensitive' };
    if (createdAt_from || createdAt_to) {
      const range: Prisma.DateTimeFilter = {};
      if (createdAt_from) range.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); range.lte = d; }
      where.createdAt = range;
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) {
      where.AND = [
        ...((where.AND as Prisma.ProductWhereInput[]) ?? []),
        ...(cfConditions as Prisma.ProductWhereInput[]),
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.product.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { updatedBy: { select: { id: true, name: true } } },
    });
    return product ? toClient(product) : null;
  }

  async create(body: CreateProductDto) {
    // The global ValidationPipe (whitelist) already strips any field not
    // declared on the DTO, so the payload is safe to pass straight through.
    const data = { ...body } as Record<string, unknown>;
    data.customFields = await this.customFields.validateAndClean(
      'products',
      data.customFields as Record<string, unknown> | undefined,
    );
    const product = await this.prisma.product.create({ data: data as Prisma.ProductUncheckedCreateInput });
    return toClient(product);
  }

  async update(id: string, body: UpdateProductDto, userId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('product not found');
    const data = { ...body } as Record<string, unknown>;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'products',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    const product = await this.prisma.product.update({ where: { id }, data: data as Prisma.ProductUncheckedUpdateInput });

    await this.timeline.logUpdate({
      eventType: 'product.updated', title: 'Product updated', linkedModel: 'Product',
      id, before: existing as Record<string, unknown>, changed: data, userId,
    });

    return toClient(product);
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('product not found');
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
