import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

interface DedupEntityConfig {
  /** Permission base, e.g. 'contacts' or 'leads'. */
  base: string;
  /** linkedModel value used by polymorphic children (Activity/Note/Timeline/Attachment). */
  linkedModel: string;
}

const DEDUP_ENTITIES: Record<string, DedupEntityConfig> = {
  customers: { base: 'contacts', linkedModel: 'Customer' },
  leads: { base: 'leads', linkedModel: 'Lead' },
};

interface DupRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
}

export interface DuplicateGroup {
  field: 'phone' | 'email';
  value: string;
  records: DupRecord[];
}

const normPhone = (s?: string | null) => (s ?? '').replace(/\D/g, '');
const normEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

@Injectable()
export class DedupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly timeline: TimelineService,
  ) {}

  private config(entity: string): DedupEntityConfig {
    const cfg = DEDUP_ENTITIES[entity];
    if (!cfg) throw new NotFoundException(`Unknown dedup target: ${entity}`);
    return cfg;
  }

  private assert(user: AuthUser, action: 'view' | 'edit', base: string) {
    const required = `${base}:${action}`;
    const perms = user.permissions ?? [];
    const ok = perms.includes('*') || perms.some((p) => p === required || p.startsWith(`${required}:`));
    if (!ok) throw new ForbiddenException(`Permission denied: ${required}`);
  }

  /** Groups of records that share a normalized phone or email, within scope. */
  async findDuplicates(entity: string, user: AuthUser): Promise<DuplicateGroup[]> {
    const cfg = this.config(entity);
    this.assert(user, 'view', cfg.base);
    const scopeWhere = await this.visibility.ownershipWhere(user, cfg.base, 'ownerId');

    const model = entity === 'leads' ? this.prisma.lead : this.prisma.customer;
    const records = (await (model as unknown as { findMany(args: unknown): Promise<unknown[]> }).findMany({
      where: { deletedAt: null, ...scopeWhere },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })) as DupRecord[];

    const byPhone = new Map<string, DupRecord[]>();
    const byEmail = new Map<string, DupRecord[]>();
    for (const r of records) {
      const p = normPhone(r.phone);
      const e = normEmail(r.email);
      if (p) (byPhone.get(p) ?? byPhone.set(p, []).get(p)!).push(r);
      if (e) (byEmail.get(e) ?? byEmail.set(e, []).get(e)!).push(r);
    }

    const groups: DuplicateGroup[] = [];
    const seen = new Set<string>(); // dedupe identical member-sets
    const collect = (field: 'phone' | 'email', map: Map<string, DupRecord[]>) => {
      for (const [value, recs] of map) {
        if (recs.length < 2) continue;
        const sig = recs.map((r) => r.id).sort().join(',');
        if (seen.has(sig)) continue;
        seen.add(sig);
        groups.push({ field, value, records: recs });
      }
    };
    collect('phone', byPhone);
    collect('email', byEmail);
    return groups;
  }

  /** Reassign children from each merged record onto the survivor, then soft-delete merged. */
  async merge(entity: string, surviveId: string, mergeIds: string[], user: AuthUser) {
    const cfg = this.config(entity);
    this.assert(user, 'edit', cfg.base);

    const ids = [...new Set(mergeIds.filter((id) => id && id !== surviveId))];
    if (!ids.length) throw new BadRequestException('Provide at least one record to merge (other than the survivor).');

    const scopeWhere = await this.visibility.ownershipWhere(user, cfg.base, 'ownerId');
    const model = entity === 'leads' ? this.prisma.lead : this.prisma.customer;

    // Every record involved must exist, be live, and be within the user's scope.
    const all = [surviveId, ...ids];
    const found = (await (model as unknown as { findMany(args: unknown): Promise<unknown[]> }).findMany({
      where: { id: { in: all }, deletedAt: null, ...scopeWhere },
      select: { id: true },
    })) as { id: string }[];
    if (found.length !== all.length) {
      throw new BadRequestException('One or more records were not found or are not accessible.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (entity === 'customers') {
        // Typed FK owners of the customer.
        await tx.deal.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
        await tx.quote.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
        await tx.invoice.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
        await tx.project.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
        // Typed FK on activity/note/timeline.
        await tx.activity.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
        await tx.note.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
        await tx.timelineEvent.updateMany({ where: { customerId: { in: ids } }, data: { customerId: surviveId } });
      }
      // Polymorphic children (applies to both customers and leads).
      const poly = { linkedToId: { in: ids }, linkedModel: cfg.linkedModel };
      await tx.activity.updateMany({ where: poly, data: { linkedToId: surviveId } });
      await tx.note.updateMany({ where: poly, data: { linkedToId: surviveId } });
      await tx.timelineEvent.updateMany({ where: poly, data: { linkedToId: surviveId } });
      await tx.attachment.updateMany({ where: poly, data: { linkedToId: surviveId } });

      await (tx as unknown as Record<string, { updateMany(args: unknown): Promise<{ count: number }> }>)[
        entity === 'leads' ? 'lead' : 'customer'
      ].updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: now },
      });
    });

    await this.timeline.log(
      'record.merged',
      `Merged ${ids.length} duplicate ${entity === 'leads' ? 'lead(s)' : 'contact(s)'} into this record`,
      surviveId,
      cfg.linkedModel as 'Customer' | 'Lead',
      { mergedIds: ids },
      user.id,
    );

    return { surviveId, merged: ids.length };
  }
}
