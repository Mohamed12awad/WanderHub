import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { paginate, dateRange, UNPAGINATED_MAX } from '../common/paginate';
import { calcTotals, paymentTolerance } from '../finance/finance.math';
import { CurrencyService } from '../common/currency.service';
import { withSerializableRetry } from '../common/prisma-retry';
import { CreateVendorBillDto } from './dto/create-vendor-bill.dto';
import { UpdateVendorBillDto } from './dto/update-vendor-bill.dto';
import { RecordBillPaymentDto } from './dto/record-bill-payment.dto';
import { ApprovalService } from '../common/approval.service';
import { CustomFieldsService } from '../common/custom-fields.service';
import { PostingService } from '../accounting/posting.service';

const BILL_INCLUDE = {
  supplier: { select: { id: true, name: true, email: true, phone: true } },
  purchaseOrder: { select: { id: true, poNumber: true } },
  costCenter: { select: { id: true, code: true, name: true } },
  items: { orderBy: { order: 'asc' as const } },
  payments: { orderBy: { date: 'asc' as const } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
};

function deriveBillStatus(total: number, totalPaid: number, dueDate?: Date | null): string {
  if (totalPaid <= 0) return 'received';
  if (totalPaid >= total) return 'paid';
  if (dueDate && dueDate < new Date() && totalPaid < total) return 'overdue';
  return 'partially_paid';
}

@Injectable()
export class VendorBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
    private readonly posting: PostingService,
    private readonly currency: CurrencyService,
  ) {}

  /**
   * Posts the vendor-bill GL entry once approved. When the bill's PO was already
   * received into stock, the goods value clears GRNI (Dr GRNI / Cr AP); otherwise
   * it is expensed (Dr Expense / Cr AP).
   */
  private async postBillIssued(billId: string, userId: string, tx: Prisma.TransactionClient) {
    const bill = await tx.vendorBill.findFirst({ where: { id: billId, deletedAt: null } });
    if (!bill) return;
    // Re-post under a versioned sourceId when a prior (reversed) entry exists, so
    // re-approval after a reject re-recognizes AP instead of no-opping. See the
    // identical pattern in invoices.service postInvoiceIssued.
    const prior = await tx.journalEntry.findFirst({
      where: { sourceType: 'VendorBill', sourceId: { startsWith: billId } }, select: { id: true },
    });
    await this.posting.postVendorBill(
      bill, tx, userId,
      { useGrni: await this.wasReceived(bill.purchaseOrderId, tx) },
      prior ? `${billId}#r${Date.now()}` : undefined,
    );
  }

  /** True if the linked PO has been received into stock (GRNI was accrued). */
  private async wasReceived(purchaseOrderId: string | null, tx?: Prisma.TransactionClient): Promise<boolean> {
    if (!purchaseOrderId) return false;
    const db = tx ?? this.prisma;
    const mv = await db.stockMovement.findFirst({ where: { refType: 'po-receipt', refId: purchaseOrderId } });
    return !!mv;
  }

  private async getApprovalConfig() {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === 'vendor_bills');
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canApprove(approverRoles: string[], userRole: string) {
    if (['admin', 'super admin'].includes(userRole)) return true;
    return approverRoles.length > 0 && approverRoles.includes(userRole);
  }

  private cleanData(body: object) {
    const { _id, id, supplier, purchaseOrder, createdAt, updatedAt, items, ...rest } =
      body as Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest };
    if (supplier !== undefined) {
      data.supplierId =
        typeof supplier === 'object'
          ? ((supplier as { _id?: string; id?: string })?._id ?? (supplier as { _id?: string; id?: string })?.id)
          : supplier;
    }
    if (purchaseOrder !== undefined) {
      data.purchaseOrderId =
        purchaseOrder === '' || purchaseOrder === null
          ? null
          : typeof purchaseOrder === 'object'
            ? ((purchaseOrder as { _id?: string; id?: string })?._id ?? (purchaseOrder as { _id?: string; id?: string })?.id)
            : purchaseOrder;
    }
    return data;
  }

  private async recalcBillTotals(tx: Prisma.TransactionClient, billId: string) {
    const bill = await tx.vendorBill.findUnique({ where: { id: billId } });
    if (!bill) return null;
    const agg = await tx.vendorBillPayment.aggregate({ where: { billId }, _sum: { amount: true } });
    const totalPaid = Number(agg._sum.amount ?? 0);
    const status = deriveBillStatus(Number(bill.total), totalPaid, bill.dueDate) as Prisma.VendorBillUpdateInput['status'];
    return tx.vendorBill.update({ where: { id: billId }, data: { totalPaid, status } });
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status, supplierId, purchaseOrderId } = query;
    const where: Prisma.VendorBillWhereInput = { deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status as Prisma.VendorBillWhereInput['status'];
    if (supplierId) where.supplierId = supplierId;
    if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;

    if (!page) {
      const bills = await this.prisma.vendorBill.findMany({ where, include: BILL_INCLUDE, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(bills);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.vendorBill.findMany({ where, include: BILL_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.vendorBill.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const bill = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null }, include: BILL_INCLUDE });
    return bill ? toClient(bill) : null;
  }

  async create(body: CreateVendorBillDto, userId: string) {
    const { items = [], taxRate = 0, taxInclusive = false, ...rest } = body;
    const data = this.cleanData(rest);
    data.customFields = await this.customFields.validateAndClean(
      'vendorBills',
      data.customFields as Record<string, unknown> | undefined,
    );
    const totals = calcTotals(items, taxRate, taxInclusive);
    const billNumber = await this.numberSequence.nextNumber('bill', 'BILL');
    const enabled = await this.approvals.isEnabled('vendor_bills');
    // Pin the foreign→base rate now so AP is booked and later relieved at the
    // historical rate (toBase(1, ccy) yields the rate; 1 for base/unknown).
    const exchangeRate = await this.currency.toBase(1, (data.currency as string) ?? 'EGP');

    const bill = await this.prisma.$transaction(async (tx) => {
      let created = await tx.vendorBill.create({
        data: {
          ...data,
          billNumber,
          exchangeRate,
          taxRate,
          taxInclusive,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          approvalStatus: enabled ? 'pending' : 'approved',
          createdById: userId,
          items: {
            create: totals.items.map((item, idx) => ({ ...item, order: idx })),
          },
        } as Prisma.VendorBillUncheckedCreateInput,
        include: BILL_INCLUDE,
      });
      if (enabled) {
        const overall = await this.approvals.initSteps(tx, 'VendorBill', created.id, 'vendor_bills', Number(created.total));
        if (overall === 'approved') {
          created = await tx.vendorBill.update({
            where: { id: created.id },
            data: { approvalStatus: 'approved' },
            include: BILL_INCLUDE,
          });
        }
      }

      if (created.approvalStatus === 'approved') {
        await this.posting.postVendorBill(created, tx, userId, { useGrni: await this.wasReceived(created.purchaseOrderId, tx) });
      }
      return created;
    });

    await this.timeline.log('bill.created', `Vendor Bill ${billNumber} created`, bill.id, 'VendorBill', { billNumber }, userId);
    return toClient(bill);
  }

  async update(id: string, body: UpdateVendorBillDto, userId: string) {
    const existing = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    const { items, taxRate, taxInclusive, ...rest } = body;
    const data = this.cleanData(rest);
    if (typeof data.issueDate === 'string') data.issueDate = data.issueDate ? new Date(data.issueDate) : undefined;
    if (typeof data.dueDate === 'string') data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'vendorBills',
        data.customFields as Record<string, unknown> | undefined,
      );
    }

    const bill = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (items !== undefined) {
        await tx.vendorBillItem.deleteMany({ where: { billId: id } });
        const tr = taxRate ?? existing.taxRate;
        const inclusive = taxInclusive ?? existing.taxInclusive;
        const totals = calcTotals(items, tr, inclusive);
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.taxRate = tr;
        data.taxInclusive = inclusive;
        await tx.vendorBillItem.createMany({
          data: totals.items.map((item, idx) => ({ ...item, billId: id, order: idx })),
        });
      }
      if (existing.approvalStatus === 'rejected') data.approvalStatus = 'pending';
      if (items !== undefined && existing.approvalStatus === 'approved') data.approvalStatus = 'pending';
      return tx.vendorBill.update({
        where: { id },
        data: data as Prisma.VendorBillUncheckedUpdateInput,
        include: BILL_INCLUDE,
      });
    });

    await this.timeline.log('bill.updated', 'Vendor Bill updated', id, 'VendorBill', {}, userId);
    return toClient(bill);
  }

  async approve(id: string, userId: string, userRole: string) {
    const bill = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!bill) return null;
    if (bill.approvalStatus === 'approved') return toClient(bill);

    const steps = await this.approvals.listSteps('VendorBill', id);
    if (steps.length) {
      const updated = await this.prisma.$transaction(async (tx) => {
        // The step advance shares the transaction with the document update and
        // the GL post, so a posting failure cannot leave the step consumed.
        const result = await this.approvals.act('VendorBill', id, userId, userRole, bill.createdById, 'approve', undefined, [], tx);
        const finalApproved = result.status === 'approved';
        const changed = await tx.vendorBill.update({
          where: { id },
          data: {
            approvalStatus: result.status,
            ...(finalApproved
              ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null, status: bill.status === 'draft' ? 'received' : bill.status }
              : {}),
          },
          include: BILL_INCLUDE,
        });
        if (finalApproved) await this.postBillIssued(id, userId, tx);
        return { changed, status: result.status };
      });
      await this.timeline.log('bill.approved', `Vendor Bill approval advanced (${updated.status})`, id, 'VendorBill', {}, userId);
      return toClient(updated.changed);
    }

    const { enabled, approverRoles } = await this.getApprovalConfig();
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to approve');
    if (enabled && bill.createdById === userId && userRole !== 'super admin') throw new BadRequestException('Cannot approve your own bill');

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.vendorBill.update({
        where: { id },
        data: {
          approvalStatus: 'approved',
          approvedById: userId,
          approvedAt: new Date(),
          rejectionReason: null,
          // Advance the workflow status so the bill is ready for payment.
          status: bill.status === 'draft' ? 'received' : bill.status,
        },
        include: BILL_INCLUDE,
      });
      await this.postBillIssued(id, userId, tx);
      return changed;
    });
    await this.timeline.log('bill.approved', 'Vendor Bill approved', id, 'VendorBill', {}, userId);
    return toClient(updated);
  }

  async reject(id: string, userId: string, userRole: string, reason: string) {
    const bill = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!bill) return null;
    if (bill.approvalStatus === 'rejected') return toClient(bill);

    const steps = await this.approvals.listSteps('VendorBill', id);
    if (steps.length) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.approvals.act('VendorBill', id, userId, userRole, bill.createdById, 'reject', reason, [], tx);
        // Reverse the issued GL entry that approval posted (idempotent no-op when
        // nothing was posted). A later re-approval re-posts under a versioned id.
        await this.posting.reverseLive('VendorBill', id, { createdById: userId }, tx);
        return tx.vendorBill.update({
          where: { id },
          // Clear any prior approval so a rejected bill never keeps stale approvedBy/approvedAt.
          data: { approvalStatus: 'rejected', approvedById: null, approvedAt: null, rejectionReason: reason },
          include: BILL_INCLUDE,
        });
      });
      await this.timeline.log('bill.rejected', 'Vendor Bill rejected', id, 'VendorBill', { reason }, userId);
      return toClient(updated);
    }

    const { enabled, approverRoles } = await this.getApprovalConfig();
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to reject');

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.posting.reverseLive('VendorBill', id, { createdById: userId }, tx);
      return tx.vendorBill.update({
        where: { id },
        // Clear any prior approval (see chain path above).
        data: { approvalStatus: 'rejected', approvedById: null, approvedAt: null, rejectionReason: reason },
        include: BILL_INCLUDE,
      });
    });
    await this.timeline.log('bill.rejected', 'Vendor Bill rejected', id, 'VendorBill', { reason }, userId);
    return toClient(updated);
  }

  async recordPayment(billId: string, body: RecordBillPaymentDto, userId: string) {
    const bill = await this.prisma.vendorBill.findFirst({ where: { id: billId, deletedAt: null } });
    if (!bill) throw new NotFoundException('Vendor bill not found');
    if (bill.approvalStatus !== 'approved') throw new BadRequestException('Vendor bill must be approved before recording payment');
    if (bill.status === 'cancelled') throw new BadRequestException('Cannot record a payment against a cancelled vendor bill');

    const payCurrency = body.currency ?? bill.currency;

    const updated = await withSerializableRetry(() => this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-fetch inside the serializable transaction so concurrent payments
      // cannot both pass the outstanding check on a stale snapshot.
      const fresh = await tx.vendorBill.findUnique({ where: { id: billId } });
      if (!fresh) throw new NotFoundException('Vendor bill not found');
      const outstanding = Number(fresh.total) - Number(fresh.totalPaid ?? 0);
      // Compare in the bill currency: convert foreign-currency payments at the
      // bill's recorded rate so an overpayment is caught regardless of the payment
      // currency (mirrors the invoice path).
      const amountInBillCcy = await this.currency.convert(body.amount, payCurrency, fresh.currency, undefined, fresh.exchangeRate);
      if (amountInBillCcy > outstanding + paymentTolerance(fresh.currency)) {
        throw new BadRequestException(
          `Payment of ${body.amount} ${payCurrency} exceeds the outstanding balance of ${outstanding.toFixed(2)} ${fresh.currency}`,
        );
      }

      const payment = await tx.vendorBillPayment.create({
        data: {
          billId,
          amount: body.amount,
          currency: body.currency ?? bill.currency,
          date: new Date(body.date),
          method: body.method ?? 'cash',
          reference: body.reference,
          notes: body.notes,
          accountId: body.accountId ?? null,
          createdById: userId,
        },
      });

      // Decrease account balance (AP direction: money going out)
      if (body.accountId && body.amount) {
        const account = await tx.account.findFirst({ where: { id: body.accountId, deletedAt: null } });
        if (!account) throw new BadRequestException('Account not found');
        const currency = body.currency ?? bill.currency;
        if (account.currency !== currency) {
          throw new BadRequestException(`Payment currency (${currency}) must match account currency (${account.currency})`);
        }
        await tx.account.update({ where: { id: body.accountId }, data: { balance: { decrement: body.amount } } });
      }

      // GL: Dr AP / Cr Cash / realized FX — same transaction as the cache move.
      await this.posting.postVendorBillPayment(payment, bill, tx, userId);

      return this.recalcBillTotals(tx, billId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    return updated ? toClient(updated) : null;
  }

  async deletePayment(billId: string, paymentId: string) {
    const payment = await this.prisma.vendorBillPayment.findFirst({ where: { id: paymentId, billId } });
    if (!payment) return null;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // GL: reverse the payment entry before deleting the row.
      await this.posting.reverseLive('VendorBillPayment', paymentId, {}, tx);
      // Restore account balance
      if (payment.accountId) {
        await tx.account.update({ where: { id: payment.accountId }, data: { balance: { increment: payment.amount } } });
      }
      await tx.vendorBillPayment.delete({ where: { id: paymentId } });
      await this.recalcBillTotals(tx, billId);
    });

    return true;
  }

  /** Creates a Vendor Bill pre-filled from a Purchase Order's items and totals. */
  async createFromPO(poId: string, userId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, deletedAt: null },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!po) throw new BadRequestException('Purchase order not found');
    if (po.approvalStatus !== 'approved') throw new BadRequestException('Purchase order must be approved before creating a bill');

    // A PO must not be billed more than once: a second full-value bill for the
    // same goods would create a duplicate AP liability (the supplier could be
    // paid twice). Block creation when an active bill already exists.
    const existingBill = await this.prisma.vendorBill.findFirst({
      where: { purchaseOrderId: po.id, deletedAt: null },
      select: { id: true, billNumber: true },
    });
    if (existingBill) {
      throw new BadRequestException(
        `Purchase order already has a bill (${existingBill.billNumber}). Delete it before creating another.`,
      );
    }

    const billNumber = await this.numberSequence.nextNumber('bill', 'BILL');
    const { enabled } = await this.getApprovalConfig();
    const exchangeRate = await this.currency.toBase(1, po.currency ?? 'EGP');

    const bill = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vendorBill.create({
        data: {
          billNumber,
          title: `Bill for ${po.title}`,
          supplierId: po.supplierId,
          purchaseOrderId: po.id,
          currency: po.currency ?? 'EGP',
          exchangeRate,
          taxRate: po.taxRate,
          subtotal: po.subtotal,
          tax: po.tax,
          total: po.total,
          approvalStatus: enabled ? 'pending' : 'approved',
          createdById: userId,
          items: {
            create: po.items.map((it, idx) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount,
              taxRate: it.taxRate,
              taxCode: it.taxCode,
              productId: it.productId,
              total: it.total,
              order: idx,
            })),
          },
        } as Prisma.VendorBillUncheckedCreateInput,
        include: BILL_INCLUDE,
      });

      // Auto-approved (approvals disabled) → post now; clears GRNI if the PO was received.
      if (created.approvalStatus === 'approved') {
        await this.posting.postVendorBill(created, tx, userId, { useGrni: await this.wasReceived(created.purchaseOrderId, tx) });
      }
      return created;
    });

    await this.timeline.log('bill.created', `Vendor Bill ${billNumber} created from PO`, bill.id, 'VendorBill', { poId }, userId);
    return toClient(bill);
  }

  async remove(id: string) {
    const existing = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    // Deleting a bill that has recorded payments would hide the document while
    // its payments — and the account balance they moved — remain. Require the
    // payments to be voided first so the ledger stays reconciled.
    const paymentCount = await this.prisma.vendorBillPayment.count({ where: { billId: id } });
    if (paymentCount > 0) {
      throw new BadRequestException('Cannot delete a vendor bill that has payments. Delete its payments first.');
    }
    await this.prisma.vendorBill.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async getVendorPayments(query: Record<string, string>) {
    const { page, limit, method, currency, supplierId, date_from, date_to, amount_min, amount_max } = query;

    const where: Prisma.VendorBillPaymentWhereInput = {};
    if (method) where.method = method;
    if (currency) where.currency = currency;
    if (supplierId) where.bill = { supplierId };
    const dr = dateRange(date_from, date_to);
    if (dr) where.date = dr;
    if (amount_min || amount_max) {
      const range: Prisma.FloatFilter = {};
      if (amount_min) range.gte = parseFloat(amount_min);
      if (amount_max) range.lte = parseFloat(amount_max);
      where.amount = range;
    }

    return paginate(this.prisma.vendorBillPayment, {
      where,
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            title: true,
            supplier: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      page,
      limit,
    });
  }
}
