import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { EditPaymentDto } from './dto/edit-payment.dto';
import { calcTotals, deriveInvoiceStatus, paymentTolerance } from './finance.math';
import { UNPAGINATED_MAX } from '../common/paginate';
import { CurrencyService } from '../common/currency.service';
import { withSerializableRetry } from '../common/prisma-retry';
import { InventoryService } from '../inventory/inventory.service';
import { ApprovalService } from '../common/approval.service';
import { CustomFieldsService } from '../common/custom-fields.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { PostingService } from '../accounting/posting.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, title: true } },
  fromQuote: { select: { id: true, quoteNumber: true } },
  costCenter: { select: { id: true, code: true, name: true } },
  items: { orderBy: { order: 'asc' as const } },
  updatedBy: { select: { id: true, name: true } },
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
    private readonly inventory: InventoryService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
    private readonly visibility: VisibilityService,
    private readonly posting: PostingService,
    private readonly currency: CurrencyService,
    private readonly workspaceConfig: WorkspaceConfigService,
  ) {}

  /** Resolve the default tax-inclusive mode from the org's invoice defaults. */
  private async defaultTaxInclusive(): Promise<boolean> {
    const config = await this.workspaceConfig.get();
    const defaults = (config.invoiceDefaults as { taxInclusive?: boolean } | null) ?? {};
    return defaults.taxInclusive ?? false;
  }

  /**
   * Posts the invoice-issued GL entry (Dr AR / Cr Income / Cr Tax) once an
   * invoice becomes approved. No-op when GL posting is disabled, before the
   * cutover date, or already posted (idempotent on the invoice id).
   */
  private async postInvoiceIssued(invoiceId: string, userId: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
    if (!inv) return;
    // If a prior issued entry exists (approve → reject reversed it → re-approve),
    // the base sourceId is taken; post() is idempotent on (sourceType,sourceId)
    // and would no-op. Re-post under a versioned sourceId so AR is re-recognized.
    const prior = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'Invoice', sourceId: { startsWith: invoiceId } }, select: { id: true },
    });
    await this.posting.postInvoiceIssued(inv, undefined, userId, prior ? `${invoiceId}#r${Date.now()}` : undefined);
  }

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string, permissions: string[]): boolean {
    if (permissions.includes('*')) return true;
    // Empty approverRoles with approvals enabled means admins-only; don't let anyone through.
    if (!approverRoles.length) return false;
    return approverRoles.includes(userRole);
  }

  /**
   * Recomputes an invoice's totalPaid as the authoritative SUM of its payments,
   * derives its status, and keeps the linked deal's won/active state in sync.
   * Running on every payment mutation (record, edit, delete) ensures the deal
   * can never stay "won" after a payment is reversed.
   */
  private async recalcInvoiceTotals(tx: Prisma.TransactionClient, invoiceId: string) {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return null;
    const agg = await tx.invoicePayment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });
    const totalPaid = Number(agg._sum.amount ?? 0);
    const total = Number(invoice.total);
    const status = deriveInvoiceStatus(total, totalPaid, invoice.dueDate) as Prisma.InvoiceUpdateInput['status'];
    const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { totalPaid, status } });

    // Sync the linked deal's pipeline stage with payment state.
    if (invoice.dealId) {
      const deal = await tx.deal.findUnique({ where: { id: invoice.dealId } });
      if (deal && deal.status !== 'lost' && deal.status !== 'cancelled') {
        if (totalPaid >= total) {
          await tx.deal.update({ where: { id: invoice.dealId }, data: { status: 'won' } });
        } else if (deal.status === 'won') {
          // Payment reversed or reduced — walk the deal back to an active stage.
          await tx.deal.update({ where: { id: invoice.dealId }, data: { status: 'negotiation' } });
        }
      }
    }

    return updated;
  }

  /**
   * Moves an account's balance by `delta` (positive = money in) atomically.
   * Blocks cross-currency moves rather than silently corrupting the balance.
   */
  private async applyAccountDelta(
    tx: Prisma.TransactionClient,
    accountId: string | null | undefined,
    paymentCurrency: string,
    delta: number,
  ) {
    if (!accountId || !delta) return;
    const account = await tx.account.findFirst({ where: { id: accountId, deletedAt: null } });
    if (!account) throw new BadRequestException('Account not found');
    if (account.currency !== paymentCurrency) {
      throw new BadRequestException(
        `Payment currency (${paymentCurrency}) must match the account currency (${account.currency})`,
      );
    }
    await tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
  }

  async getInvoices(query: Record<string, string>, user: AuthUser) {
    const { status, customer, deal, page, limit: limitRaw, q } = query;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    const where: Prisma.InvoiceWhereInput = { deletedAt: null, ...scopeWhere };
    if (status) where.status = status as Prisma.InvoiceWhereInput['status'];
    if (customer) where.customerId = customer;
    if (deal) where.dealId = deal;
    if (q) where.OR = [{ invoiceNumber: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }];

    if (!page) {
      const invoices = await this.prisma.invoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(invoices);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async getInvoiceById(id: string, user?: AuthUser) {
    const scopeWhere = user ? await this.visibility.ownershipWhere(user, 'invoices', 'createdById') : {};
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null, ...scopeWhere }, include: INVOICE_INCLUDE });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const payments = await this.prisma.invoicePayment.findMany({
      where: { invoiceId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    return { invoice: toClient(invoice), payments: toClient(payments) };
  }

  async createInvoice(body: CreateInvoiceDto, userId: string) {
    const { items = [], taxRate = 0, customer, deal, customFields: rawCf, taxInclusive: bodyTaxInclusive, ...rest } = body;
    const taxInclusive = bodyTaxInclusive ?? (await this.defaultTaxInclusive());
    const totals = calcTotals(items, taxRate, taxInclusive);
    const invoiceNumber = await this.numberSequence.nextNumber('invoice', 'INV');
    const enabled = await this.approvals.isEnabled('invoices');
    const customFields = await this.customFields.validateAndClean('invoices', rawCf);

    // Create the invoice, draw stock + book COGS, and post the issued GL entry as
    // one atomic unit. Previously these ran sequentially outside any transaction,
    // so a mid-loop failure left partial stock depletion and partial/missing
    // COGS/issued entries — the very drift reconciliation.service is built to detect.
    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          ...rest,
          ...(customFields !== undefined ? { customFields } : {}),
          invoiceNumber,
          taxRate,
          taxInclusive,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          approvalStatus: enabled ? 'pending' : 'approved',
          issueDate: rest.issueDate ? new Date(rest.issueDate) : new Date(),
          customerId: customer,
          ...(deal ? { dealId: deal } : {}),
          createdById: userId,
          items: { create: totals.items.map((it, idx) => ({ ...it, order: idx })) },
        } as Prisma.InvoiceUncheckedCreateInput,
        include: INVOICE_INCLUDE,
      });

      // Build the approval chain. If no step applies (amount below thresholds),
      // the document is auto-approved.
      if (enabled) {
        const overall = await this.approvals.initSteps(tx, 'Invoice', inv.id, 'invoices', Number(inv.total));
        if (overall === 'approved') {
          await tx.invoice.update({ where: { id: inv.id }, data: { approvalStatus: 'approved' } });
          (inv as { approvalStatus: string }).approvalStatus = 'approved';
        }
      }
      // A sale draws stock-tracked items out of stock and books COGS.
      for (const it of totals.items) {
        if (!it.productId) continue;
        const product = await tx.product.findUnique({ where: { id: it.productId }, select: { tracksInventory: true } });
        if (!product?.tracksInventory) continue;
        const move = await this.inventory.applyMovement({
          productId: it.productId, qty: -it.quantity, type: 'out', refType: 'Invoice', refId: inv.id, userId,
        }, tx);
        if (move) {
          await this.posting.postCogs(
            { id: move.id, qty: move.qty, unitCost: Number(move.unitCost ?? 0), date: move.createdAt, productId: it.productId, warehouseId: move.warehouseId },
            tx, userId,
          );
        }
      }

      // Auto-approved (approvals disabled) → post the issued GL entry now, since
      // approveInvoice won't be called for this invoice.
      if (inv.approvalStatus === 'approved') {
        await this.posting.postInvoiceIssued(inv, tx, userId);
      }
      return inv;
    });

    await this.timeline.log('invoice.created', `Invoice ${invoice.invoiceNumber} created`, invoice.id, 'Invoice', { total: invoice.total, currency: invoice.currency }, userId);
    return toClient(invoice);
  }

  async updateInvoice(id: string, body: UpdateInvoiceDto, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const { items, taxRate, customer: _customer, deal: _deal, issueDate, dueDate, taxInclusive, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (taxInclusive !== undefined) data.taxInclusive = taxInclusive;
    if (issueDate !== undefined) data.issueDate = issueDate ? new Date(issueDate) : undefined;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'invoices',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    if (invoice.approvalStatus === 'rejected') data.approvalStatus = 'pending';
    // Post-approval edits reset the document back to pending for re-review.
    if (items && invoice.approvalStatus === 'approved') data.approvalStatus = 'pending';

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        const tr = taxRate !== undefined ? taxRate : invoice.taxRate;
        const inclusive = taxInclusive !== undefined ? taxInclusive : invoice.taxInclusive;
        const totals = calcTotals(items, tr, inclusive);
        // Replace line items atomically with the recomputed totals.
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        data.taxRate = tr;
        data.taxInclusive = inclusive;
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.items = { create: totals.items.map((it, idx) => ({ ...it, order: idx })) };
      }
      await tx.invoice.update({ where: { id }, data: data as Prisma.InvoiceUncheckedUpdateInput });
      // Totals changed → re-derive paid status from the existing payments.
      if (items) await this.recalcInvoiceTotals(tx, id);
      return tx.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    });
    return toClient(updated);
  }

  async sendInvoice(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus !== 'approved') throw new BadRequestException('Invoice must be approved before sending');
    // Idempotent: re-sending an already-sent invoice (double-click, retry) is a
    // no-op that returns the current invoice, not a 400.
    if (invoice.status !== 'draft') {
      const full = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
      return toClient(full);
    }
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
      include: INVOICE_INCLUDE,
    });
    await this.timeline.log('invoice.sent', `Invoice ${invoice.invoiceNumber} sent`, id, 'Invoice', {}, userId);

    // Deduct stock for product-linked line items (fire-and-forget; non-blocking on soft errors).
    const alreadyDeducted = await this.prisma.stockMovement.findFirst({ where: { refType: 'Invoice', refId: id } });
    if (!alreadyDeducted) {
      for (const item of invoice.items) {
        if (item.productId && item.quantity > 0) {
          try {
            const product = await this.prisma.product.findUnique({ where: { id: item.productId }, select: { tracksInventory: true } });
            if (!product?.tracksInventory) continue;
            const move = await this.inventory.applyMovement({
              productId: item.productId,
              qty: -item.quantity,
              type: 'out',
              refType: 'Invoice',
              refId: id,
              note: `Invoice ${invoice.invoiceNumber}`,
              userId,
            });
            if (move) {
              await this.posting.postCogs(
                { id: move.id, qty: move.qty, unitCost: Number(move.unitCost ?? 0), date: move.createdAt, productId: item.productId, warehouseId: move.warehouseId },
                undefined, userId,
              );
            }
          } catch {
            // Log but don't fail the send if stock is untracked for this product.
          }
        }
      }
    }

    return toClient(updated);
  }

  async deleteInvoice(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null, ...scopeWhere } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    // Deleting an invoice that has recorded payments would hide the document
    // while its payments — and the account balance they moved — remain. Require
    // the payments to be voided first so the ledger stays reconciled.
    const paymentCount = await this.prisma.invoicePayment.count({ where: { invoiceId: id } });
    if (paymentCount > 0) {
      throw new BadRequestException('Cannot delete an invoice that has payments. Delete its payments first.');
    }
    // Soft delete; payment history is preserved for audit but excluded from
    // listings (payments are filtered by invoice.deletedAt).
    await this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async approveInvoice(id: string, userId: string, userRole: string, userPermissions: string[] = []) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus === 'approved') return toClient(invoice);

    // Chain path: advance the next pending step. Only the final approval flips
    // the document to 'approved'; earlier steps leave it pending.
    const steps = await this.approvals.listSteps('Invoice', id);
    if (steps.length) {
      const result = await this.approvals.act('Invoice', id, userId, userRole, invoice.createdById, 'approve', undefined, userPermissions);
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.invoice.update({
        where: { id },
        data: { approvalStatus: result.status, ...(finalApproved ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null } : {}) },
        include: INVOICE_INCLUDE,
      });
      if (finalApproved) await this.postInvoiceIssued(id, userId);
      return toClient(updated);
    }

    // Legacy single-approver path (no chain persisted).
    const { approverRoles } = await this.getApprovalConfig('invoices');
    if (!this.canUserApprove(approverRoles, userRole, userPermissions)) throw new ForbiddenException('You are not authorized to approve invoices');
    if (invoice.createdById === userId && !userPermissions.includes('*')) throw new ForbiddenException('You cannot approve an invoice you created');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: INVOICE_INCLUDE,
    });
    await this.postInvoiceIssued(id, userId);
    return toClient(updated);
  }

  async rejectInvoice(id: string, userId: string, reason: string, userRole: string, userPermissions: string[] = []) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus === 'rejected') return toClient(invoice);

    const steps = await this.approvals.listSteps('Invoice', id);
    if (steps.length) {
      await this.approvals.act('Invoice', id, userId, userRole, invoice.createdById, 'reject', reason, userPermissions);
      const updated = await this.prisma.$transaction(async (tx) => {
        // Reverse the issued GL entry that approval posted (idempotent no-op when
        // nothing was posted). A later re-approval re-posts under a versioned id.
        await this.posting.reverseLive('Invoice', id, { createdById: userId }, tx);
        return tx.invoice.update({
          where: { id },
          // Clear any prior approval: rejecting a previously-approved invoice must
          // not leave stale approvedBy/approvedAt behind.
          data: { approvalStatus: 'rejected', approvedById: null, approvedAt: null, rejectionReason: reason },
          include: INVOICE_INCLUDE,
        });
      });
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('invoices');
    if (!this.canUserApprove(approverRoles, userRole, userPermissions)) throw new ForbiddenException('You are not authorized to reject invoices');
    if (invoice.createdById === userId && !userPermissions.includes('*')) throw new ForbiddenException('You cannot reject an invoice you created');
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.posting.reverseLive('Invoice', id, { createdById: userId }, tx);
      return tx.invoice.update({
        where: { id },
        // Clear any prior approval (see chain path above).
        data: { approvalStatus: 'rejected', approvedById: null, approvedAt: null, rejectionReason: reason },
        include: INVOICE_INCLUDE,
      });
    });
    return toClient(updated);
  }

  async recordPayment(invoiceId: string, body: RecordPaymentDto, user: AuthUser) {
    const userId = user.id;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null, ...scopeWhere } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.approvalStatus !== 'approved') throw new BadRequestException('Invoice must be approved before recording payment');
    if (invoice.status === 'cancelled') throw new BadRequestException('Cannot record a payment against a cancelled invoice');

    const amount = Number(body.amount);
    const currency = body.currency ?? invoice.currency;

    const { payment } = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      // Re-fetch inside the serializable transaction so concurrent payments
      // cannot both pass the outstanding check on a stale snapshot.
      const fresh = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!fresh) throw new BadRequestException('Invoice not found');
      const outstanding = Number(fresh.total) - Number(fresh.totalPaid ?? 0);
      // Compare in the invoice currency: convert a foreign-currency payment at
      // the invoice's recorded exchange rate so overpayment is caught regardless
      // of the payment currency. Tolerance is sized to the invoice currency.
      const amountInInvoiceCcy = await this.currency.convert(amount, currency, fresh.currency, undefined, fresh.exchangeRate);
      if (amountInInvoiceCcy > outstanding + paymentTolerance(fresh.currency)) {
        throw new BadRequestException(
          `Payment of ${amount} ${currency} exceeds the outstanding balance of ${outstanding.toFixed(2)} ${fresh.currency}`,
        );
      }

      const payment = await tx.invoicePayment.create({
        data: { ...body, amount, currency, date: new Date(body.date), invoiceId, createdById: userId } as Prisma.InvoicePaymentUncheckedCreateInput,
        include: { createdBy: { select: { id: true, name: true } } },
      });

      // Money in: increment the linked account's balance (currency-checked).
      await this.applyAccountDelta(tx, body.accountId, currency, amount);

      // GL: Dr Cash / Cr AR / realized FX — in the same transaction as the cache.
      await this.posting.postInvoicePayment(payment, invoice, tx, userId);

      const updatedInvoice = await this.recalcInvoiceTotals(tx, invoiceId);
      return { payment, updatedInvoice };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    await this.timeline.log('payment.received', `Payment of ${amount} ${currency} recorded`, invoiceId, 'Invoice', { amount, currency, method: payment.method }, userId);

    const full = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: INVOICE_INCLUDE });
    return { payment: toClient(payment), invoice: toClient(full) };
  }

  async deleteInvoicePayment(invoiceId: string, paymentId: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    const payment = await this.prisma.invoicePayment.findFirst({ where: { id: paymentId, invoiceId, invoice: { deletedAt: null, ...scopeWhere } } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.$transaction(async (tx) => {
      // GL: reverse the payment's journal entry before deleting the row.
      await this.posting.reverseLive('InvoicePayment', paymentId, { createdById: user.id }, tx);
      await tx.invoicePayment.delete({ where: { id: paymentId } });
      // Money out: reverse the balance move this payment had applied.
      await this.applyAccountDelta(tx, payment.accountId, payment.currency, -Number(payment.amount));
      await this.recalcInvoiceTotals(tx, invoiceId);
    });
    return true;
  }

  async editPayment(invoiceId: string, paymentId: string, body: EditPaymentDto, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    const payment = await this.prisma.invoicePayment.findFirst({ where: { id: paymentId, invoiceId, invoice: { deletedAt: null, ...scopeWhere } } });
    if (!payment) throw new NotFoundException('Payment not found');
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null, ...scopeWhere } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const newAmount = Number(body.amount);
    const newCurrency = body.currency ?? payment.currency;
    const newAccountId = body.accountId !== undefined ? body.accountId : payment.accountId;

    const updated = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      // Re-fetch invoice and payment inside the serializable transaction so the
      // outstanding check sees a consistent snapshot. Doing this check outside
      // the transaction (or without serializable isolation) allowed two
      // concurrent edits — or an edit racing a new payment — to push totalPaid
      // past the invoice total.
      const fresh = await tx.invoice.findUnique({ where: { id: invoiceId } });
      const freshPayment = await tx.invoicePayment.findUnique({ where: { id: paymentId } });
      if (!fresh) throw new NotFoundException('Invoice not found');
      if (!freshPayment) throw new NotFoundException('Payment not found');

      // Reject edits that would push totalPaid past the invoice total. Outstanding
      // is computed excluding this payment's current amount. Foreign-currency
      // edits are converted at the invoice's recorded rate (previously skipped,
      // which let a cross-currency edit overpay unchecked).
      const outstandingExcl = Number(fresh.total) - (Number(fresh.totalPaid ?? 0) - Number(freshPayment.amount));
      const newAmountInInvoiceCcy = await this.currency.convert(newAmount, newCurrency, fresh.currency, undefined, fresh.exchangeRate);
      if (newAmountInInvoiceCcy > outstandingExcl + paymentTolerance(fresh.currency)) {
        throw new BadRequestException(
          `Payment of ${newAmount} ${newCurrency} exceeds the outstanding balance of ${outstandingExcl.toFixed(2)} ${fresh.currency}`,
        );
      }

      // Reverse the old payment's effect on its account, then apply the new one.
      // Handles amount, currency, and account changes (including moving between
      // accounts) without double-counting.
      await this.applyAccountDelta(tx, freshPayment.accountId, freshPayment.currency, -Number(freshPayment.amount));
      // GL: reverse the old payment entry; the corrected one is re-posted below
      // under a versioned sourceId so idempotency on the original id is preserved.
      await this.posting.reverseLive('InvoicePayment', paymentId, { createdById: user.id }, tx);

      const updated = await tx.invoicePayment.update({
        where: { id: paymentId },
        data: { ...body, amount: newAmount, currency: newCurrency, date: body.date ? new Date(body.date) : freshPayment.date } as Prisma.InvoicePaymentUncheckedUpdateInput,
      });

      await this.applyAccountDelta(tx, newAccountId, newCurrency, newAmount);
      await this.posting.postInvoicePayment(updated, invoice, tx, user.id, `${paymentId}#r${Date.now()}`);
      await this.recalcInvoiceTotals(tx, invoiceId);
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    return toClient(updated);
  }

  async getPayments(query: Record<string, string>, user: AuthUser) {
    const p = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, parseInt(query.limit) || 25);
    const scopeWhere = await this.visibility.ownershipWhere(user, 'invoices', 'createdById');
    // Exclude payments whose invoice has been (soft) deleted; scope to user's visible invoices.
    const where = { invoice: { deletedAt: null, ...scopeWhere } };
    const [data, total] = await Promise.all([
      this.prisma.invoicePayment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, title: true, customer: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (p - 1) * limit,
        take: limit,
      }),
      this.prisma.invoicePayment.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }
}
