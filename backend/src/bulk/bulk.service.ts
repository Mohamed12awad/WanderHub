import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';

export type BulkAction = 'delete' | 'assignOwner' | 'setStatus';

interface BulkEntityConfig {
  base: string; // permission base
  model: 'customer' | 'lead' | 'deal';
  /** Allowed status values for setStatus; undefined = free-form string. */
  statusValues?: string[];
}

const BULK_ENTITIES: Record<string, BulkEntityConfig> = {
  customers: { base: 'contacts', model: 'customer' },
  leads: { base: 'leads', model: 'lead', statusValues: ['new', 'contacted', 'nurturing', 'qualified', 'unqualified', 'converted'] },
  deals: { base: 'deals', model: 'deal', statusValues: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'] },
};

export interface BulkResult {
  updated: number;
  failed: { id: string; message: string }[];
}

@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly customers: CustomersService,
    private readonly leads: LeadsService,
    private readonly deals: DealsService,
  ) {}

  private config(entity: string): BulkEntityConfig {
    const cfg = BULK_ENTITIES[entity];
    if (!cfg) throw new NotFoundException(`Unknown bulk target: ${entity}`);
    return cfg;
  }

  private assert(user: AuthUser, action: string, base: string) {
    const required = `${base}:${action}`;
    const perms = user.permissions ?? [];
    const ok = perms.includes('*') || perms.some((p) => p === required || p.startsWith(`${required}:`));
    if (!ok) throw new ForbiddenException(`Permission denied: ${required}`);
  }

  async run(entity: string, action: BulkAction, ids: string[], value: string | undefined, user: AuthUser): Promise<BulkResult> {
    const cfg = this.config(entity);
    const cleanIds = [...new Set(ids.filter(Boolean))];
    if (!cleanIds.length) throw new BadRequestException('No records selected.');

    if (action === 'delete') return this.bulkDelete(entity, cleanIds, cfg, user);
    if (action === 'assignOwner') return this.bulkUpdate(cfg, cleanIds, { ownerId: value || null }, user);
    if (action === 'setStatus') {
      if (!value) throw new BadRequestException('A status value is required.');
      if (cfg.statusValues && !cfg.statusValues.includes(value)) {
        throw new BadRequestException(`Status must be one of: ${cfg.statusValues.join(', ')}`);
      }
      return this.bulkUpdate(cfg, cleanIds, { status: value }, user);
    }
    throw new BadRequestException(`Unsupported action: ${action}`);
  }

  /** Delete reuses each domain's remove() so guards (e.g. open invoices) + cascades apply. */
  private async bulkDelete(entity: string, ids: string[], cfg: BulkEntityConfig, user: AuthUser): Promise<BulkResult> {
    this.assert(user, 'delete', cfg.base);
    // Pre-filter to the records the user may actually see; silently dropping the
    // rest avoids leaking which ids exist outside their scope.
    const scopeWhere = await this.visibility.ownershipWhere(user, cfg.base, 'ownerId');
    const delegate = (this.prisma as unknown as Record<string, { findMany(args: unknown): Promise<unknown[]> }>)[cfg.model];
    const visible = (await delegate.findMany({
      where: { id: { in: ids }, deletedAt: null, ...scopeWhere },
      select: { id: true },
    })) as { id: string }[];

    const svc = entity === 'customers' ? this.customers : entity === 'leads' ? this.leads : this.deals;
    const result: BulkResult = { updated: 0, failed: [] };
    for (const { id } of visible) {
      try {
        await svc.remove(id, user);
        result.updated++;
      } catch (e) {
        result.failed.push({ id, message: e instanceof Error ? e.message : 'Delete failed' });
      }
    }
    return result;
  }

  private async bulkUpdate(cfg: BulkEntityConfig, ids: string[], data: Record<string, unknown>, user: AuthUser): Promise<BulkResult> {
    this.assert(user, 'edit', cfg.base);
    const scopeWhere = await this.visibility.ownershipWhere(user, cfg.base, 'ownerId');
    const delegate = (this.prisma as unknown as Record<string, { updateMany(args: unknown): Promise<{ count: number }> }>)[cfg.model];
    const res = await delegate.updateMany({
      where: { id: { in: ids }, deletedAt: null, ...scopeWhere },
      data,
    });
    return { updated: res.count, failed: [] };
  }
}
