import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toClient } from '../common/serialize';
import { cleanData } from '../common/clean-data';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  // The GL parent under which cash/bank sub-accounts are nested (seeded by the COA).
  private static readonly CASH_PARENT_CODE = '1100';

  /**
   * Ensures a cash Account has a linked GL sub-account under "1100 Cash & Bank"
   * (next free 11xx code). No-op if already linked or if the GL chart isn't
   * seeded yet (cash accounts work without the GL; the COA seed back-fills them).
   */
  private async ensureLinkedCoa(account: { id: string; name: string; currency: string }) {
    const existing = await this.prisma.chartOfAccount.findUnique({ where: { cashAccountId: account.id } });
    if (existing) return;
    const parent = await this.prisma.chartOfAccount.findFirst({
      where: { code: AccountsService.CASH_PARENT_CODE, deletedAt: null },
    });
    if (!parent) return; // GL not set up yet

    const children = await this.prisma.chartOfAccount.findMany({
      where: { parentId: parent.id }, select: { code: true },
    });
    let next = children
      .map((c) => parseInt(c.code, 10))
      .filter((n) => !Number.isNaN(n) && n > 1100)
      .reduce((max, n) => Math.max(max, n), 1100);
    let code = String(next + 1);
    while (await this.prisma.chartOfAccount.findUnique({ where: { code } })) {
      next += 1;
      code = String(next + 1);
    }

    await this.prisma.chartOfAccount.create({
      data: {
        code,
        name: account.name,
        type: 'asset',
        normalBalance: 'debit',
        parentId: parent.id,
        currency: account.currency,
        cashAccountId: account.id,
      },
    });
  }

  /** Links an explicit GL account to a cash account (validates + enforces 1:1). */
  private async linkChart(accountId: string, coaId: string) {
    const coa = await this.prisma.chartOfAccount.findFirst({ where: { id: coaId, deletedAt: null } });
    if (!coa) throw new BadRequestException('GL account not found');
    if (coa.type !== 'asset') throw new BadRequestException('Linked GL account must be an asset account');
    if (coa.cashAccountId && coa.cashAccountId !== accountId) {
      throw new BadRequestException('That GL account is already linked to another cash account');
    }
    // One cash account ↔ one GL account: detach any other COA linked to this account.
    await this.prisma.chartOfAccount.updateMany({
      where: { cashAccountId: accountId, NOT: { id: coaId } }, data: { cashAccountId: null },
    });
    await this.prisma.chartOfAccount.update({ where: { id: coaId }, data: { cashAccountId: accountId } });
  }

  async findAll() {
    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { chartOfAccount: { select: { id: true, code: true, name: true } } },
    });
    return toClient(accounts);
  }

  async create(body: CreateAccountDto) {
    const { chartOfAccountId, ...rest } = body as CreateAccountDto;
    const data = cleanData(rest);
    const account = await this.prisma.account.create({
      data: data as Prisma.AccountUncheckedCreateInput,
    });
    if (chartOfAccountId) await this.linkChart(account.id, chartOfAccountId);
    else await this.ensureLinkedCoa(account);
    return toClient(
      await this.prisma.account.findUnique({
        where: { id: account.id },
        include: { chartOfAccount: { select: { id: true, code: true, name: true } } },
      }),
    );
  }

  async update(id: string, body: UpdateAccountDto) {
    const existing = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    const { chartOfAccountId, ...rest } = body as UpdateAccountDto;
    const data = cleanData(rest);
    const account = await this.prisma.account.update({
      where: { id },
      data: data as Prisma.AccountUncheckedUpdateInput,
    });
    // Explicit GL pick overrides; otherwise keep/create the auto-linked sub-account.
    if (chartOfAccountId) await this.linkChart(account.id, chartOfAccountId);
    else await this.ensureLinkedCoa(account);
    if (data.name !== undefined) {
      await this.prisma.chartOfAccount.updateMany({
        where: { cashAccountId: id }, data: { name: account.name },
      });
    }
    return toClient(
      await this.prisma.account.findUnique({
        where: { id },
        include: { chartOfAccount: { select: { id: true, code: true, name: true } } },
      }),
    );
  }

  async remove(id: string) {
    const existing = await this.prisma.account.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('account not found');
    await this.prisma.account.update({ where: { id }, data: { deletedAt: new Date() } });
    // Soft-delete the linked GL account too, unless it carries posted history.
    const coa = await this.prisma.chartOfAccount.findUnique({ where: { cashAccountId: id }, select: { id: true } });
    if (coa) {
      const used = await this.prisma.journalLine.count({ where: { accountId: coa.id } });
      if (used === 0) {
        await this.prisma.chartOfAccount.update({ where: { id: coa.id }, data: { deletedAt: new Date(), isActive: false } });
      }
    }
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
