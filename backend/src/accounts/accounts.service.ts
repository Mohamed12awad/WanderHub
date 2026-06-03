import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const accounts = await this.prisma.account.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return toClient(accounts);
  }

  async create(body: CreateAccountDto) {
    const { _id, id, createdAt, updatedAt, ...data } = body as any;
    const account = await this.prisma.account.create({ data: data as any });
    return toClient(account);
  }

  async update(id: string, body: UpdateAccountDto) {
    const existing = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    const { _id, id: _id2, createdAt, updatedAt, ...data } = body as any;
    const account = await this.prisma.account.update({ where: { id }, data: data as any });
    return toClient(account);
  }

  async remove(id: string) {
    const existing = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    await this.prisma.account.update({ where: { id }, data: { deletedAt: new Date() } });
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
