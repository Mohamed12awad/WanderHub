import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

interface CategoryBody {
  name?: string;
  code?: string | null;
  costMethod?: string | null;
  parentId?: string | null;
}

const COST_METHODS = ['weighted_average', 'fifo'];

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: string; limit?: string; q?: string; costMethod?: string } = {}) {
    const q = query.q?.trim();
    const where: Prisma.ProductCategoryWhereInput = { deletedAt: null };
    if (query.costMethod) where.costMethod = query.costMethod;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    const include = { _count: { select: { products: true } } };
    if (!query.page) {
      return toClient(await this.prisma.productCategory.findMany({ where, orderBy: { name: 'asc' }, include }));
    }
    const p = Math.max(1, parseInt(query.page) || 1);
    const take = Math.min(100, parseInt(query.limit ?? '25') || 25);
    const [data, total] = await Promise.all([
      this.prisma.productCategory.findMany({ where, orderBy: { name: 'asc' }, include, skip: (p - 1) * take, take }),
      this.prisma.productCategory.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / take) || 1 };
  }

  private validate(body: CategoryBody) {
    if (body.costMethod && !COST_METHODS.includes(body.costMethod)) {
      throw new BadRequestException('costMethod must be weighted_average, fifo, or null');
    }
  }

  async create(body: CategoryBody) {
    if (!body.name) throw new BadRequestException('name is required');
    this.validate(body);
    const row = await this.prisma.productCategory.create({
      data: {
        name: body.name,
        code: body.code ?? null,
        costMethod: body.costMethod ?? null,
        parentId: body.parentId ?? null,
      },
    });
    return toClient(row);
  }

  async update(id: string, body: CategoryBody) {
    const existing = await this.prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Category not found');
    this.validate(body);
    const data: Prisma.ProductCategoryUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.costMethod !== undefined) data.costMethod = body.costMethod;
    if (body.parentId !== undefined) data.parentId = body.parentId;
    const row = await this.prisma.productCategory.update({ where: { id }, data });
    return toClient(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await this.prisma.productCategory.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
