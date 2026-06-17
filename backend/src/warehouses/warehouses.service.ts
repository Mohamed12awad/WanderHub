import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

interface WarehouseBody {
  name?: string;
  code?: string;
  address?: unknown;
  isDefault?: boolean;
  isActive?: boolean;
}

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: string; limit?: string; q?: string; active?: string } = {}) {
    const q = query.q?.trim();
    const where: Prisma.WarehouseWhereInput = { deletedAt: null };
    if (query.active === 'true') where.isActive = true;
    else if (query.active === 'false') where.isActive = false;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.WarehouseOrderByWithRelationInput[] = [{ isDefault: 'desc' }, { name: 'asc' }];
    if (!query.page) {
      return toClient(await this.prisma.warehouse.findMany({ where, orderBy }));
    }
    const p = Math.max(1, parseInt(query.page) || 1);
    const take = Math.min(100, parseInt(query.limit ?? '25') || 25);
    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({ where, orderBy, skip: (p - 1) * take, take }),
      this.prisma.warehouse.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / take) || 1 };
  }

  async create(body: WarehouseBody) {
    if (!body.name || !body.code) throw new BadRequestException('name and code are required');
    const dup = await this.prisma.warehouse.findUnique({ where: { code: body.code } });
    if (dup) throw new BadRequestException(`Warehouse code ${body.code} already exists`);
    return this.prisma.$transaction(async (tx) => {
      if (body.isDefault) await tx.warehouse.updateMany({ data: { isDefault: false } });
      const wh = await tx.warehouse.create({
        data: {
          name: body.name!,
          code: body.code!,
          address: (body.address ?? undefined) as Prisma.InputJsonValue | undefined,
          isDefault: body.isDefault ?? false,
          isActive: body.isActive ?? true,
        },
      });
      return toClient(wh);
    });
  }

  async update(id: string, body: WarehouseBody) {
    const existing = await this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Warehouse not found');
    return this.prisma.$transaction(async (tx) => {
      if (body.isDefault) await tx.warehouse.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
      const data: Prisma.WarehouseUncheckedUpdateInput = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.code !== undefined) data.code = body.code;
      if (body.address !== undefined) data.address = body.address as Prisma.InputJsonValue;
      if (body.isDefault !== undefined) data.isDefault = body.isDefault;
      if (body.isActive !== undefined) data.isActive = body.isActive;
      const wh = await tx.warehouse.update({ where: { id }, data });
      return toClient(wh);
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Warehouse not found');
    if (existing.isDefault) throw new BadRequestException('Cannot delete the default warehouse');
    const stock = await this.prisma.stockItem.aggregate({
      where: { warehouseId: id },
      _sum: { quantityOnHand: true },
    });
    if (Math.abs(Number(stock._sum.quantityOnHand ?? 0)) > 0.0001) {
      throw new BadRequestException('Warehouse still holds stock; transfer it out before deleting.');
    }
    await this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return true;
  }
}
