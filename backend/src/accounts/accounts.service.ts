import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const accounts = await this.prisma.account.findMany({ orderBy: { createdAt: 'asc' } });
    return toClient(accounts);
  }

  async create(body: Record<string, any>) {
    const { _id, id, createdAt, updatedAt, ...data } = body;
    const account = await this.prisma.account.create({ data: data as any });
    return toClient(account);
  }

  async update(id: string, body: Record<string, any>) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) return null;
    const { _id, id: _id2, createdAt, updatedAt, ...data } = body;
    const account = await this.prisma.account.update({ where: { id }, data: data as any });
    return toClient(account);
  }

  async remove(id: string) {
    const existing = await this.prisma.account.findUnique({ where: { id } });
    if (!existing) return null;
    await this.prisma.account.delete({ where: { id } });
    return true;
  }

  async getStatement(id: string, query: Record<string, string>) {
    const { page, limit: limitRaw } = query;
    const p = Math.max(1, parseInt(page || '1'));
    const limit = Math.min(100, parseInt(limitRaw || '25'));
    const [data, total] = await Promise.all([
      this.prisma.invoicePayment.findMany({
        where: { accountId: id },
        include: { invoice: { select: { id: true, invoiceNumber: true, title: true } } },
        orderBy: { date: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.invoicePayment.count({ where: { accountId: id } }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }
}
