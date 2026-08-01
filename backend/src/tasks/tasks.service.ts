import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { VisibilityService } from '../common/visibility.service';
import { NotificationDispatcher } from '../notifications/notification-dispatcher';
import { toClient } from '../common/serialize';
import { CustomFieldsService } from '../common/custom-fields.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly visibility: VisibilityService,
    private readonly dispatcher: NotificationDispatcher,
    private readonly customFields: CustomFieldsService,
  ) {}

  /** Coerce an optional date string to a Date, mapping ''→null and rejecting
   *  unparseable input with a 400 rather than letting Prisma throw a 500. */
  private parseOptionalDate(value: string, field: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${field}`);
    return d;
  }

  async findAll(query: Record<string, string>, user: AuthUser) {
    const { status, priority, assignedTo, linkedTo, overdue, mine, projectId, q, page = '1' } = query;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'tasks', 'assignedToId');
    const where: Prisma.TaskWhereInput = { deletedAt: null, ...scopeWhere };
    if (q?.trim()) {
      where.OR = [
        { title: { contains: q.trim(), mode: 'insensitive' } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status as Prisma.TaskWhereInput['status'];
    if (priority) where.priority = priority as Prisma.TaskWhereInput['priority'];
    if (assignedTo) where.assignedToId = assignedTo;
    if (linkedTo) where.linkedToId = linkedTo;
    if (mine === 'true') where.assignedToId = user.id;
    if (projectId) where.projectId = projectId;
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['done', 'cancelled'] };
    }
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '25', 10) || 25));
    const skip = (parseInt(page, 10) - 1) * limit;
    const TASK_INCLUDE = {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true } },
    };
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data: toClient(tasks), total, page: parseInt(page, 10), pages: Math.ceil(total / limit) };
  }

  async summary() {
    const counts = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const summary: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0 };
    counts.forEach(({ status, _count }) => { summary[status] = _count.id; });
    return summary;
  }

  async findOne(id: string, user: AuthUser) {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'tasks', 'assignedToId');
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
    if (!task) return null;
    // actualCost is computed (never stored) by summing attributed expense items,
    // so it can't drift from the underlying expenses. See schema note on Task.
    const agg = await this.prisma.expenseItem.aggregate({
      where: { taskId: id },
      _sum: { amount: true },
    });
    return toClient({ ...task, actualCost: agg._sum.amount ?? 0 });
  }

  async create(body: CreateTaskDto, userId: string) {
    const { _id, id, createdAt, updatedAt, assignedTo, createdBy, deal, linkedTo, project, milestone, ...rest } =
      body as unknown as Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest, createdById: userId };
    if (assignedTo) data.assignedToId = typeof assignedTo === 'object' ? (assignedTo as { _id?: string })._id : assignedTo;
    if (linkedTo && !data.linkedToId) data.linkedToId = linkedTo;
    if (data.linkedModel === 'Deal' && data.linkedToId) data.dealId = data.linkedToId;
    if (project) data.projectId = project;
    if (milestone) data.milestoneId = milestone;
    if (typeof data.dueDate === 'string') data.dueDate = this.parseOptionalDate(data.dueDate, 'dueDate');
    data.customFields = await this.customFields.validateAndClean(
      'tasks',
      data.customFields as Record<string, unknown> | undefined,
    );

    const task = await this.prisma.task.create({
      data: data as Prisma.TaskUncheckedCreateInput,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true } },
      },
    });

    if (task.linkedToId && task.linkedModel) {
      await this.timeline.log(
        'task.created',
        `Task "${task.title}" created`,
        task.linkedToId,
        task.linkedModel as 'Customer' | 'Deal',
        { title: task.title, priority: task.priority },
        userId,
      );
    }

    if (task.assignedToId && task.assignedToId !== userId) {
      await this.dispatcher.dispatch({
        userId: task.assignedToId,
        type: 'task_assigned',
        title: `Task assigned: ${task.title}`,
        link: task.linkedToId ? `/${task.linkedModel?.toLowerCase()}s/${task.linkedToId}` : undefined,
      });
    }

    return toClient(task);
  }

  async update(id: string, body: UpdateTaskDto, user: AuthUser) {
    const userId = user.id;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'tasks', 'assignedToId');
    const existing = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
    });
    if (!existing) throw new NotFoundException('task not found');
    const { _id, id: _id2, createdAt, updatedAt, assignedTo, createdBy, deal, linkedTo, project, milestone, ...rest } =
      body as unknown as Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest };
    if (assignedTo !== undefined) data.assignedToId = typeof assignedTo === 'object' ? (assignedTo as { _id?: string })?._id : assignedTo;
    if (linkedTo !== undefined) data.linkedToId = linkedTo;
    if (project !== undefined) data.projectId = project || null;
    if (milestone !== undefined) data.milestoneId = milestone || null;
    if (typeof data.dueDate === 'string') data.dueDate = this.parseOptionalDate(data.dueDate, 'dueDate');
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'tasks',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    const task = await this.prisma.task.update({
      where: { id },
      data: data as Prisma.TaskUncheckedUpdateInput,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true } },
      },
    });

    const newAssignee = data.assignedToId as string | undefined;
    if (newAssignee && newAssignee !== existing.assignedToId && newAssignee !== userId) {
      await this.dispatcher.dispatch({
        userId: newAssignee,
        type: 'task_assigned',
        title: `Task assigned: ${task.title}`,
        link: task.linkedToId ? `/${task.linkedModel?.toLowerCase()}s/${task.linkedToId}` : undefined,
      });
    }

    await this.timeline.logUpdate({
      eventType: 'task.updated', title: 'Task updated', linkedModel: 'Task',
      id, before: existing as Record<string, unknown>, changed: data, userId,
    });

    return toClient(task);
  }

  async remove(id: string, user?: AuthUser) {
    // BulkService prefilters visible ids before calling this internal path and
    // currently has no AuthUser parameter at the service call boundary.
    const scopeWhere = user
      ? await this.visibility.ownershipWhere(user, 'tasks', 'assignedToId')
      : {};
    const existing = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
    });
    if (!existing) throw new NotFoundException('task not found');
    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async complete(id: string, user: AuthUser) {
    const userId = user.id;
    const scopeWhere = await this.visibility.ownershipWhere(user, 'tasks', 'assignedToId');
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
    });
    if (!task) throw new NotFoundException('task not found');
    const wasDone = task.status === 'done';
    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: wasDone ? 'todo' : 'done', completedAt: wasDone ? null : new Date() },
    });
    if (!wasDone && task.linkedToId && task.linkedModel) {
      await this.timeline.log(
        'task.completed',
        `Task "${task.title}" completed`,
        task.linkedToId,
        task.linkedModel as 'Customer' | 'Deal',
        { title: task.title },
        userId,
      );
    }
    return toClient(updated);
  }
}
