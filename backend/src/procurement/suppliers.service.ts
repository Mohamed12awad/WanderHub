import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { UNPAGINATED_MAX } from '../common/paginate';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status } = query;
    const where: any = { deletedAt: null };
    if (q) where.name = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;

    if (!page) {
      const suppliers = await this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        take: UNPAGINATED_MAX,
      });
      return toClient(suppliers);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: {
        purchaseOrders: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, poNumber: true, total: true, status: true, createdAt: true } },
        bills: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, billNumber: true, total: true, totalPaid: true, status: true, createdAt: true } },
      },
    });
    return supplier ? toClient(supplier) : null;
  }

  async create(body: CreateSupplierDto) {
    const { address, ...rest } = body as any;
    const supplier = await this.prisma.supplier.create({
      data: { ...rest, ...(address !== undefined ? { address } : {}) },
    });
    return toClient(supplier);
  }

  async update(id: string, body: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    const { address, ...rest } = body as any;
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { ...rest, ...(address !== undefined ? { address } : {}) },
    });
    return toClient(supplier);
  }

  async remove(id: string) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
