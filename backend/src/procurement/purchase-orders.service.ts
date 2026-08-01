import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../number-sequence/number-sequence.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { UNPAGINATED_MAX } from '../common/paginate';
import { calcTotals } from '../finance/finance.math';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { ApprovalService } from '../common/approval.service';
import { CustomFieldsService } from '../common/custom-fields.service';
import { PostingService } from '../accounting/posting.service';

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, email: true, phone: true } },
  items: { orderBy: { order: 'asc' as const } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: NumberSequenceService,
    private readonly timeline: TimelineService,
    private readonly inventory: InventoryService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
    private readonly posting: PostingService,
  ) {}

  /**
   * Receives an approved PO into stock: per line, an inbound stock movement at
   * the PO unit cost (establishing inventory valuation) plus a GRNI posting
   * (Dr Inventory / Cr GRNI). Idempotent — a PO can only be received once.
   */
  async receive(id: string, userId: string, warehouseId?: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null }, include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!po) throw new BadRequestException('Purchase order not found');
    if (po.approvalStatus !== 'approved') throw new BadRequestException('Purchase order must be approved before receiving');

    // Audit 2026-08 (P0): each line used to commit in its own transaction, with
    // GRNI posted outside any transaction and the status update only after the
    // loop. A failure partway through left stock for the earlier lines
    // committed, the PO still flagged unreceived, and every retry rejected by
    // the idempotency probe below — permanently unreceivable. Probe, movements,
    // GRNI postings and the status update now share one transaction.
    await this.prisma.$transaction(async (tx) => {
      const already = await tx.stockMovement.findFirst({ where: { refType: 'po-receipt', refId: id } });
      if (already) throw new BadRequestException('Purchase order has already been received');

      for (const it of po.items) {
        if (!it.productId || it.quantity <= 0) continue;
        const product = await tx.product.findUnique({ where: { id: it.productId }, select: { tracksInventory: true } });
        if (!product?.tracksInventory) continue;
        const move = await this.inventory.applyMovement({
          productId: it.productId, warehouseId, qty: it.quantity, unitCost: Number(it.unitPrice),
          type: 'in', refType: 'po-receipt', refId: id, note: `PO ${po.poNumber}`, userId,
        }, tx);
        if (move) {
          await this.posting.postGrni(
            { id: move.id, qty: move.qty, unitCost: Number(move.unitCost ?? it.unitPrice), date: move.createdAt, productId: it.productId, warehouseId: move.warehouseId, supplierId: po.supplierId },
            tx, userId,
          );
        }
      }
      await tx.purchaseOrder.update({ where: { id }, data: { status: 'received' } });
    });

    await this.timeline.log('po.received', `Purchase Order ${po.poNumber} received into stock`, id, 'PurchaseOrder', {}, userId);
    return toClient(await this.prisma.purchaseOrder.findUnique({ where: { id }, include: PO_INCLUDE }));
  }

  private async getApprovalConfig() {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === 'purchase_orders');
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canApprove(approverRoles: string[], userRole: string) {
    if (['admin', 'super admin'].includes(userRole)) return true;
    // Empty approverRoles means admins-only; don't let anyone through.
    return approverRoles.length > 0 && approverRoles.includes(userRole);
  }

  private cleanData(body: object) {
    const { _id, id, supplier, createdAt, updatedAt, items, ...rest } = body as Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest };
    if (supplier !== undefined) {
      data.supplierId =
        typeof supplier === 'object'
          ? ((supplier as { _id?: string; id?: string })?._id ?? (supplier as { _id?: string; id?: string })?.id)
          : supplier;
    }
    return data;
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, status, supplierId } = query;
    const where: Prisma.PurchaseOrderWhereInput = { deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (status) where.status = status as Prisma.PurchaseOrderWhereInput['status'];
    if (supplierId) where.supplierId = supplierId;

    if (!page) {
      const pos = await this.prisma.purchaseOrder.findMany({ where, include: PO_INCLUDE, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
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
    const data = this.cleanData(rest);
    if (typeof data.expectedDate === 'string') data.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
    data.customFields = await this.customFields.validateAndClean(
      'purchaseOrders',
      data.customFields as Record<string, unknown> | undefined,
    );
    const totals = calcTotals(items, taxRate);
    const poNumber = await this.numberSequence.nextNumber('po', 'PO');
    const enabled = await this.approvals.isEnabled('purchase_orders');

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
      } as Prisma.PurchaseOrderUncheckedCreateInput,
      include: PO_INCLUDE,
    });
    if (enabled) {
      const overall = await this.approvals.initSteps(this.prisma, 'PurchaseOrder', po.id, 'purchase_orders', Number(po.total));
      if (overall === 'approved') {
        await this.prisma.purchaseOrder.update({ where: { id: po.id }, data: { approvalStatus: 'approved' } });
        (po as { approvalStatus: string }).approvalStatus = 'approved';
      }
    }

    await this.timeline.log('po.created', `Purchase Order ${poNumber} created`, po.id, 'PurchaseOrder', { poNumber }, userId);
    return toClient(po);
  }

  async update(id: string, body: UpdatePurchaseOrderDto, userId: string) {
    const existing = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;

    const { items, taxRate, ...rest } = body;
    const data = this.cleanData(rest);
    if (typeof data.expectedDate === 'string') data.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'purchaseOrders',
        data.customFields as Record<string, unknown> | undefined,
      );
    }

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
      return tx.purchaseOrder.update({
        where: { id },
        data: data as Prisma.PurchaseOrderUncheckedUpdateInput,
        include: PO_INCLUDE,
      });
    });

    await this.timeline.log('po.updated', `Purchase Order updated`, id, 'PurchaseOrder', {}, userId);
    return toClient(po);
  }

  async updateStatus(id: string, status: string, userId: string) {
    // Existence check only — the line items are no longer needed here now that
    // this path does not touch stock.
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return null;

    // Audit 2026-08 (P0): this used to ALSO bring items into stock on the
    // transition to 'received' — with no unit cost (so valuation fell back to
    // the current average, often zero) and no GRNI posting, keyed
    // `refType: 'PurchaseOrder'`. Because `receive()` probes for
    // `refType: 'po-receipt'`, the two paths could not see each other and the
    // same PO could be received twice: once uncosted here, once costed there.
    // Stock is now moved only by the dedicated, idempotent `receive()` use case.
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: status as Prisma.PurchaseOrderUpdateInput['status'] },
      include: PO_INCLUDE,
    });

    await this.timeline.log('po.status', `PO status changed to ${status}`, id, 'PurchaseOrder', { status }, userId);
    return toClient(po);
  }

  async approve(id: string, userId: string, userRole: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!po) return null;
    if (po.approvalStatus === 'approved') return toClient(po);

    const steps = await this.approvals.listSteps('PurchaseOrder', id);
    if (steps.length) {
      const result = await this.approvals.act('PurchaseOrder', id, userId, userRole, po.createdById, 'approve');
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.purchaseOrder.update({
        where: { id },
        data: {
          approvalStatus: result.status,
          ...(finalApproved
            ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null, status: po.status === 'draft' ? 'sent' : po.status }
            : {}),
        },
        include: PO_INCLUDE,
      });
      await this.timeline.log('po.approved', `Purchase Order approval advanced (${result.status})`, id, 'PurchaseOrder', {}, userId);
      return toClient(updated);
    }

    const { enabled, approverRoles } = await this.getApprovalConfig();
    if (enabled && !this.canApprove(approverRoles, userRole)) throw new BadRequestException('Not authorized to approve');
    // Separation-of-duties is always enforced regardless of the approval-enabled toggle.
    if (po.createdById === userId && userRole !== 'super admin') throw new BadRequestException('Cannot approve your own PO');

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        approvedById: userId,
        approvedAt: new Date(),
        rejectionReason: null,
        // Advance the workflow status in line with vendor-bills behaviour.
        status: po.status === 'draft' ? 'sent' : po.status,
      },
      include: PO_INCLUDE,
    });
    await this.timeline.log('po.approved', 'Purchase Order approved', id, 'PurchaseOrder', {}, userId);
    return toClient(updated);
  }

  async reject(id: string, userId: string, userRole: string, reason: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
    if (!po) return null;
    if (po.approvalStatus === 'rejected') return toClient(po);

    const steps = await this.approvals.listSteps('PurchaseOrder', id);
    if (steps.length) {
      await this.approvals.act('PurchaseOrder', id, userId, userRole, po.createdById, 'reject', reason);
      const updated = await this.prisma.purchaseOrder.update({
        where: { id },
        data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
        include: PO_INCLUDE,
      });
      await this.timeline.log('po.rejected', 'Purchase Order rejected', id, 'PurchaseOrder', { reason }, userId);
      return toClient(updated);
    }

    const { enabled, approverRoles } = await this.getApprovalConfig();
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
