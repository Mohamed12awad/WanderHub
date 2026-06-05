import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VisibilityService } from '../common/visibility.service';
import { WorkspaceConfigService } from '../common/workspace-config.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { CustomersService } from '../customers/customers.service';
import { LeadsService } from '../leads/leads.service';
import { DealsService } from '../deals/deals.service';
import { IMPORT_ENTITIES, ImportEntityConfig, ImportField, ImportFieldType } from './import.config';
import { ImportRequestDto } from './dto/import-request.dto';

/** Prefix marking a mapped field that belongs in the entity's customFields JSON. */
const CF_PREFIX = 'cf_';

interface WorkspaceFieldDef {
  id: string;
  label?: string;
  name?: string;
  type?: string;
  required?: boolean;
  options?: string;
  isSystem?: boolean;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly workspaceConfig: WorkspaceConfigService,
    private readonly customers: CustomersService,
    private readonly leads: LeadsService,
    private readonly deals: DealsService,
  ) {}

  private config(entity: string): ImportEntityConfig {
    const cfg = IMPORT_ENTITIES[entity];
    if (!cfg) throw new NotFoundException(`Unknown import target: ${entity}`);
    return cfg;
  }

  /** Maps a workspace custom-field type to an import coercion type. */
  private cfType(type?: string): ImportFieldType {
    if (type === 'number') return 'number';
    if (type === 'date') return 'date';
    if (type === 'select') return 'enum';
    return 'string';
  }

  /** Workspace custom fields for an entity, as importable `cf_<id>` fields. */
  private async customFields(cfg: ImportEntityConfig): Promise<ImportField[]> {
    if (!cfg.customFieldsModule) return [];
    const config = await this.workspaceConfig.get();
    const groups = (config.fieldGroups as unknown as { module: string; fields: WorkspaceFieldDef[] }[]) ?? [];
    const group = groups.find((g) => g.module === cfg.customFieldsModule);
    return (group?.fields ?? [])
      .filter((f) => !f.isSystem && f.id)
      .map((f) => ({
        key: `${CF_PREFIX}${f.id}`,
        label: f.label || f.name || f.id,
        required: !!f.required,
        type: this.cfType(f.type),
        enumValues: f.type === 'select' && f.options ? f.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      }));
  }

  /** Full importable field list: static schema fields + workspace custom fields. */
  private async resolveFields(cfg: ImportEntityConfig): Promise<ImportField[]> {
    return [...cfg.fields, ...(await this.customFields(cfg))];
  }

  /** Field metadata for the mapping UI. */
  async getFields(entity: string) {
    const cfg = this.config(entity);
    return { entity, fields: await this.resolveFields(cfg) };
  }

  /** Mirrors PermissionGuard semantics for the dynamic, per-entity permission. */
  private assertCanImport(user: AuthUser, required: string) {
    const perms = user.permissions ?? [];
    const ok = perms.includes('*') || perms.some((p) => p === required || p.startsWith(`${required}:`));
    if (!ok) throw new ForbiddenException(`Permission denied: ${required}`);
  }

  /** Coerce one CSV cell to its target type, or undefined when blank. */
  private coerce(field: ImportField, raw: unknown): unknown {
    const v = (raw ?? '').toString().trim();
    if (v === '') return undefined;
    switch (field.type) {
      case 'number': {
        const n = Number(v);
        if (Number.isNaN(n)) throw new Error(`"${field.label}" must be a number (got "${v}")`);
        return n;
      }
      case 'enum': {
        const match = field.enumValues?.find((e) => e.toLowerCase() === v.toLowerCase());
        if (!match) {
          throw new Error(`"${field.label}" must be one of: ${field.enumValues?.join(', ')} (got "${v}")`);
        }
        return match;
      }
      default:
        return v;
    }
  }

  async run(entity: string, body: ImportRequestDto, user: AuthUser): Promise<ImportResult> {
    const cfg = this.config(entity);
    this.assertCanImport(user, cfg.permission);

    const { mapping, rows } = body;
    const fields = await this.resolveFields(cfg);

    // Required fields must be mapped to a column before we touch any row.
    const missing = fields
      .filter((f) => f.required && !mapping[f.key])
      .map((f) => f.label);
    if (missing.length) {
      throw new BadRequestException(`Map a column for required field(s): ${missing.join(', ')}`);
    }

    const result: ImportResult = { total: rows.length, created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +1 for header row, +1 for 1-based display
      try {
        const mapped = this.mapRow(fields, mapping, rows[i]);
        if (cfg.defaultOwner && mapped.owner === undefined) mapped.owner = user.id;
        await this.createOne(entity, mapped, user);
        result.created++;
      } catch (e: unknown) {
        result.errors.push({ row: rowNumber, message: this.friendlyError(e) });
        result.skipped++;
      }
    }

    return result;
  }

  private mapRow(
    fields: ImportField[],
    mapping: Record<string, string>,
    raw: Record<string, string>,
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    const customFields: Record<string, unknown> = {};
    for (const field of fields) {
      const col = mapping[field.key];
      if (!col) continue; // unmapped optional field
      const value = this.coerce(field, raw[col]);
      if (value === undefined) {
        if (field.required) throw new Error(`"${field.label}" is required but empty`);
        continue;
      }
      if (field.key.startsWith(CF_PREFIX)) {
        customFields[field.key.slice(CF_PREFIX.length)] = value;
      } else {
        mapped[field.key] = value;
      }
    }
    if (Object.keys(customFields).length) mapped.customFields = customFields;
    return mapped;
  }

  private async createOne(entity: string, mapped: Record<string, unknown>, user: AuthUser) {
    switch (entity) {
      case 'customers':
        return this.customers.create(mapped as any, user.id);
      case 'leads':
        return this.leads.create(mapped as any, user.id);
      case 'deals': {
        const ref = String(mapped.customerRef);
        delete mapped.customerRef;
        mapped.customer = await this.resolveCustomer(ref, user);
        return this.deals.create(mapped as any, user.id);
      }
      default:
        throw new Error(`Unsupported import target: ${entity}`);
    }
  }

  /** Resolve a contact within the importer's visibility scope by phone, email, then name. */
  private async resolveCustomer(ref: string, user: AuthUser): Promise<string> {
    const scopeWhere = await this.visibility.ownershipWhere(user, 'contacts', 'ownerId');
    const customer = await this.prisma.customer.findFirst({
      where: {
        deletedAt: null,
        ...scopeWhere,
        OR: [{ phone: ref }, { email: ref }, { name: ref }],
      },
      select: { id: true },
    });
    if (!customer) throw new Error(`No contact found matching "${ref}"`);
    return customer.id;
  }

  private friendlyError(e: unknown): string {
    const err = e as { code?: string; message?: string; meta?: { target?: unknown } };
    if (err?.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'a unique field';
      return `Duplicate value for ${target}`;
    }
    return err?.message ?? 'Unknown error';
  }
}
