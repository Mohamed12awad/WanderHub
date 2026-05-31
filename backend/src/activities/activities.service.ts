import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  async findAll(query: Record<string, string>) {
    const { linkedTo, linkedModel, month, year } = query;
    const where: any = {};
    if (linkedTo) where.linkedToId = linkedTo;
    if (linkedModel) where.linkedModel = linkedModel;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
    }
    const activities = await this.prisma.activity.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
        customer:   { select: { id: true, name: true } },
        deal:       { select: { id: true, title: true } },
        project:    { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
    return toClient(activities);
  }

  async create(body: CreateActivityDto, userId: string) {
    const { _id, id, createdAt, updatedAt, assignedTo, createdBy, customer, deal, linkedTo, ...rest } = body as any;
    const resolvedLinkedToId = rest.linkedToId ?? linkedTo;
    const data: any = { ...rest, linkedToId: resolvedLinkedToId, createdById: userId };
    delete data.linkedTo;
    // Prisma requires a proper Date object for DateTime fields
    if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
    // Strip empty description so it's stored as null, not empty string
    if (data.description === '') delete data.description;
    if (assignedTo) data.assignedToId = typeof assignedTo === 'object' ? assignedTo?._id : assignedTo;
    if (resolvedLinkedToId && rest.linkedModel === 'Customer') data.customerId = resolvedLinkedToId;
    if (resolvedLinkedToId && rest.linkedModel === 'Deal') data.dealId = resolvedLinkedToId;
    if (resolvedLinkedToId && rest.linkedModel === 'Project') data.projectId = resolvedLinkedToId;

    const activity = await this.prisma.activity.create({
      data,
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy:  { select: { id: true, name: true } },
        customer:   { select: { id: true, name: true } },
        deal:       { select: { id: true, title: true } },
        project:    { select: { id: true, name: true } },
      },
    });

    const type = activity.type;
    await this.timeline.log(
      'activity.logged',
      `${type.charAt(0).toUpperCase() + type.slice(1)} logged: "${activity.title}"`,
      activity.linkedToId,
      activity.linkedModel as 'Customer' | 'Deal',
      { type, title: activity.title },
      userId,
    );

    return toClient(activity);
  }

  async update(id: string, body: UpdateActivityDto) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('activity not found');
    const { _id, id: _id2, createdAt, updatedAt, assignedTo, createdBy, customer, deal, ...rest } = body as any;
    const data: any = { ...rest };
    if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
    if (data.description === '') delete data.description;
    if (assignedTo !== undefined) data.assignedToId = typeof assignedTo === 'object' ? assignedTo?._id : assignedTo;
    const activity = await this.prisma.activity.update({ where: { id }, data });
    return toClient(activity);
  }

  async remove(id: string) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('activity not found');
    await this.prisma.activity.delete({ where: { id } });
    return true;
  }
}
