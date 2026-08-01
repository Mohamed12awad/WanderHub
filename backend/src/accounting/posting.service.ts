import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService } from '../common/currency.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { PeriodCloseService } from './period-close.service';

export const POST_TOLERANCE = 0.005;

type Db = Prisma.TransactionClient | PrismaService;

export interface GlConfig {
  glEnabled?: boolean;
  glCutoverDate?: string | null;
  defaultArAccount?: string;
  defaultIncomeAccount?: string;
  defaultApAccount?: string;
  defaultExpense?: string;
  defaultInventoryAsset?: string;
  defaultCogs?: string;
  defaultGrni?: string;
  defaultInventoryAdjustment?: string;
  defaultFxGainLossAccount?: string;
  defaultTaxPayable?: string;
  defaultTaxRecoverable?: string;
  defaultCostMethod?: string;
}

export interface PostLine {
  accountId: string;
  debit?: number;
  credit?: number;
  currency?: string;
  /** Explicit signed base value (debit +, credit −). When omitted it is derived
   *  from debit/credit via CurrencyService using `rate` (e.g. an invoice's
   *  historical exchange rate). Pass this for FX-sensitive legs. */
  baseAmount?: number;
  rate?: number | null;
  memo?: string;
  customerId?: string | null;
  supplierId?: string | null;
  projectId?: string | null;
  productId?: string | null;
  warehouseId?: string | null;
  costCenterId?: string | null;
}

export interface PostInput {
  sourceType: string;
  sourceId: string;
  date: Date;
  lines: PostLine[];
  memo?: string;
  createdById?: string | null;
}

/**
 * The double-entry posting engine. Writes balanced, immutable `JournalEntry`/
 * `JournalLine` rows. Idempotent on `(sourceType, sourceId)` — a duplicate post
 * (retry / double-click / race) is a no-op thanks to the DB unique constraint.
 * Corrections never mutate posted lines: `reverse()` writes a mirror entry.
 *
 * All posting is gated by `glConfig.glEnabled` and `glCutoverDate`; callers use
 * `shouldPost(date)` so disabling the GL or pre-cutover documents skip cleanly.
 */
@Injectable()
export class PostingService {
  private readonly logger = new Logger(PostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly workspaceConfig: WorkspaceConfigService,
    private readonly numbers: NumberSequenceService,
    private readonly periods: PeriodCloseService,
  ) {}

  async getGlConfig(): Promise<GlConfig> {
    const ws = await this.workspaceConfig.get();
    return ((ws.glConfig as GlConfig) ?? {}) as GlConfig;
  }

  /** GL enabled AND the document date is on/after the cutover date. */
  async shouldPost(date: Date): Promise<boolean> {
    const gl = await this.getGlConfig();
    if (!gl.glEnabled) return false;
    if (gl.glCutoverDate) {
      const cutover = new Date(gl.glCutoverDate);
      if (!Number.isNaN(cutover.getTime()) && date < cutover) return false;
    }
    return true;
  }

  async coaIdByCode(code: string | undefined, db: Db = this.prisma): Promise<string | null> {
    if (!code) return null;
    const row = await db.chartOfAccount.findUnique({ where: { code }, select: { id: true } });
    return row?.id ?? null;
  }

  /** The GL account that mirrors a cash/bank Account (via cashAccountId). */
  async coaIdForCashAccount(accountId: string, db: Db = this.prisma): Promise<string | null> {
    const row = await db.chartOfAccount.findUnique({
      where: { cashAccountId: accountId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  private async requireCode(code: string | undefined, label: string, db: Db): Promise<string> {
    const id = await this.coaIdByCode(code, db);
    if (!id) {
      throw new BadRequestException(
        `GL posting failed: no account mapped for "${label}" (code ${code ?? 'unset'}). ` +
          `Set it in Settings → GL / Account Mapping.`,
      );
    }
    return id;
  }

  /** Output (sales) tax GL code for a rate, from its TaxRate mapping; else undefined. */
  private async taxLiabilityCode(rate: number | undefined | null, db: Db): Promise<string | undefined> {
    if (rate === undefined || rate === null) return undefined;
    const tr = await db.taxRate.findFirst({
      where: { rate, liabilityAccountCode: { not: null } },
      orderBy: { isDefault: 'desc' },
      select: { liabilityAccountCode: true },
    });
    return tr?.liabilityAccountCode ?? undefined;
  }

  /** Input (purchase) tax GL code for a rate, from its TaxRate mapping; else undefined. */
  private async taxInputCode(rate: number | undefined | null, db: Db): Promise<string | undefined> {
    if (rate === undefined || rate === null) return undefined;
    const tr = await db.taxRate.findFirst({
      where: { rate, inputAccountCode: { not: null } },
      orderBy: { isDefault: 'desc' },
      select: { inputAccountCode: true },
    });
    return tr?.inputAccountCode ?? undefined;
  }

  /** Builds an FX plug leg that forces the entry to balance in base currency. */
  private fxLine(accountId: string, baseAmount: number, baseCurrency: string): PostLine {
    // baseAmount is the signed value still needed to reach zero.
    return baseAmount >= 0
      ? { accountId, debit: baseAmount, currency: baseCurrency, baseAmount }
      : { accountId, credit: -baseAmount, currency: baseCurrency, baseAmount };
  }

  /**
   * Core post. Validates Σdebit == Σcredit in base currency, then writes the
   * entry. Returns the (existing or new) entry id; idempotent.
   */
  async post(input: PostInput, tx?: Prisma.TransactionClient): Promise<{ id: string } | null> {
    const db: Db = tx ?? this.prisma;

    const existing = await db.journalEntry.findUnique({
      where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
      select: { id: true },
    });
    if (existing) return existing;

    // Reject backdated posting into a locked (closed) period.
    if (await this.periods.isDateLocked(input.date)) {
      throw new BadRequestException(
        `Cannot post to ${input.date.toISOString().slice(0, 7)}: the accounting period is closed.`,
      );
    }

    const base = await this.currency.getBaseCurrency();
    const lines = [];
    for (const l of input.lines) {
      const cur = l.currency ?? base;
      let baseAmount = l.baseAmount;
      if (baseAmount === undefined) {
        // Strict: refuse to post a foreign-currency leg with no known rate
        // rather than silently booking base-currency units (audit 2026-08 P0).
        const bd = await this.currency.toBaseOrThrow(l.debit ?? 0, cur, l.rate);
        const bc = await this.currency.toBaseOrThrow(l.credit ?? 0, cur, l.rate);
        baseAmount = bd - bc;
      }
      lines.push({
        accountId: l.accountId,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        currency: cur,
        baseAmount,
        memo: l.memo ?? null,
        customerId: l.customerId ?? null,
        supplierId: l.supplierId ?? null,
        projectId: l.projectId ?? null,
        productId: l.productId ?? null,
        warehouseId: l.warehouseId ?? null,
        costCenterId: l.costCenterId ?? null,
      });
    }

    const sum = lines.reduce((s, l) => s + l.baseAmount, 0);
    if (Math.abs(sum) > POST_TOLERANCE) {
      throw new BadRequestException(
        `Unbalanced GL entry for ${input.sourceType}:${input.sourceId} — off by ${sum.toFixed(4)} (base).`,
      );
    }

    const entryNumber = await this.numbers.nextNumber('journal', 'JE', 4, '-', db);
    try {
      return await db.journalEntry.create({
        data: {
          entryNumber,
          date: input.date,
          memo: input.memo ?? null,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          status: 'posted',
          createdById: input.createdById ?? null,
          lines: { create: lines },
        },
        select: { id: true },
      });
    } catch (e) {
      // Lost a race on the unique constraint — treat as idempotent.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const ex = await db.journalEntry.findUnique({
          where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
          select: { id: true },
        });
        if (ex) return ex;
      }
      throw e;
    }
  }

  private async reverseEntry(
    orig: Prisma.JournalEntryGetPayload<{ include: { lines: true } }>,
    opts: { date?: Date; createdById?: string | null },
    db: Db,
  ): Promise<{ id: string }> {
    // Audit 2026-08 (P1): only reverseById() checked the period lock, so the
    // eleven automated paths that reach reverse()/reverseLive() — invoice
    // void/reject, payment delete/edit, bill void/edit, expense edit — could
    // write a mirror entry into a closed period. The check belongs here so
    // every path inherits it.
    const reversalDate = opts.date ?? new Date();
    if (await this.periods.isDateLocked(reversalDate)) {
      throw new BadRequestException(
        `Cannot post a reversal to ${reversalDate.toISOString().slice(0, 7)}: the accounting period is closed.`,
      );
    }

    const entryNumber = await this.numbers.nextNumber('journal', 'JE', 4, '-', db);
    const mirror = await db.journalEntry.create({
      data: {
        entryNumber,
        date: opts.date ?? new Date(),
        memo: `Reversal of ${orig.entryNumber}`,
        sourceType: 'Reversal',
        sourceId: orig.id,
        status: 'posted',
        reversesEntryId: orig.id,
        createdById: opts.createdById ?? null,
        lines: {
          create: orig.lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.credit),
            credit: Number(l.debit),
            currency: l.currency,
            baseAmount: -Number(l.baseAmount),
            memo: l.memo,
            customerId: l.customerId,
            supplierId: l.supplierId,
            projectId: l.projectId,
            productId: l.productId,
            warehouseId: l.warehouseId,
            costCenterId: l.costCenterId,
          })),
        },
      },
      select: { id: true },
    });
    await db.journalEntry.update({ where: { id: orig.id }, data: { status: 'reversed' } });
    return mirror;
  }

  /**
   * Reverses a posted entry by writing a mirror (debits↔credits) and marking the
   * original `reversed`. Idempotent: a second call is a no-op once reversed.
   */
  async reverse(
    sourceType: string,
    sourceId: string,
    opts: { date?: Date; createdById?: string | null } = {},
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string } | null> {
    const db: Db = tx ?? this.prisma;
    const orig = await db.journalEntry.findUnique({
      where: { sourceType_sourceId: { sourceType, sourceId } },
      include: { lines: true },
    });
    if (!orig || orig.status === 'reversed') return null;
    return this.reverseEntry(orig, opts, db);
  }

  /** Reverses a specific posted entry by its id (used by the manual reversal UI). */
  async reverseById(
    entryId: string,
    opts: { date?: Date; createdById?: string | null } = {},
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string } | null> {
    const db: Db = tx ?? this.prisma;
    const orig = await db.journalEntry.findUnique({ where: { id: entryId }, include: { lines: true } });
    if (!orig) throw new BadRequestException('Journal entry not found');
    if (orig.status === 'reversed') throw new BadRequestException('Entry is already reversed');
    if (orig.sourceType === 'Reversal') throw new BadRequestException('Cannot reverse a reversal entry');
    if (await this.periods.isDateLocked(opts.date ?? new Date())) {
      throw new BadRequestException('The current period is closed; reopen it to post a reversal.');
    }
    return this.reverseEntry(orig, opts, db);
  }

  /**
   * Reverses the currently-live entry for an edit-able source whose corrections
   * are re-posted under versioned sourceIds (`<base>` then `<base>#r<ts>`). Finds
   * the single `posted` entry whose sourceId starts with `sourceIdBase`.
   */
  async reverseLive(
    sourceType: string,
    sourceIdBase: string,
    opts: { date?: Date; createdById?: string | null } = {},
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string } | null> {
    const db: Db = tx ?? this.prisma;
    const orig = await db.journalEntry.findFirst({
      where: { sourceType, sourceId: { startsWith: sourceIdBase }, status: 'posted' },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!orig) return null;
    return this.reverseEntry(orig, opts, db);
  }

  // ─── Event posting rules ───────────────────────────────────────────────────

  /** Invoice issued/approved: Dr AR / Cr Income / Cr Tax. */
  async postInvoiceIssued(
    invoice: {
      id: string; invoiceNumber: string; issueDate: Date; currency: string; exchangeRate: number | null;
      subtotal: Prisma.Decimal | number; tax: Prisma.Decimal | number; total: Prisma.Decimal | number;
      customerId: string; taxRate?: number; costCenterId?: string | null;
    },
    tx?: Prisma.TransactionClient,
    createdById?: string,
    sourceId?: string,
  ) {
    if (!(await this.shouldPost(invoice.issueDate))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const ar = await this.requireCode(gl.defaultArAccount, 'Accounts Receivable', db);
    const income = await this.requireCode(gl.defaultIncomeAccount, 'Sales Income', db);
    const total = Number(invoice.total);
    const subtotal = Number(invoice.subtotal);
    const tax = Number(invoice.tax);
    const rate = invoice.exchangeRate;

    const lines: PostLine[] = [
      { accountId: ar, debit: total, currency: invoice.currency, rate, customerId: invoice.customerId, costCenterId: invoice.costCenterId, memo: `AR ${invoice.invoiceNumber}` },
      { accountId: income, credit: subtotal, currency: invoice.currency, rate, customerId: invoice.customerId, costCenterId: invoice.costCenterId },
    ];
    if (tax > 0.005) {
      const code = (await this.taxLiabilityCode(invoice.taxRate, db)) ?? gl.defaultTaxPayable;
      const taxAcc = await this.requireCode(code, 'Tax Payable', db);
      lines.push({ accountId: taxAcc, credit: tax, currency: invoice.currency, rate, customerId: invoice.customerId, costCenterId: invoice.costCenterId });
    }
    void base;
    await this.post(
      { sourceType: 'Invoice', sourceId: sourceId ?? invoice.id, date: invoice.issueDate, memo: `Invoice ${invoice.invoiceNumber}`, createdById, lines },
      tx,
    );
  }

  /** Invoice payment: Dr Cash / Cr AR / realized FX gain or loss. */
  async postInvoicePayment(
    payment: { id: string; amount: Prisma.Decimal | number; currency: string; date: Date; accountId: string | null },
    invoice: { id: string; invoiceNumber: string; currency: string; exchangeRate: number | null; customerId: string },
    tx?: Prisma.TransactionClient,
    createdById?: string,
    sourceId?: string,
  ) {
    if (!payment.accountId) return; // no cash account → can't post a balanced cash entry
    if (!(await this.shouldPost(payment.date))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const cash = await this.coaIdForCashAccount(payment.accountId, db);
    if (!cash) {
      throw new BadRequestException('GL posting failed: the payment account is not linked to a GL account.');
    }
    const ar = await this.requireCode(gl.defaultArAccount, 'Accounts Receivable', db);
    const amount = Number(payment.amount);

    // Cash arrives at the payment-date rate; AR is relieved at the invoice's
    // historical rate. The base-currency difference is realized FX.
    const baseCash = await this.currency.toBase(amount, payment.currency);
    const baseAr = await this.currency.toBase(amount, invoice.currency, invoice.exchangeRate);
    const fx = baseCash - baseAr; // >0 = gain, <0 = loss

    const lines: PostLine[] = [
      { accountId: cash, debit: amount, currency: payment.currency, baseAmount: baseCash, customerId: invoice.customerId, memo: `Payment ${invoice.invoiceNumber}` },
      { accountId: ar, credit: amount, currency: invoice.currency, baseAmount: -baseAr, customerId: invoice.customerId },
    ];
    if (Math.abs(fx) > POST_TOLERANCE) {
      const fxAcc = await this.requireCode(gl.defaultFxGainLossAccount, 'FX Gain/Loss', db);
      lines.push(this.fxLine(fxAcc, -fx, base));
    }
    await this.post(
      { sourceType: 'InvoicePayment', sourceId: sourceId ?? payment.id, date: payment.date, memo: `Payment for ${invoice.invoiceNumber}`, createdById, lines },
      tx,
    );
  }

  /** Vendor bill: Dr Expense / Dr Tax recoverable / Cr AP. (GRNI handled in Phase 4.) */
  async postVendorBill(
    bill: {
      id: string; billNumber: string; currency: string; supplierId: string;
      subtotal: Prisma.Decimal | number; tax: Prisma.Decimal | number; total: Prisma.Decimal | number;
      issueDate?: Date | null; createdAt: Date; taxRate?: number; costCenterId?: string | null;
      exchangeRate?: number | null;
    },
    tx?: Prisma.TransactionClient,
    createdById?: string,
    opts: { useGrni?: boolean } = {},
    sourceId?: string,
  ) {
    const date = bill.issueDate ?? bill.createdAt;
    if (!(await this.shouldPost(date))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    // For received goods, clear the GRNI accrual; otherwise expense the goods.
    const goodsAccount = opts.useGrni
      ? await this.requireCode(gl.defaultGrni, 'Goods Received Not Invoiced', db)
      : await this.requireCode(gl.defaultExpense, 'General Expense', db);
    const ap = await this.requireCode(gl.defaultApAccount, 'Accounts Payable', db);
    const subtotal = Number(bill.subtotal);
    const tax = Number(bill.tax);
    const total = Number(bill.total);
    // Book every leg at the bill's captured rate, so the payment path can relieve
    // AP at the same historical rate and the account clears to zero (mirrors Invoice).
    const rate = bill.exchangeRate;

    const lines: PostLine[] = [
      { accountId: goodsAccount, debit: subtotal, currency: bill.currency, rate, supplierId: bill.supplierId, costCenterId: bill.costCenterId, memo: `Bill ${bill.billNumber}` },
      { accountId: ap, credit: total, currency: bill.currency, rate, supplierId: bill.supplierId, costCenterId: bill.costCenterId },
    ];
    if (tax > 0.005) {
      const code = (await this.taxInputCode(bill.taxRate, db)) ?? gl.defaultTaxRecoverable ?? gl.defaultTaxPayable;
      const taxAcc = await this.requireCode(code, 'Tax Recoverable', db);
      lines.push({ accountId: taxAcc, debit: tax, currency: bill.currency, rate, supplierId: bill.supplierId, costCenterId: bill.costCenterId });
    }
    await this.post(
      { sourceType: 'VendorBill', sourceId: sourceId ?? bill.id, date, memo: `Vendor Bill ${bill.billNumber}`, createdById, lines },
      tx,
    );
  }

  /**
   * Expense report approved: Dr Expense / Cr AP. The credit lands in Accounts
   * Payable as a reimbursement liability to the employee (cleared when they are
   * paid), mirroring the vendor-bill treatment. Items carry no currency, so the
   * total is posted in the workspace base currency.
   */
  async postExpenseReport(
    report: {
      id: string; title: string; createdAt: Date;
      costCenterId?: string | null;
      expenses: { amount: Prisma.Decimal | number }[];
    },
    tx?: Prisma.TransactionClient,
    createdById?: string,
    sourceId?: string,
  ) {
    if (!(await this.shouldPost(report.createdAt))) return;
    const total = report.expenses.reduce((s, e) => s + Number(e.amount), 0);
    // Skip only a genuinely zero report. A net-negative report (refund/credit
    // lines outweighing expenses) must still post a reversing-direction entry —
    // `post()` handles signed debit/credit legs (see fxLine).
    if (Math.abs(total) < POST_TOLERANCE) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const expense = await this.requireCode(gl.defaultExpense, 'General Expense', db);
    const ap = await this.requireCode(gl.defaultApAccount, 'Accounts Payable', db);
    await this.post(
      {
        sourceType: 'ExpenseReport', sourceId: sourceId ?? report.id, date: report.createdAt,
        memo: `Expense ${report.title}`, createdById,
        lines: [
          { accountId: expense, debit: total, currency: base, costCenterId: report.costCenterId, memo: report.title },
          { accountId: ap, credit: total, currency: base, costCenterId: report.costCenterId },
        ],
      },
      tx,
    );
  }

  /** Cost of goods sold on a stock-out: Dr COGS / Cr Inventory = qty × unit cost (base). */
  async postCogs(
    move: { id: string; qty: number; unitCost: number; date: Date; productId: string; warehouseId?: string | null },
    tx?: Prisma.TransactionClient,
    createdById?: string,
  ) {
    const amount = Math.abs(move.qty) * move.unitCost;
    if (amount < POST_TOLERANCE) return;
    if (!(await this.shouldPost(move.date))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const cogs = await this.requireCode(gl.defaultCogs, 'Cost of Goods Sold', db);
    const inventory = await this.requireCode(gl.defaultInventoryAsset, 'Inventory Asset', db);
    await this.post(
      {
        sourceType: 'StockCogs', sourceId: move.id, date: move.date, memo: 'COGS', createdById,
        lines: [
          { accountId: cogs, debit: amount, currency: base, productId: move.productId, warehouseId: move.warehouseId ?? undefined },
          { accountId: inventory, credit: amount, currency: base, productId: move.productId, warehouseId: move.warehouseId ?? undefined },
        ],
      },
      tx,
    );
  }

  /** Reverses COGS on a return: Dr Inventory / Cr COGS = qty × original unit cost (base). */
  async postCogsReversal(
    move: { id: string; qty: number; unitCost: number; date: Date; productId: string; warehouseId?: string | null },
    tx?: Prisma.TransactionClient,
    createdById?: string,
  ) {
    const amount = Math.abs(move.qty) * move.unitCost;
    if (amount < POST_TOLERANCE) return;
    if (!(await this.shouldPost(move.date))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const cogs = await this.requireCode(gl.defaultCogs, 'Cost of Goods Sold', db);
    const inventory = await this.requireCode(gl.defaultInventoryAsset, 'Inventory Asset', db);
    await this.post(
      {
        sourceType: 'StockCogsReversal', sourceId: move.id, date: move.date, memo: 'COGS reversal (return)', createdById,
        lines: [
          { accountId: inventory, debit: amount, currency: base, productId: move.productId, warehouseId: move.warehouseId ?? undefined },
          { accountId: cogs, credit: amount, currency: base, productId: move.productId, warehouseId: move.warehouseId ?? undefined },
        ],
      },
      tx,
    );
  }

  /** Goods received (pre-bill): Dr Inventory / Cr GRNI = qty × unit cost (base). */
  async postGrni(
    move: { id: string; qty: number; unitCost: number; date: Date; productId: string; warehouseId?: string | null; supplierId?: string },
    tx?: Prisma.TransactionClient,
    createdById?: string,
  ) {
    const amount = Math.abs(move.qty) * move.unitCost;
    if (amount < POST_TOLERANCE) return;
    if (!(await this.shouldPost(move.date))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const inventory = await this.requireCode(gl.defaultInventoryAsset, 'Inventory Asset', db);
    const grni = await this.requireCode(gl.defaultGrni, 'Goods Received Not Invoiced', db);
    await this.post(
      {
        sourceType: 'StockReceipt', sourceId: move.id, date: move.date, memo: 'Goods received', createdById,
        lines: [
          { accountId: inventory, debit: amount, currency: base, productId: move.productId, warehouseId: move.warehouseId ?? undefined, supplierId: move.supplierId },
          { accountId: grni, credit: amount, currency: base, supplierId: move.supplierId },
        ],
      },
      tx,
    );
  }

  /** Vendor bill payment: Dr AP / Cr Cash / realized FX. */
  async postVendorBillPayment(
    payment: { id: string; amount: Prisma.Decimal | number; currency: string; date: Date; accountId: string | null },
    bill: { id: string; billNumber: string; currency: string; supplierId: string; exchangeRate?: number | null },
    tx?: Prisma.TransactionClient,
    createdById?: string,
    sourceId?: string,
  ) {
    if (!payment.accountId) return;
    if (!(await this.shouldPost(payment.date))) return;
    const db: Db = tx ?? this.prisma;
    const gl = await this.getGlConfig();
    const base = await this.currency.getBaseCurrency();
    const cash = await this.coaIdForCashAccount(payment.accountId, db);
    if (!cash) {
      throw new BadRequestException('GL posting failed: the payment account is not linked to a GL account.');
    }
    const ap = await this.requireCode(gl.defaultApAccount, 'Accounts Payable', db);
    const amount = Number(payment.amount);
    // Cash leaves at the payment-date rate; AP is relieved at the bill's recorded
    // historical rate. The base-currency difference is realized FX (mirrors
    // postInvoicePayment). Relieving AP at the current rate would never clear it.
    const baseCash = await this.currency.toBase(amount, payment.currency);
    const baseAp = await this.currency.toBase(amount, bill.currency, bill.exchangeRate);
    const fx = baseAp - baseCash;

    const lines: PostLine[] = [
      { accountId: ap, debit: amount, currency: bill.currency, baseAmount: baseAp, rate: bill.exchangeRate, supplierId: bill.supplierId, memo: `Payment ${bill.billNumber}` },
      { accountId: cash, credit: amount, currency: payment.currency, baseAmount: -baseCash, supplierId: bill.supplierId },
    ];
    if (Math.abs(fx) > POST_TOLERANCE) {
      const fxAcc = await this.requireCode(gl.defaultFxGainLossAccount, 'FX Gain/Loss', db);
      lines.push(this.fxLine(fxAcc, -fx, base));
    }
    await this.post(
      { sourceType: 'VendorBillPayment', sourceId: sourceId ?? payment.id, date: payment.date, memo: `Payment for ${bill.billNumber}`, createdById, lines },
      tx,
    );
  }
}
