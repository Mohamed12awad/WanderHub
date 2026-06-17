import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../common/currency.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { CreateJournalEntryDto } from './dto/journal-entry.dto';
import { PeriodCloseService } from './period-close.service';
import { PostingService } from './posting.service';

/** Balanced within this base-currency tolerance (rounding noise across FX). */
export const BALANCE_TOLERANCE = 0.005;

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly numbers: NumberSequenceService,
    private readonly periods: PeriodCloseService,
    private readonly posting: PostingService,
  ) {}

  /** Reverses a posted entry (writes a mirror, marks the original reversed). */
  async reverse(id: string, userId: string) {
    const mirror = await this.posting.reverseById(id, { createdById: userId });
    if (!mirror) throw new BadRequestException('Entry could not be reversed');
    return this.findOne(mirror.id);
  }

  async list(query: Record<string, string> = {}) {
    const p = Math.max(1, parseInt(query.page ?? '1') || 1);
    const take = Math.min(100, parseInt(query.limit ?? '25') || 25);
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.sourceType) where.sourceType = query.sourceType;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { entryNumber: { contains: q, mode: 'insensitive' } },
        { memo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (p - 1) * take,
        take,
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
        },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return { data, total, page: p, pages: Math.ceil(total / take) || 1 };
  }

  /**
   * All journal entries posted for a source document — including the entries for
   * its payments (InvoicePayment / VendorBillPayment) — so a document's detail
   * page can show its full GL footprint.
   */
  async documentEntries(model: string, id: string) {
    const ids: string[] = [id];
    if (model === 'Invoice') {
      const pays = await this.prisma.invoicePayment.findMany({ where: { invoiceId: id }, select: { id: true } });
      ids.push(...pays.map((p) => p.id));
    } else if (model === 'VendorBill') {
      const pays = await this.prisma.vendorBillPayment.findMany({ where: { billId: id }, select: { id: true } });
      ids.push(...pays.map((p) => p.id));
    }
    return this.prisma.journalEntry.findMany({
      where: { sourceId: { in: ids } },
      orderBy: { date: 'asc' },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: { select: { code: true, name: true, type: true } } } },
        createdBy: { select: { id: true, name: true } },
        reversesEntry: { select: { id: true, entryNumber: true } },
        reversedBy: { select: { id: true, entryNumber: true } },
      },
    });
    if (!row) throw new NotFoundException('journal entry not found');
    return row;
  }

  /**
   * Creates a manual, balanced journal entry (posted immediately). Each line's
   * `baseAmount` is signed (debit +, credit −) in base currency; a balanced
   * entry sums to ~0 in base. Validates accounts exist and Σdebit == Σcredit.
   */
  async createManual(dto: CreateJournalEntryDto, userId: string) {
    const date = new Date(dto.date);
    if (await this.periods.isDateLocked(date)) {
      throw new BadRequestException(
        `Cannot post to ${date.toISOString().slice(0, 7)}: the accounting period is closed.`,
      );
    }
    const base = await this.currency.getBaseCurrency();

    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { id: { in: accountIds }, deletedAt: null },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts were not found');
    }

    const lines = [];
    for (const l of dto.lines) {
      const debit = l.debit ?? 0;
      const credit = l.credit ?? 0;
      if (debit < 0 || credit < 0) throw new BadRequestException('debit/credit must be >= 0');
      if (debit > 0 && credit > 0) {
        throw new BadRequestException('a line cannot have both a debit and a credit');
      }
      if (debit === 0 && credit === 0) {
        throw new BadRequestException('each line must have a debit or a credit');
      }
      const cur = l.currency ?? base;
      const baseDebit = await this.currency.toBase(debit, cur);
      const baseCredit = await this.currency.toBase(credit, cur);
      lines.push({
        accountId: l.accountId,
        debit,
        credit,
        currency: cur,
        baseAmount: baseDebit - baseCredit,
        memo: l.memo ?? null,
        customerId: l.customerId ?? null,
        supplierId: l.supplierId ?? null,
        projectId: l.projectId ?? null,
        productId: l.productId ?? null,
        warehouseId: l.warehouseId ?? null,
      });
    }

    const sumBase = lines.reduce((s, l) => s + l.baseAmount, 0);
    if (Math.abs(sumBase) > BALANCE_TOLERANCE) {
      throw new BadRequestException(
        `Entry is unbalanced by ${sumBase.toFixed(4)} (base currency). Debits must equal credits.`,
      );
    }

    const entryNumber = await this.numbers.nextNumber('journal', 'JE');
    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(dto.date),
        memo: dto.memo ?? null,
        sourceType: 'Manual',
        sourceId: randomUUID(),
        status: 'posted',
        createdById: userId,
        lines: { create: lines },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  }
}
