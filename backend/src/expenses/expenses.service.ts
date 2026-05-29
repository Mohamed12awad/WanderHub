import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { buildCfConditions } from '../common/customFields';
import { CreateExpenseReportDto } from './dto/create-expense-report.dto';
import { UpdateExpenseReportDto } from './dto/update-expense-report.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  private async getApprovalConfig(module: string): Promise<{ enabled: boolean; approverRoles: string[] }> {
    const config = await this.prisma.workspaceConfig.findFirst();
    const approvals = (config?.approvals as any[]) ?? [];
    const cfg = approvals.find((c: any) => c.module === module);
    return { enabled: cfg?.enabled ?? false, approverRoles: cfg?.approverRoles ?? [] };
  }

  private canUserApprove(approverRoles: string[], userRole: string): boolean {
    if (['admin', 'super admin'].includes(userRole)) return true;
    if (!approverRoles.length) return true;
    return approverRoles.includes(userRole);
  }

  async findAll(query: Record<string, string>) {
    const { page, limit: limitRaw, q, approved, createdAt_from, createdAt_to } = query;
    const baseInclude = { user: { select: { id: true, name: true } }, expenses: true };
    if (!page) {
      const reports = await this.prisma.expenseReport.findMany({ where: { deletedAt: null }, include: baseInclude, orderBy: { createdAt: 'desc' } });
      return toClient(reports);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const where: any = { deletedAt: null };
    if (q) where.title = { contains: q, mode: 'insensitive' };
    if (approved !== undefined && approved !== '') where.approved = approved === 'true';
    if (createdAt_from || createdAt_to) {
      where.createdAt = {};
      if (createdAt_from) where.createdAt.gte = new Date(createdAt_from);
      if (createdAt_to) { const d = new Date(createdAt_to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    const cfConditions = buildCfConditions(query);
    if (cfConditions.length) where.AND = [...(where.AND ?? []), ...cfConditions];
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
    const { title, expenses } = body;
    const { enabled } = await this.getApprovalConfig('expenses');
    const report = await this.prisma.expenseReport.create({
      data: {
        title,
        userId,
        approvalStatus: enabled ? 'pending' : 'approved',
        approved: !enabled,
        expenses: {
          create: (expenses ?? []).map((e: any) => ({
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
    const total = (expenses ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
    await this.timeline.log('expense.created', `Expense report "${report.title}" created`, report.id, 'Expense', { total }, userId);
    return toClient(report);
  }

  async update(id: string, body: UpdateExpenseReportDto) {
    const existing = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!existing) return null;
    const { expenses, ...rest } = body;
    // Replace expense items entirely if provided
    const data: any = { ...rest };
    if (existing.approvalStatus === 'rejected') { data.approvalStatus = 'pending'; data.approved = false; }
    if (expenses) {
      await this.prisma.expenseItem.deleteMany({ where: { expenseReportId: id } });
      data.expenses = {
        create: expenses.map((e: any) => ({
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
      data,
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    return toClient(report);
  }

  async approve(id: string, userId: string, userRole: string) {
    const report = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!report) return null;
    const { approverRoles } = await this.getApprovalConfig('expenses');
    if (!this.canUserApprove(approverRoles, userRole)) return { forbidden: true };
    const updated = await this.prisma.expenseReport.update({
      where: { id },
      data: { approvalStatus: 'approved', approved: true, approvedById: userId, approvedAt: new Date(), rejectionReason: null },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    await this.timeline.log('expense.approved', `Expense report "${report.title}" approved`, id, 'Expense', {}, userId);
    return toClient(updated);
  }

  async reject(id: string, userId: string, reason: string, userRole: string) {
    const report = await this.prisma.expenseReport.findUnique({ where: { id } });
    if (!report) return null;
    const { approverRoles } = await this.getApprovalConfig('expenses');
    if (!this.canUserApprove(approverRoles, userRole)) return { forbidden: true };
    const updated = await this.prisma.expenseReport.update({
      where: { id },
      data: { approvalStatus: 'rejected', approved: false, approvedById: userId, approvedAt: new Date(), rejectionReason: reason },
      include: { user: { select: { id: true, name: true } }, expenses: true },
    });
    await this.timeline.log('expense.rejected', `Expense report "${report.title}" rejected`, id, 'Expense', { reason }, userId);
    return toClient(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.expenseReport.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    await this.prisma.expenseReport.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }
}
