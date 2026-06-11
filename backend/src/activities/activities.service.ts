import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { toClient } from '../common/serialize';
import { CustomFieldsService } from '../common/custom-fields.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly customFields: CustomFieldsService,
  ) {}

  async findAll(query: Record<string, string>) {
    const { linkedTo, linkedModel, month, year, q, type, status, page, limit } = query;
    const where: Prisma.ActivityWhereInput = {};
    if (linkedTo) where.linkedToId = linkedTo;
    if (linkedModel) where.linkedModel = linkedModel;
    if (type) where.type = type;
    if (status) where.status = status;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
    }
    if (q?.trim()) {
      const term = q.trim();
      // Match title/description and the linked entity's display name, so a
      // search like "Nile Corp" still finds activities linked to that customer
      // (parity with the old client-side filter that matched the entity label).
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { deal: { title: { contains: term, mode: 'insensitive' } } },
        { project: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const include = {
      assignedTo: { select: { id: true, name: true } },
      createdBy:  { select: { id: true, name: true } },
      customer:   { select: { id: true, name: true } },
      deal:       { select: { id: true, title: true } },
      project:    { select: { id: true, name: true } },
    };

    // Paginated mode for the list view (GenericTable). Legacy callers — the
    // calendar (month/year) and detail panes (linkedTo/linkedModel) — omit
    // `page` and still receive a plain array.
    if (page) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const take = Math.min(100, Math.max(1, parseInt(limit ?? '25', 10) || 25));
      const [activities, total] = await Promise.all([
        this.prisma.activity.findMany({ where, include, orderBy: { date: 'desc' }, skip: (pageNum - 1) * take, take }),
        this.prisma.activity.count({ where }),
      ]);
      await this.backfillLinkedNames(activities);
      return { data: toClient(activities), total, page: pageNum, pages: Math.ceil(total / take) || 1 };
    }

    const activities = await this.prisma.activity.findMany({ where, include, orderBy: { date: 'desc' } });
    await this.backfillLinkedNames(activities);
    return toClient(activities);
  }

  // Resolve each activity's linked record name so the UI can render
  // "module · record name" with a clickable name. The typed relations
  // (customer/deal/project) are populated via the include, but legacy/seed rows
  // may have linkedToId set without the FK column, and activities can also point
  // at modules with no typed relation (Lead, Supplier, finance, procurement).
  // We batch one lookup per model, attach a generic `linkedName`, and also graft
  // the customer/deal/project relation when missing.
  private async backfillLinkedNames(
    activities: Array<{
      linkedToId: string | null;
      linkedModel: string | null;
      linkedName?: string;
      customer?: { id: string; name: string } | null;
      deal?: { id: string; title: string } | null;
      project?: { id: string; name: string } | null;
    }>,
  ) {
    // Per-model batched name fetchers (id -> display name).
    const fetchers: Record<string, (ids: string[]) => Promise<Array<{ id: string; label: string }>>> = {
      Customer: (ids) => this.prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.name }))),
      Deal: (ids) => this.prisma.deal.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.title }))),
      Project: (ids) => this.prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.name }))),
      Lead: (ids) => this.prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.name }))),
      Supplier: (ids) => this.prisma.supplier.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.name }))),
      Invoice: (ids) => this.prisma.invoice.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.title }))),
      Quote: (ids) => this.prisma.quote.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.title }))),
      PurchaseOrder: (ids) => this.prisma.purchaseOrder.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }).then((r) => r.map((x) => ({ id: x.id, label: x.title }))),
    };

    const idsByModel = new Map<string, Set<string>>();
    for (const a of activities) {
      if (!a.linkedToId || !a.linkedModel || !fetchers[a.linkedModel]) continue;
      if (!idsByModel.has(a.linkedModel)) idsByModel.set(a.linkedModel, new Set());
      idsByModel.get(a.linkedModel)!.add(a.linkedToId);
    }
    if (idsByModel.size === 0) return;

    const nameByModel = new Map<string, Map<string, string>>();
    await Promise.all(
      [...idsByModel.entries()].map(async ([model, idSet]) => {
        const rows = await fetchers[model]([...idSet]);
        nameByModel.set(model, new Map(rows.map((r) => [r.id, r.label])));
      }),
    );

    for (const a of activities) {
      if (!a.linkedToId || !a.linkedModel) continue;
      const name = nameByModel.get(a.linkedModel)?.get(a.linkedToId);
      if (!name) continue;
      a.linkedName = name;
      if (a.linkedModel === 'Customer' && !a.customer) a.customer = { id: a.linkedToId, name };
      else if (a.linkedModel === 'Deal' && !a.deal) a.deal = { id: a.linkedToId, title: name };
      else if (a.linkedModel === 'Project' && !a.project) a.project = { id: a.linkedToId, name };
    }
  }

  async create(body: CreateActivityDto, userId: string) {
    const { _id, id, createdAt, updatedAt, assignedTo, createdBy, customer, deal, linkedTo, ...rest } =
      body as unknown as Record<string, unknown>;
    const resolvedLinkedToId = (rest.linkedToId ?? linkedTo) as string | undefined;
    const data: Record<string, unknown> = { ...rest, linkedToId: resolvedLinkedToId, createdById: userId };
    delete data.linkedTo;
    // Prisma requires a proper Date object for DateTime fields
    if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
    // Strip empty description so it's stored as null, not empty string
    if (data.description === '') delete data.description;
    if (assignedTo) data.assignedToId = typeof assignedTo === 'object' ? (assignedTo as { _id?: string })._id : assignedTo;
    if (resolvedLinkedToId && rest.linkedModel === 'Customer') data.customerId = resolvedLinkedToId;
    if (resolvedLinkedToId && rest.linkedModel === 'Deal') data.dealId = resolvedLinkedToId;
    if (resolvedLinkedToId && rest.linkedModel === 'Project') data.projectId = resolvedLinkedToId;
    data.customFields = await this.customFields.validateAndClean(
      'activities',
      data.customFields as Record<string, unknown> | undefined,
    );

    const activity = await this.prisma.activity.create({
      data: data as Prisma.ActivityUncheckedCreateInput,
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
    const { _id, id: _id2, createdAt, updatedAt, assignedTo, createdBy, customer, deal, ...rest } =
      body as unknown as Record<string, unknown>;
    const data: Record<string, unknown> = { ...rest };
    if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
    if (data.description === '') delete data.description;
    if (assignedTo !== undefined) data.assignedToId = typeof assignedTo === 'object' ? (assignedTo as { _id?: string })?._id : assignedTo;
    if ('customFields' in data) {
      data.customFields = await this.customFields.validateAndClean(
        'activities',
        data.customFields as Record<string, unknown> | undefined,
      );
    }
    const activity = await this.prisma.activity.update({
      where: { id },
      data: data as Prisma.ActivityUncheckedUpdateInput,
    });
    return toClient(activity);
  }

  async remove(id: string) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('activity not found');
    await this.prisma.activity.delete({ where: { id } });
    return true;
  }
}
