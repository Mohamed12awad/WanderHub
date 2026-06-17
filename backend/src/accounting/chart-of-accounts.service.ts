import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AccountType, NormalBalance } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { dateRange } from '../common/paginate';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto/chart-of-account.dto';

/** Asset & expense accounts increase on the debit side; everything else on credit. */
export const normalBalanceFor = (type: AccountType): NormalBalance =>
  type === 'asset' || type === 'expense' ? 'debit' : 'credit';

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chart of accounts, ordered by code. Without `page` returns the full list
   * (pickers/dropdowns rely on this); with `page` returns a paged envelope.
   */
  async findAll(query: { page?: string; limit?: string; q?: string; type?: string } = {}) {
    const q = query.q?.trim();
    const where: Prisma.ChartOfAccountWhereInput = { deletedAt: null };
    if (query.type) where.type = query.type as AccountType;
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }
    const include = { cashAccount: { select: { id: true, name: true, currency: true } } };
    if (!query.page) {
      return this.prisma.chartOfAccount.findMany({ where, orderBy: { code: 'asc' }, include });
    }
    const p = Math.max(1, parseInt(query.page) || 1);
    const take = Math.min(100, parseInt(query.limit ?? '25') || 25);
    const [data, total] = await Promise.all([
      this.prisma.chartOfAccount.findMany({ where, orderBy: { code: 'asc' }, include, skip: (p - 1) * take, take }),
      this.prisma.chartOfAccount.count({ where }),
    ]);
    return { data, total, page: p, pages: Math.ceil(total / take) || 1 };
  }

  async findOne(id: string) {
    const row = await this.prisma.chartOfAccount.findFirst({
      where: { id, deletedAt: null },
      include: {
        cashAccount: { select: { id: true, name: true } },
        parent: { select: { id: true, code: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('account not found');
    return row;
  }

  /** Per-account ledger: every posted journal line touching the account + totals. */
  async ledger(id: string, query: { page?: string; limit?: string; from?: string; to?: string } = {}) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, code: true, name: true, type: true, normalBalance: true },
    });
    if (!account) throw new NotFoundException('account not found');

    const range = dateRange(query.from, query.to);
    const where: Prisma.JournalLineWhereInput = {
      accountId: id,
      journalEntry: { status: { not: 'draft' }, ...(range ? { date: range } : {}) },
    };
    const p = Math.max(1, parseInt(query.page ?? '1') || 1);
    const take = Math.min(100, parseInt(query.limit ?? '25') || 25);

    const [lines, total, agg] = await Promise.all([
      this.prisma.journalLine.findMany({
        where,
        include: { journalEntry: { select: { id: true, entryNumber: true, date: true, memo: true, sourceType: true, status: true } } },
        orderBy: { journalEntry: { date: 'desc' } },
        skip: (p - 1) * take,
        take,
      }),
      this.prisma.journalLine.count({ where }),
      this.prisma.journalLine.aggregate({ where, _sum: { debit: true, credit: true, baseAmount: true } }),
    ]);

    const data = lines.map((l) => ({
      _id: l.id,
      date: l.journalEntry.date,
      entryId: l.journalEntry.id,
      entryNumber: l.journalEntry.entryNumber,
      sourceType: l.journalEntry.sourceType,
      status: l.journalEntry.status,
      memo: l.memo ?? l.journalEntry.memo,
      debit: l.debit,
      credit: l.credit,
    }));
    return {
      account,
      data,
      total,
      page: p,
      pages: Math.ceil(total / take) || 1,
      totalDebit: agg._sum.debit ?? 0,
      totalCredit: agg._sum.credit ?? 0,
      balance: agg._sum.baseAmount ?? 0, // signed base (debit + / credit −)
    };
  }

  async create(body: CreateChartOfAccountDto) {
    const existing = await this.prisma.chartOfAccount.findUnique({ where: { code: body.code } });
    if (existing) throw new BadRequestException(`Account code ${body.code} already exists`);
    return this.prisma.chartOfAccount.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type as AccountType,
        normalBalance: normalBalanceFor(body.type as AccountType),
        parentId: body.parentId ?? null,
        currency: body.currency ?? 'EGP',
        isActive: body.isActive ?? true,
        cashAccountId: body.cashAccountId ?? null,
      },
    });
  }

  async update(id: string, body: UpdateChartOfAccountDto) {
    const existing = await this.prisma.chartOfAccount.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    const data: Prisma.ChartOfAccountUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) {
      data.type = body.type as AccountType;
      data.normalBalance = normalBalanceFor(body.type as AccountType);
    }
    if (body.parentId !== undefined) data.parentId = body.parentId;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.cashAccountId !== undefined) data.cashAccountId = body.cashAccountId;
    return this.prisma.chartOfAccount.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.chartOfAccount.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    const used = await this.prisma.journalLine.count({ where: { accountId: id } });
    if (used > 0) {
      throw new BadRequestException(
        'Account has journal entries and cannot be deleted; deactivate it instead.',
      );
    }
    await this.prisma.chartOfAccount.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return true;
  }
}
