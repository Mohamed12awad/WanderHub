import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { ProductsService } from '../products/products.service';
import { SuppliersService } from '../procurement/suppliers.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';

export type BulkAction = 'delete' | 'assignOwner' | 'setStatus';

interface BulkEntityConfig {
  base: string; // permission base
  model: string; // prisma delegate name
  /** Owner column. Present only on owner-scoped entities; enables assignOwner + visibility scoping. */
  ownerField?: string;
  /** Allowed status values for setStatus. */
  statusValues?: string[];
  /** When true, setStatus accepts any string (no enum constraint). */
  freeStatus?: boolean;
}

// Metadata only — the actual delete is routed through each domain's service (see
// `remover`) so entity-specific guards and cascades still apply.
const BULK_ENTITIES: Record<string, BulkEntityConfig> = {
  customers: { base: 'contacts', model: 'customer', ownerField: 'ownerId', freeStatus: true },
  leads: { base: 'leads', model: 'lead', ownerField: 'ownerId', statusValues: ['new', 'contacted', 'nurturing', 'qualified', 'unqualified', 'converted'] },
  deals: { base: 'deals', model: 'deal', ownerField: 'ownerId', statusValues: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'] },
  suppliers: { base: 'suppliers', model: 'supplier', statusValues: ['active', 'inactive'] },
  projects: { base: 'projects', model: 'project', statusValues: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
  tasks: { base: 'tasks', model: 'task', statusValues: ['todo', 'in_progress', 'done', 'cancelled'] },
  // Products have neither an owner nor a status column — only bulk delete applies.
  products: { base: 'products', model: 'product' },
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
    private readonly products: ProductsService,
    private readonly suppliers: SuppliersService,
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
  ) {}

  /** Per-entity delete, routed through the domain service so guards/cascades apply. */
  private remover(entity: string): (id: string, user: AuthUser) => Promise<unknown> {
    switch (entity) {
      case 'customers': return (id, user) => this.customers.remove(id, user);
      case 'leads': return (id, user) => this.leads.remove(id, user);
      case 'deals': return (id, user) => this.deals.remove(id, user);
      case 'products': return (id) => this.products.remove(id);
      case 'suppliers': return (id) => this.suppliers.remove(id);
      case 'projects': return (id) => this.projects.remove(id);
      case 'tasks': return (id) => this.tasks.remove(id);
      default: throw new NotFoundException(`Unknown bulk target: ${entity}`);
    }
  }

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

  /** Records visible to the user — scoped only for owner-bearing entities. */
  private async scopeWhere(cfg: BulkEntityConfig, user: AuthUser): Promise<Record<string, unknown>> {
    if (!cfg.ownerField) return {};
    return this.visibility.ownershipWhere(user, cfg.base, cfg.ownerField);
  }

  async run(entity: string, action: BulkAction, ids: string[], value: string | undefined, user: AuthUser): Promise<BulkResult> {
    const cfg = this.config(entity);
    const cleanIds = [...new Set(ids.filter(Boolean))];
    if (!cleanIds.length) throw new BadRequestException('No records selected.');

    if (action === 'delete') return this.bulkDelete(entity, cleanIds, cfg, user);

    if (action === 'assignOwner') {
      if (!cfg.ownerField) throw new BadRequestException(`"${entity}" does not support owner assignment.`);
      return this.bulkUpdate(cfg, cleanIds, { [cfg.ownerField]: value || null }, user);
    }

    if (action === 'setStatus') {
      if (!cfg.statusValues && !cfg.freeStatus) {
        throw new BadRequestException(`"${entity}" does not support status changes.`);
      }
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
    const scopeWhere = await this.scopeWhere(cfg, user);
    const delegate = (this.prisma as unknown as Record<string, { findMany(args: unknown): Promise<unknown[]> }>)[cfg.model];
    const visible = (await delegate.findMany({
      where: { id: { in: ids }, deletedAt: null, ...scopeWhere },
      select: { id: true },
    })) as { id: string }[];

    const remove = this.remover(entity);
    const result: BulkResult = { updated: 0, failed: [] };
    for (const { id } of visible) {
      try {
        await remove(id, user);
        result.updated++;
      } catch (e) {
        result.failed.push({ id, message: e instanceof Error ? e.message : 'Delete failed' });
      }
    }
    return result;
  }

  private async bulkUpdate(cfg: BulkEntityConfig, ids: string[], data: Record<string, unknown>, user: AuthUser): Promise<BulkResult> {
    this.assert(user, 'edit', cfg.base);
    const scopeWhere = await this.scopeWhere(cfg, user);
    const delegate = (this.prisma as unknown as Record<string, { updateMany(args: unknown): Promise<{ count: number }> }>)[cfg.model];
    const res = await delegate.updateMany({
      where: { id: { in: ids }, deletedAt: null, ...scopeWhere },
      data,
    });
    return { updated: res.count, failed: [] };
  }
}
