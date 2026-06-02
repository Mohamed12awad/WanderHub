import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';
import { UNPAGINATED_MAX } from '../common/paginate';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, type, createdAt_from, createdAt_to } = query;
    if (!page) {
      const products = await this.prisma.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(products);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { type: { contains: q, mode: 'insensitive' } }] }
      : {};
    where.deletedAt = null;
    if (type) where.type = { contains: type, mode: 'insensitive' };
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) where.AND = [...(where.AND ?? []), ...cfConditions];
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.product.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    return product ? toClient(product) : null;
  }

  async create(body: CreateProductDto) {
    // The global ValidationPipe (whitelist) already strips any field not
    // declared on the DTO, so the payload is safe to pass straight through.
    const product = await this.prisma.product.create({ data: body as any });
    return toClient(product);
  }

  async update(id: string, body: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('product not found');
    const product = await this.prisma.product.update({ where: { id }, data: body as any });
    return toClient(product);
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('product not found');
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
