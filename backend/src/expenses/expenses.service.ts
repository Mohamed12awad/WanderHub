import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';
import { CustomFieldsService } from '../common/custom-fields.service';
import { UNPAGINATED_MAX } from '../common/paginate';
import { ApprovalService } from '../common/approval.service';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly approvals: ApprovalService,
    private readonly customFields: CustomFieldsService,
  ) {}

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals =
      (config?.approvals as Array<{ module?: string; enabled?: boolean; approverRoles?: string[] }>) ?? [];
    const cfg = approvals.find((c) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    if (!approverRoles.length) return true;
    return approverRoles.includes(userRole);
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, approvalStatus, createdAt_from, createdAt_to } = query;
    const baseInclude = { user: { select: { id: true, name: true } }, expenses: true };
    if (!page) {
      const reports = await this.prisma.expenseReport.findMany({ where: { deletedAt: null }, include: baseInclude, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
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
      this.prisma.expenseReport.findMany({ where, include: baseInclude, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.expenseReport.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const report = await this.prisma.expenseReport.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return report ? toClient(report) : null;
  }

  async create(body: CreateExpenseReportDto, userId: string) {
    const { title, expenses, project } = body;
    const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
    const enabled = await this.approvals.isEnabled('expenses');
    const customFields = await this.customFields.validateAndClean('expenses', body.customFields);
    const report = await this.prisma.expenseReport.create({
      data: {
        title,
        userId,
        ...(project ? { projectId: project } : {}),
        approvalStatus: enabled ? 'pending' : 'approved',
        ...(customFields !== undefined ? { customFields: customFields as Prisma.InputJsonValue } : {}),
        expenses: {
          create: (expenses ?? []).map((e) => ({
            description: e.description,
            amount: Number(e.amount),
            date: new Date(e.date),
            category: e.category,
            beneficiary: e.beneficiary,
          })),
        },
      },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    if (enabled) {
      const overall = await this.approvals.initSteps(this.prisma, 'ExpenseReport', report.id, 'expenses', total);
      if (overall === 'approved') {
        await this.prisma.expenseReport.update({ where: { id: report.id }, data: { approvalStatus: 'approved' } });
        (report as { approvalStatus: string }).approvalStatus = 'approved';
      }
    }
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
      include: { user: { select: { id: true, name: true } }, expenses: true },
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
      const updated = await this.prisma.expenseReport.update({
        where: { id },
        data: { approvalStatus: result.status, ...(finalApproved ? { approvedById: userId, approvedAt: new Date(), rejectionReason: null } : {}) },
        include: { user: { select: { id: true, name: true } }, expenses: true },
      });
      await this.timeline.log('expense.approved', `Expense report "${report.title}" approval advanced (${result.status})`, id, 'Expense', {}, userId);
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('expenses');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to approve expense reports');
    // Separation of duties: the report owner cannot approve their own report.
    if (report.userId === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot approve an expense report you created');
    const updated = await this.prisma.expenseReport.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: { user: { select: { id: true, name: true } }, expenses: true },
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
      const updated = await this.prisma.expenseReport.update({
        where: { id },
        data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
        include: { user: { select: { id: true, name: true } }, expenses: true },
      });
      await this.timeline.log('expense.rejected', `Expense report "${report.title}" rejected`, id, 'Expense', { reason }, userId);
      return toClient(updated);
    }

    const { approverRoles } = await this.getApprovalConfig('expenses');
    if (!this.canUserApprove(approverRoles, userRole)) throw new ForbiddenException('You are not authorized to reject expense reports');
    if (report.userId === userId && userRole !== 'super admin') throw new ForbiddenException('You cannot reject an expense report you created');
    const updated = await this.prisma.expenseReport.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: { user: { select: { id: true, name: true } }, expenses: true },
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
