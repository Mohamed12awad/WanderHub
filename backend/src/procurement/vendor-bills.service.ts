import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { paginate, dateRange, UNPAGINATED_MAX } from '../common/paginate';
import { calcTotals } from '../finance/finance.math';
import { CreateVendorBillDto } from './dto/create-vendor-bill.dto';
import { UpdateVendorBillDto } from './dto/update-vendor-bill.dto';
import { RecordBillPaymentDto } from './dto/record-bill-payment.dto';
import { ApprovalService } from '../common/approval.service';

const BILL_INCLUDE = {
  supplier: { select: { id: true, name: true, email: true, phone: true } },
  purchaseOrder: { select: { id: true, poNumber: true } },
  items: { orderBy: { order: 'asc' as const } },
  payments: { orderBy: { date: 'asc' as const } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
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
  ) {}

  private async getApprovalConfig() {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals = (config?.approvals as any[]) ?? [];
    const cfg = approvals.find((c: any) => c.module === 'vendor_bills');
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canApprove(approverRoles: string[], userRole: string) {
    if (['admin', 'super admin'].includes(userRole)) return true;
    return approverRoles.length > 0 && approverRoles.includes(userRole);
  }

  private cleanData(body: Record<string, any>) {
    const { _id, id, supplier, purchaseOrder, createdAt, updatedAt, items, ...rest } = body;
    const data: Record<string, any> = { ...rest };
    if (supplier !== undefined) {
      data.supplierId = typeof supplier === 'object' ? supplier?._id ?? supplier?.id : supplier;
    }
    if (purchaseOrder !== undefined) {
      data.purchaseOrderId = purchaseOrder === '' || purchaseOrder === null ? null
        : typeof purchaseOrder === 'object' ? purchaseOrder?._id ?? purchaseOrder?.id : purchaseOrder;
    }
    return data;
  }

  private async recalcBillTotals(tx: Prisma.TransactionClient, billId: string) {
    const bill = await tx.vendorBill.findUnique({ where: { id: billId } });
    if (!bill) return null;
    const agg = await tx.vendorBillPayment.aggregate({ where: { billId }, _sum: { amount: true } });
    const totalPaid = agg._sum.amount ?? 0;
    const status = deriveBillStatus(bill.total, totalPaid, bill.dueDate) as any;
    return tx.vendorBill.update({ where: { id: billId }, data: { totalPaid, status } });
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status, supplierId, purchaseOrderId } = query;
    const where: any = { deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;
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
    const { items = [], taxRate = 0, ...rest } = body;
    const data = this.cleanData(rest as any);
    const totals = calcTotals(items, taxRate);
    const billNumber = await this.numberSequence.nextNumber('bill', 'BILL');
    const enabled = await this.approvals.isEnabled('vendor_bills');

    const bill = await this.prisma.vendorBill.create({
      data: {
        ...data,
        billNumber,
        taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        approvalStatus: enabled ? 'pending' : 'approved',
        createdById: userId,
        items: {
          create: totals.items.map((item, idx) => ({ ...item, order: idx })),
        },
      } as any,
      include: BILL_INCLUDE,
    });
    if (enabled) {
      const overall = await this.approvals.initSteps(this.prisma, 'VendorBill', bill.id, 'vendor_bills', bill.total);
      if (overall === 'approved') {
        await this.prisma.vendorBill.update({ where: { id: bill.id }, data: { approvalStatus: 'approved' } });
        (bill as any).approvalStatus = 'approved';
      }
    }

    await this.timeline.log('bill.created', `Vendor Bill ${billNumber} created`, bill.id, 'VendorBill', { billNumber }, userId);
    return toClient(bill);
  }

  async update(id: string, body: UpdateVendorBillDto, userId: string) {
    const existing = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    const { items, taxRate, ...rest } = body as any;
    const data = this.cleanData(rest);

    const bill = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (items !== undefined) {
        await tx.vendorBillItem.deleteMany({ where: { billId: id } });
        const tr = taxRate ?? existing.taxRate;
        const totals = calcTotals(items, tr);
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.taxRate = tr;
        await tx.vendorBillItem.createMany({
          data: totals.items.map((item, idx) => ({ ...item, billId: id, order: idx })),
        });
      }
      if (existing.approvalStatus === 'rejected') data.approvalStatus = 'pending';
      if (items !== undefined && existing.approvalStatus === 'approved') data.approvalStatus = 'pending';
      return tx.vendorBill.update({ where: { id }, data, include: BILL_INCLUDE });
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
      const result = await this.approvals.act('VendorBill', id, userId, userRole, bill.createdById, 'approve');
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.vendorBill.update({
        where: { id },
        data: {
          approvalStatus: result.status,
          ...(finalApproved
            ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null, status: bill.status === 'draft' ? 'received' : bill.status }
            : {}),
        },
        include: BILL_INCLUDE,
      });
      await this.timeline.log('bill.approved', `Vendor Bill approval advanced (${result.status})`, id, 'VendorBill', {}, userId);
      return toClient(updated);
    }

    const { enabled, approverRoles } = await this.getApprovalConfig();
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to approve');
    if (enabled && bill.createdById === userId) throw new BadRequestException('Cannot approve your own bill');

    const updated = await this.prisma.vendorBill.update({
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
    await this.timeline.log('bill.approved', 'Vendor Bill approved', id, 'VendorBill', {}, userId);
    return toClient(updated);
  }

  async reject(id: string, userId: string, userRole: string, reason: string) {
    const bill = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!bill) return null;
    if (bill.approvalStatus === 'rejected') return toClient(bill);

    const steps = await this.approvals.listSteps('VendorBill', id);
    if (steps.length) {
      await this.approvals.act('VendorBill', id, userId, userRole, bill.createdById, 'reject', reason);
      const updated = await this.prisma.vendorBill.update({
        where: { id },
        data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
        include: BILL_INCLUDE,
      });
      await this.timeline.log('bill.rejected', 'Vendor Bill rejected', id, 'VendorBill', { reason }, userId);
      return toClient(updated);
    }

    const { enabled, approverRoles } = await this.getApprovalConfig();
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to reject');

    const updated = await this.prisma.vendorBill.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: BILL_INCLUDE,
    });
    await this.timeline.log('bill.rejected', 'Vendor Bill rejected', id, 'VendorBill', { reason }, userId);
    return toClient(updated);
  }

  async recordPayment(billId: string, body: RecordBillPaymentDto, userId: string) {
    const bill = await this.prisma.vendorBill.findFirst({ where: { id: billId, deletedAt: null } });
    if (!bill) return null;
    if (bill.approvalStatus !== 'approved') throw new BadRequestException('Vendor bill must be approved before recording payment');

    // Reject payments that would push totalPaid past the bill total. The
    // persisted totalPaid is authoritative (kept in sync by recalcBillTotals).
    const outstanding = bill.total - (bill.totalPaid ?? 0);
    const payCurrency = body.currency ?? bill.currency;
    if (payCurrency === bill.currency && body.amount > outstanding + 0.005) {
      throw new BadRequestException(
        `Payment of ${body.amount} ${payCurrency} exceeds the outstanding balance of ${outstanding.toFixed(2)} ${bill.currency}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.vendorBillPayment.create({
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

      return this.recalcBillTotals(tx, billId);
    });

    return updated ? toClient(updated) : null;
  }

  async deletePayment(billId: string, paymentId: string) {
    const payment = await this.prisma.vendorBillPayment.findFirst({ where: { id: paymentId, billId } });
    if (!payment) return null;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    const billNumber = await this.numberSequence.nextNumber('bill', 'BILL');
    const { enabled } = await this.getApprovalConfig();

    const bill = await this.prisma.vendorBill.create({
      data: {
        billNumber,
        title: `Bill for ${po.title}`,
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        currency: po.currency ?? 'EGP',
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
      } as any,
      include: BILL_INCLUDE,
    });

    await this.timeline.log('bill.created', `Vendor Bill ${billNumber} created from PO`, bill.id, 'VendorBill', { poId }, userId);
    return toClient(bill);
  }

  async remove(id: string) {
    const existing = await this.prisma.vendorBill.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    await this.prisma.vendorBill.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async getVendorPayments(query: Record<string, string>) {
    const { page, limit, method, currency, supplierId, date_from, date_to, amount_min, amount_max } = query;

    const where: any = {};
    if (method) where.method = method;
    if (currency) where.currency = currency;
    if (supplierId) where.bill = { supplierId };
    const dr = dateRange(date_from, date_to);
    if (dr) where.date = dr;
    if (amount_min || amount_max) {
      where.amount = {};
      if (amount_min) where.amount.gte = parseFloat(amount_min);
      if (amount_max) where.amount.lte = parseFloat(amount_max);
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
