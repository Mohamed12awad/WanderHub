import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { cleanData } from '../common/clean-data';
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
    const data = cleanData(body);
    const account = await this.prisma.account.create({
      data: data as Prisma.AccountUncheckedCreateInput,
    });
    return toClient(account);
  }

  async update(id: string, body: UpdateAccountDto) {
    const existing = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    const data = cleanData(body);
    const account = await this.prisma.account.update({
      where: { id },
      data: data as Prisma.AccountUncheckedUpdateInput,
    });
    return toClient(account);
  }

  async remove(id: string) {
    const existing = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    await this.prisma.account.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  /**
   * Full account statement: every transaction touching the account, both
   * money-in (invoice payments) and money-out (vendor-bill payments), merged
   * into one date-sorted ledger. Each side is queried ordered by date desc and
   * capped at `page * limit`, so the merged top page is always complete without
   * loading the entire history.
   */
  async getStatement(id: string, query: Record<string, string>) {
    const account = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!account) throw new NotFoundException('account not found');

    const p = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '25')));
    const take = p * limit;

    const [inflows, outflows, inCount, outCount] = await Promise.all([
      this.prisma.invoicePayment.findMany({
        where: { accountId: id },
        include: { invoice: { select: { id: true, invoiceNumber: true, title: true } } },
        orderBy: { date: 'desc' },
        take,
      }),
      this.prisma.vendorBillPayment.findMany({
        where: { accountId: id },
        include: { bill: { select: { id: true, billNumber: true, title: true } } },
        orderBy: { date: 'desc' },
        take,
      }),
      this.prisma.invoicePayment.count({ where: { accountId: id } }),
      this.prisma.vendorBillPayment.count({ where: { accountId: id } }),
    ]);

    const txns = [
      ...inflows.map((t) => ({
        id: t.id, date: t.date, direction: 'in' as const, amount: Number(t.amount), currency: t.currency,
        method: t.method, reference: t.invoice?.invoiceNumber ?? null, title: t.invoice?.title ?? null,
        refType: 'invoice' as const, refId: t.invoiceId,
      })),
      ...outflows.map((t) => ({
        id: t.id, date: t.date, direction: 'out' as const, amount: Number(t.amount), currency: t.currency,
        method: t.method, reference: t.bill?.billNumber ?? null, title: t.bill?.title ?? null,
        refType: 'bill' as const, refId: t.billId,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const pageItems = txns.slice((p - 1) * limit, p * limit);
    const total = inCount + outCount;
    return {
      account: toClient(account),
      data: toClient(pageItems),
      total,
      page: p,
      pages: Math.ceil(total / limit) || 1,
    };
  }
}
