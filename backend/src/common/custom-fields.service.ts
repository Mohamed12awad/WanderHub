import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkspaceConfigService } from './workspace-config.service';

/**
 * Admin-defined custom field definition, as persisted in
 * `WorkspaceConfig.fieldGroups[].fields`. Mirrors the frontend `FieldDef`
 * (useWorkspaceSettings.ts). Only `id` is guaranteed; everything else is
 * optional so older/partial definitions stay valid.
 */
interface FieldDef {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string;
  isSystem?: boolean;
  multiselect?: boolean;
  defaultValue?: string;
  min?: number;
  max?: number;
  pattern?: string;
  maxLength?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

/**
 * Validates and coerces user-supplied custom field VALUES against the
 * admin-defined field schema for a module. This is the single enforcement point
 * for custom fields — entity services call it on create/update before persisting
 * the `customFields` JSON column. Values are keyed by field `id`, matching the
 * frontend DynamicFields renderer and `buildCfConditions` filtering.
 */
@Injectable()
export class CustomFieldsService {
  constructor(private readonly workspaceConfig: WorkspaceConfigService) {}

  private async defsFor(module: string): Promise<FieldDef[]> {
    const config = await this.workspaceConfig.get();
    const groups = config.fieldGroups as unknown as { module: string; fields: FieldDef[] }[];
    if (!Array.isArray(groups)) return [];
    const group = groups.find((g) => g?.module === module);
    return (group?.fields ?? []).filter((f) => f && f.id && !f.isSystem);
  }

  /**
   * Strips unknown keys, enforces `required`, applies defaults, and coerces each
   * value to its declared type. Returns `undefined` when nothing is left to
   * store so the JSON column stays null. Throws BadRequestException with a
   * field-level message on the first validation failure.
   */
  async validateAndClean(
    module: string,
    values: Record<string, unknown> | null | undefined,
  ): Promise<Record<string, unknown> | undefined> {
    const defs = await this.defsFor(module);
    if (defs.length === 0) return undefined;

    const input = values && typeof values === 'object' ? (values as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};

    for (const def of defs) {
      let raw = input[def.id];
      if (
        (raw === undefined || raw === null || raw === '') &&
        def.defaultValue !== undefined &&
        def.defaultValue !== ''
      ) {
        raw = def.defaultValue;
      }

      const empty =
        raw === undefined ||
        raw === null ||
        raw === '' ||
        (Array.isArray(raw) && raw.length === 0);

      if (empty) {
        if (def.required) {
          throw new BadRequestException(`Field "${this.label(def)}" is required.`);
        }
        continue;
      }

      out[def.id] = this.coerce(def, raw);
    }

    return Object.keys(out).length ? out : undefined;
  }

  private label(def: FieldDef): string {
    return def.label || def.name || def.id;
  }

  private coerce(def: FieldDef, raw: unknown): unknown {
    const label = this.label(def);
    const type = def.type || 'text';
    const asStr = typeof raw === 'string' ? raw.trim() : String(raw);

    switch (type) {
      case 'number': {
        const n = Number(asStr);
        if (Number.isNaN(n)) throw new BadRequestException(`Field "${label}" must be a number.`);
        if (def.min !== undefined && n < def.min) throw new BadRequestException(`Field "${label}" must be ≥ ${def.min}.`);
        if (def.max !== undefined && n > def.max) throw new BadRequestException(`Field "${label}" must be ≤ ${def.max}.`);
        return n;
      }
      case 'boolean':
        return raw === true || asStr === 'true' || asStr === '1';
      case 'date': {
        const d = new Date(asStr);
        if (Number.isNaN(d.getTime())) throw new BadRequestException(`Field "${label}" must be a valid date.`);
        return asStr;
      }
      case 'select': {
        const opts = (def.options ?? '').split(',').map((o) => o.trim()).filter(Boolean);
        if (def.multiselect) {
          const arr = Array.isArray(raw)
            ? raw.map((v) => String(v).trim()).filter(Boolean)
            : asStr.split(',').map((s) => s.trim()).filter(Boolean);
          for (const v of arr) {
            if (opts.length && !opts.includes(v)) {
              throw new BadRequestException(`Field "${label}" has an invalid option: ${v}.`);
            }
          }
          return arr;
        }
        if (opts.length && !opts.includes(asStr)) {
          throw new BadRequestException(`Field "${label}" has an invalid option.`);
        }
        return asStr;
      }
      case 'email':
        if (!EMAIL_RE.test(asStr)) throw new BadRequestException(`Field "${label}" must be a valid email.`);
        return asStr;
      case 'url':
        if (!URL_RE.test(asStr)) throw new BadRequestException(`Field "${label}" must be a valid URL.`);
        return asStr;
      default: {
        // text, textarea, phone
        if (def.maxLength !== undefined && asStr.length > def.maxLength) {
          throw new BadRequestException(`Field "${label}" exceeds the maximum length of ${def.maxLength}.`);
        }
        if (def.pattern) {
          let re: RegExp | null = null;
          try { re = new RegExp(def.pattern); } catch { re = null; }
          if (re && !re.test(asStr)) throw new BadRequestException(`Field "${label}" is invalid.`);
        }
        return asStr;
      }
    }
  }
}
