import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, type, createdAt_from, createdAt_to } = query;
    if (!page) {
      const products = await this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
      return toClient(products);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { type: { contains: q, mode: 'insensitive' } }] }
      : {};
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
    const product = await this.prisma.product.findUnique({ where: { id } });
    return product ? toClient(product) : null;
  }

  async create(body: Record<string, any>) {
    const { _id, id, createdAt, updatedAt, deals, productNotes, ...data } = body;
    const product = await this.prisma.product.create({ data: data as any });
    return toClient(product);
  }

  async update(id: string, body: Record<string, any>) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) return null;
    const { _id, id: _id2, createdAt, updatedAt, deals, productNotes, ...data } = body;
    const product = await this.prisma.product.update({ where: { id }, data });
    return toClient(product);
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) return null;
    await this.prisma.product.delete({ where: { id } });
    return true;
  }
}
