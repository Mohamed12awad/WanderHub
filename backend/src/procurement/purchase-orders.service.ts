import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { calcTotals } from '../finance/finance.math';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, email: true, phone: true } },
  items: { orderBy: { order: 'asc' as const } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
  ) {}

  private async getApprovalConfig() {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals = (config?.approvals as any[]) ?? [];
    const cfg = approvals.find((c: any) => c.module === 'purchase_orders');
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canApprove(approverRoles: string[], userRole: string) {
    if (['admin', 'super admin'].includes(userRole)) return true;
    return !approverRoles.length || approverRoles.includes(userRole);
  }

  private cleanData(body: Record<string, any>) {
    const { _id, id, supplier, createdAt, updatedAt, items, ...rest } = body;
    const data: Record<string, any> = { ...rest };
    if (supplier !== undefined) {
      data.supplierId = typeof supplier === 'object' ? supplier?._id ?? supplier?.id : supplier;
    }
    return data;
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status, supplierId } = query;
    const where: any = { deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    if (!page) {
      const pos = await this.prisma.purchaseOrder.findMany({ where, include: PO_INCLUDE, orderBy: { createdAt: 'desc' } });
      return toClient(pos);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where, include: PO_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null }, include: PO_INCLUDE });
    return po ? toClient(po) : null;
  }

  async create(body: CreatePurchaseOrderDto, userId: string) {
    const { items = [], taxRate = 0, ...rest } = body;
    const data = this.cleanData(rest as any);
    const totals = calcTotals(items, taxRate);
    const poNumber = await this.numberSequence.nextNumber('po', 'PO');
    const { enabled } = await this.getApprovalConfig();

    const po = await this.prisma.purchaseOrder.create({
      data: {
        ...data,
        poNumber,
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
      include: PO_INCLUDE,
    });

    await this.timeline.log('po.created', `Purchase Order ${poNumber} created`, po.id, 'PurchaseOrder', { poNumber }, userId);
    return toClient(po);
  }

  async update(id: string, body: UpdatePurchaseOrderDto, userId: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    const { items, taxRate, ...rest } = body as any;
    const data = this.cleanData(rest);

    const po = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (items !== undefined) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        const tr = taxRate ?? existing.taxRate;
        const totals = calcTotals(items, tr);
        data.subtotal = totals.subtotal;
        data.tax = totals.tax;
        data.total = totals.total;
        data.taxRate = tr;
        await tx.purchaseOrderItem.createMany({
          data: totals.items.map((item, idx) => ({ ...item, purchaseOrderId: id, order: idx })),
        });
      }
      // Resubmit for approval if already rejected; post-approval edits also reset.
      if (existing.approvalStatus === 'rejected') data.approvalStatus = 'pending';
      if (items !== undefined && existing.approvalStatus === 'approved') data.approvalStatus = 'pending';
      return tx.purchaseOrder.update({ where: { id }, data, include: PO_INCLUDE });
    });

    await this.timeline.log('po.updated', `Purchase Order updated`, id, 'PurchaseOrder', {}, userId);
    return toClient(po);
  }

  async updateStatus(id: string, status: string, userId: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: status as any },
      include: PO_INCLUDE,
    });
    await this.timeline.log('po.status', `PO status changed to ${status}`, id, 'PurchaseOrder', { status }, userId);
    return toClient(po);
  }

  async approve(id: string, userId: string, userRole: string) {
    const { enabled, approverRoles } = await this.getApprovalConfig();
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!po) return null;
    if (po.approvalStatus === 'approved') return toClient(po);
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to approve');
    if (enabled && po.createdById === userId) throw new BadRequestException('Cannot approve your own PO');

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: PO_INCLUDE,
    });
    await this.timeline.log('po.approved', 'Purchase Order approved', id, 'PurchaseOrder', {}, userId);
    return toClient(updated);
  }

  async reject(id: string, userId: string, userRole: string, reason: string) {
    const { enabled, approverRoles } = await this.getApprovalConfig();
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!po) return null;
    if (po.approvalStatus === 'rejected') return toClient(po);
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to reject');

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: PO_INCLUDE,
    });
    await this.timeline.log('po.rejected', 'Purchase Order rejected', id, 'PurchaseOrder', { reason }, userId);
    return toClient(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    await this.prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
