import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { VisibilityService } from '../common/visibility.service';
import { CustomFieldsService } from '../common/custom-fields.service';
import { toClient } from '../common/serialize';
import { UNPAGINATED_MAX } from '../common/paginate';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { AddMemberDto } from './dto/add-member.dto';

const PROJECT_INCLUDE = {
  customer: { select: { id: true, name: true } },
  deal: { select: { id: true, title: true } },
  manager: { select: { id: true, name: true } },
  milestones: { orderBy: { order: 'asc' as const } },
  members: { include: { user: { select: { id: true, name: true, email: true } } } },
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly visibility: VisibilityService,
    private readonly customFields: CustomFieldsService,
  ) {}

  private cleanData(body: Record<string, any>) {
    const { _id, id, customer, deal, manager, createdAt, updatedAt, ...rest } = body;
    const data: Record<string, any> = { ...rest };
    const ref = (v: any) => (v === '' || v === null ? null : typeof v === 'object' ? v?._id ?? v?.id : v);
    if (customer !== undefined) data.customerId = ref(customer);
    if (deal !== undefined) data.dealId = ref(deal);
    if (manager !== undefined) data.managerId = ref(manager);
    if (rest.startDate !== undefined) data.startDate = rest.startDate ? new Date(rest.startDate) : null;
    if (rest.endDate !== undefined) data.endDate = rest.endDate ? new Date(rest.endDate) : null;
    return data;
  }

  async findAll(query: Record<string, string>, user: AuthUser) {
    const { page, limit: limitRaw, q, status, customerId } = query;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'projects', 'managerId');
    const where: any = { deletedAt: null, ...scopeWhere };
    if (q) where.name = { contains: q, mode: 'insensitive' };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    if (!page) {
      const projects = await this.prisma.project.findMany({ where, include: PROJECT_INCLUDE, orderBy: { createdAt: 'desc' }, take: UNPAGINATED_MAX });
      return toClient(projects);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      this.prisma.project.findMany({ where, include: PROJECT_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.project.count({ where }),
    ]);
    return { data: toClient(data), total, page: p, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null }, include: PROJECT_INCLUDE });
    if (!project) throw new NotFoundException('project not found');
    const financials = await this.getFinancials(id, project.budget, project.currency);
    return toClient({ ...project, financials });
  }

  async getFinancials(id: string, budget?: number | null, currency?: string) {
    const [invoiceAgg, expenseAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { projectId: id, deletedAt: null },
        _sum: { total: true, totalPaid: true },
      }),
      this.prisma.expenseItem.aggregate({
        where: { expenseReport: { projectId: id, approvalStatus: 'approved', deletedAt: null } },
        _sum: { amount: true },
      }),
    ]);
    const billed = invoiceAgg._sum.total ?? 0;
    const collected = invoiceAgg._sum.totalPaid ?? 0;
    const costs = expenseAgg._sum.amount ?? 0;
    return {
      budget: budget ?? 0,
      currency: currency ?? 'EGP',
      billed,
      collected,
      costs,
      // Accrual gross margin: what has been invoiced minus costs incurred.
      accrualMargin: billed - costs,
      // Cash gross margin: what has actually been collected minus costs.
      cashMargin: collected - costs,
      // Revenue realization: fraction of invoiced amount that has been collected.
      revenueRealization: billed > 0 ? Math.round((collected / billed) * 100) : 0,
      // Budget burn: how much of the budget has been consumed by costs.
      budgetUsed: budget ? Math.round((costs / budget) * 100) : 0,
    };
  }

  async create(body: CreateProjectDto, userId: string) {
    const data = this.cleanData(body as any);
    data.createdById = userId;
    data.customFields = await this.customFields.validateAndClean('projects', data.customFields);
    const project = await this.prisma.project.create({ data: data as any, include: PROJECT_INCLUDE });
    await this.timeline.log('project.created', `Project "${project.name}" created`, project.id, 'Project', {}, userId);
    return toClient(project);
  }

  async update(id: string, body: UpdateProjectDto, userId: string) {
    const existing = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('project not found');
    const data = this.cleanData(body as any);
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean('projects', data.customFields);
    }
    // Stamp completedAt when transitioning to completed
    if (data.status === 'completed' && existing.status !== 'completed') data.completedAt = new Date();
    if (data.status && data.status !== 'completed') data.completedAt = null;
    const project = await this.prisma.project.update({ where: { id }, data, include: PROJECT_INCLUDE });
    await this.timeline.log('project.updated', 'Project updated', id, 'Project', {}, userId);
    return toClient(project);
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('project not found');
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  async getMilestones(projectId: string) {
    const milestones = await this.prisma.projectMilestone.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
    return toClient(milestones);
  }

  async createMilestone(projectId: string, body: CreateMilestoneDto) {
    const { dueDate, ...rest } = body;
    const milestone = await this.prisma.projectMilestone.create({
      data: { ...rest, projectId, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) } as any,
    });
    return toClient(milestone);
  }

  async updateMilestone(projectId: string, milestoneId: string, body: UpdateMilestoneDto) {
    const existing = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!existing) throw new NotFoundException('project not found');
    const { dueDate, ...rest } = body as any;
    const data: any = { ...rest };
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (data.status === 'completed' && existing.status !== 'completed') data.completedAt = new Date();
    if (data.status && data.status !== 'completed') data.completedAt = null;
    const milestone = await this.prisma.projectMilestone.update({ where: { id: milestoneId }, data });
    return toClient(milestone);
  }

  async deleteMilestone(projectId: string, milestoneId: string) {
    const existing = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!existing) throw new NotFoundException('project not found');
    await this.prisma.projectMilestone.delete({ where: { id: milestoneId } });
    return true;
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async getMembers(projectId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return toClient(members);
  }

  async addMember(projectId: string, body: AddMemberDto) {
    const member = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: body.userId } },
      update: { role: body.role ?? 'member' },
      create: { projectId, userId: body.userId, role: body.role ?? 'member' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return toClient(member);
  }

  async removeMember(projectId: string, userId: string) {
    const existing = await this.prisma.projectMember.findFirst({ where: { projectId, userId } });
    if (!existing) throw new NotFoundException('project not found');
    await this.prisma.projectMember.delete({ where: { id: existing.id } });
    return true;
  }

  // ── Linked records ────────────────────────────────────────────────────────

  async getProjectInvoices(projectId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, invoiceNumber: true, title: true, total: true, totalPaid: true, status: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return toClient(invoices);
  }

  async getProjectExpenses(projectId: string) {
    const expenses = await this.prisma.expenseReport.findMany({
      where: { projectId, deletedAt: null },
      include: { expenses: true, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return toClient(expenses);
  }

  async getProjectTasks(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    return toClient(tasks);
  }
}
