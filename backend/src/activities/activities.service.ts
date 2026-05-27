import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';

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
      include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    return toClient(activities);
  }

  async create(body: Record<string, any>, userId: string) {
    const { _id, id, createdAt, updatedAt, assignedTo, createdBy, customer, deal, linkedTo, ...rest } = body;
    const resolvedLinkedToId = rest.linkedToId ?? linkedTo;
    const data: any = { ...rest, linkedToId: resolvedLinkedToId, createdById: userId };
    delete data.linkedTo;
    if (assignedTo) data.assignedToId = typeof assignedTo === 'object' ? assignedTo?._id : assignedTo;
    if (resolvedLinkedToId && rest.linkedModel === 'Customer') data.customerId = resolvedLinkedToId;
    if (resolvedLinkedToId && rest.linkedModel === 'Deal') data.dealId = resolvedLinkedToId;

    const activity = await this.prisma.activity.create({
      data,
      include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
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

  async update(id: string, body: Record<string, any>) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) return null;
    const { _id, id: _id2, createdAt, updatedAt, assignedTo, createdBy, customer, deal, ...rest } = body;
    const data: any = { ...rest };
    if (assignedTo !== undefined) data.assignedToId = typeof assignedTo === 'object' ? assignedTo?._id : assignedTo;
    const activity = await this.prisma.activity.update({ where: { id }, data });
    return toClient(activity);
  }

  async remove(id: string) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) return null;
    await this.prisma.activity.delete({ where: { id } });
    return true;
  }
}
