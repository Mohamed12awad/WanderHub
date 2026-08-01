import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';
import { CustomFieldsService } from '../common/custom-fields.service';
import { UNPAGINATED_MAX } from '../common/paginate';
import { ApprovalService } from '../common/approval.service';
import { PostingService } from '../accounting/posting.service';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';

const EXPENSE_REPORT_INCLUDE = {
  user: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  costCenter: { select: { id: true, code: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  expenses: true,
};

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
    private readonly posting: PostingService,
  ) {}

  /**
   * Posts the expense-report GL entry (Dr Expense / Cr AP) once finally approved.
   * No-op when GL posting is disabled, before the cutover date, or already
   * posted (idempotent on the report id).
   */
  private async postExpenseIssued(id: string, userId: string, tx: Prisma.TransactionClient) {
    const report = await tx.expenseReport.findFirst({
      where: { id, deletedAt: null },
      include: { expenses: true },
    });
    if (!report) return;
    // Re-post under a versioned sourceId when a prior (reversed) entry exists, so
    // re-approval after a reject re-recognizes the expense instead of no-opping.
    const prior = await tx.journalEntry.findFirst({
      where: { sourceType: 'ExpenseReport', sourceId: { startsWith: id } }, select: { id: true },
    });
    await this.posting.postExpenseReport(report, tx, userId, prior ? `${id}#r${Date.now()}` : undefined);
  }

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    // Approvals enabled but no roles configured ⇒ admins only (above). Matches
    // every sibling module (invoices/quotes/sales-orders/vendor-bills/POs); a
    // `return true` here would let any expenses:approve holder approve.
    if (!approverRoles.length) return false;
    return approverRoles.includes(userRole);
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, approvalStatus, createdAt_from, createdAt_to } = query;
    if (!page) {
      const reports = await this.prisma.expenseReport.findMany({ where: { deletedAt: null }, include: EXPENSE_REPORT_INCLUDE, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(reports);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: Prisma.ExpenseReportWhereInput = { deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (approvalStatus !== undefined && approvalStatus !== '') where.approvalStatus = approvalStatus as Prisma.ExpenseReportWhereInput['approvalStatus'];
    if (createdAt_from || createdAt_to) {
      const range: Prisma.DateTimeFilter = {};
      if (createdAt_from) range.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); range.lte = d; }
      where.createdAt = range;
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) {
      where.AND = [
        ...((where.AND as Prisma.ExpenseReportWhereInput[]) ?? []),
        ...(cfConditions as Prisma.ExpenseReportWhereInput[]),
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.expenseReport.findMany({ where, include: EXPENSE_REPORT_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.expenseReport.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.prisma.expenseReport.findFirst({
      where: { id, deletedAt: null },
      include: EXPENSE_REPORT_INCLUDE,
    });
    return report ? toClient(report) : null;
  }

  async create(body: CreateExpenseReportDto, userId: string) {
    const { title, expenses, project, costCenterId } = body;
    const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const enabled = await this.approvals.isEnabled('expenses');
    const customFields = await this.customFields.validateAndClean('expenses', body.customFields);
    const report = await this.prisma.$transaction(async (tx) => {
      let created = await tx.expenseReport.create({
        data: {
          title,
          userId,
          ...(project ? { projectId: project } : {}),
          ...(costCenterId ? { costCenterId } : {}),
          approvalStatus: enabled ? 'pending' : 'approved',
          ...(customFields !== undefined ? { customFields: customFields as Prisma.InputJsonValue } : {}),
          expenses: {
            create: (expenses ?? []).map((e) => ({
              description: e.description,
              amount: Number(e.amount),
              date: new Date(e.date),
              category: e.category,
              beneficiary: e.beneficiary,
              ...(e.taskId ? { taskId: e.taskId } : {}),
              ...(e.milestoneId ? { milestoneId: e.milestoneId } : {}),
            })),
          },
        },
        include: EXPENSE_REPORT_INCLUDE,
      });
      if (enabled) {
        const overall = await this.approvals.initSteps(tx, 'ExpenseReport', created.id, 'expenses', total);
        if (overall === 'approved') {
          created = await tx.expenseReport.update({
            where: { id: created.id },
            data: { approvalStatus: 'approved' },
            include: EXPENSE_REPORT_INCLUDE,
          });
        }
      }
      // Auto-approved (approvals disabled, or no step applied) → post now, since
      // approve() won't be called for this report.
      if (created.approvalStatus === 'approved') {
        await this.posting.postExpenseReport(created, tx, userId);
      }
      return created;
    });
    await this.timeline.log('expense.created', `Expense report "${report.title}" created`, report.id, 'Expense', { total }, userId);
    return toClient(report);
  }

  async update(id: string, body: UpdateExpenseReportDto) {
    const existing = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('expense report not found');
    const { expenses, project, ...rest } = body;
    // Map project ID string → Prisma relation connect
    const data: Record<string, unknown> = { ...rest };
    if (project !== undefined) {
      data.projectId = project || null;
      delete data.project;
    }
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'expenses',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    if (existing.approvalStatus === 'rejected') data.approvalStatus = 'pending';
    if (expenses && existing.approvalStatus === 'approved') data.approvalStatus = 'pending';
    if (expenses) {
      await this.prisma.expenseItem.deleteMany({ where: { expenseReportId: id } });
      data.expenses = {
        create: expenses.map((e) => ({
          description: e.description,
          amount: Number(e.amount),
          date: new Date(e.date),
          category: e.category,
          beneficiary: e.beneficiary,
        })),
      };
    }
    const report = await this.prisma.expenseReport.update({
      where: { id },
      data: data as Prisma.ExpenseReportUncheckedUpdateInput,
      include: EXPENSE_REPORT_INCLUDE,
    });
    return toClient(report);
  }

  async approve(id: string, userId: string, userRole: string) {
    const report = await this.prisma.expenseReport.findFirst({ where: { id, deletedAt: null } });
    if (!report) throw new NotFoundException('expense report not found');
    if (report.approvalStatus === 'approved') return toClient(report);

    const steps = await this.approvals.listSteps('ExpenseReport', id);
    if (steps.length) {
      const result = await this.approvals.act('ExpenseReport', id, userId, userRole, report.userId, 'approve');
      const finalApproved = result.status === 'approved';
      const updated = await this.prisma.$transaction(async (tx) => {
        const changed = await tx.expenseReport.update({
          where: { id },
          data: { approvalStatus: result.status, ...(finalApproved ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null } : {}) },
          include: EXPENSE_REPORT_INCLUDE,
        });
        if (finalApproved) await this.postExpenseIssued(id, userId, tx);
        return changed;
      });
      await this.timeline.log('expense.approved', `Expense report "${report.title}" approval advanced (${result.status})`, id, 'Expense', {}, userId);
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('expenses');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to approve expense reports');
    // Separation of duties: the report owner cannot approve their own report.
    if (report.userId === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot approve an expense report you created');
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.expenseReport.update({
        where: { id },
        data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
        include: EXPENSE_REPORT_INCLUDE,
      });
      await this.postExpenseIssued(id, userId, tx);
      return changed;
    });
    await this.timeline.log('expense.approved', `Expense report "${report.title}" approved`, id, 'Expense', {}, userId);
    return toClient(updated);
  }

  async reject(id: string, userId: string, reason: string, userRole: string) {
    const report = await this.prisma.expenseReport.findFirst({ where: { id, deletedAt: null } });
    if (!report) throw new NotFoundException('expense report not found');
    if (report.approvalStatus === 'rejected') return toClient(report);

    const steps = await this.approvals.listSteps('ExpenseReport', id);
    if (steps.length) {
      await this.approvals.act('ExpenseReport', id, userId, userRole, report.userId, 'reject', reason);
      const updated = await this.prisma.$transaction(async (tx) => {
        // Reverse the issued GL entry that approval posted (idempotent no-op when
        // nothing was posted). A later re-approval re-posts under a versioned id.
        await this.posting.reverseLive('ExpenseReport', id, { createdById: userId }, tx);
        return tx.expenseReport.update({
          where: { id },
          // Clear any prior approval: the rejecter is not the approver, and a
          // rejected report must not keep stale approvedBy/approvedAt.
          data: { approvalStatus: 'rejected', approvedById: null, approvedAt: null, rejectionReason: reason },
          include: EXPENSE_REPORT_INCLUDE,
        });
      });
      await this.timeline.log('expense.rejected', `Expense report "${report.title}" rejected`, id, 'Expense', { reason }, userId);
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('expenses');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to reject expense reports');
    if (report.userId === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot reject an expense report you created');
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.posting.reverseLive('ExpenseReport', id, { createdById: userId }, tx);
      return tx.expenseReport.update({
        where: { id },
        // Clear any prior approval (see chain path above).
        data: { approvalStatus: 'rejected', approvedById: null, approvedAt: null, rejectionReason: reason },
        include: EXPENSE_REPORT_INCLUDE,
      });
    });
    await this.timeline.log('expense.rejected', `Expense report "${report.title}" rejected`, id, 'Expense', { reason }, userId);
    return toClient(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.expenseReport.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('expense report not found');
    await this.prisma.expenseReport.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
