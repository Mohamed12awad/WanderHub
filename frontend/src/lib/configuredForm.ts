import type { ModuleFieldLayout, ResolvedField } from "@/hooks/useModuleFieldLayout";
import { SYSTEM_DEFAULTS, DEFAULT_SECTIONS, type FieldModule } from "@/config/fieldDefaults";

// ─────────────────────────────────────────────────────────────────────────────
// Shared mechanics for config-driven entity forms. Each form supplies its own
// bespoke `renderField(name)` registry and locale maps; these helpers handle the
// repetitive parts: grouping visible system fields into the configured sections,
// enforcing admin-configured required flags, and resolving localized labels that
// fall back to the translation until an admin renames the field/section.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfiguredSection {
  id: string;
  label: string;
  fields: ResolvedField[];
}

/** Reads a (possibly dotted) path off an object. */
export const getFieldPath = (obj: any, path: string): unknown =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Groups the module's visible system fields into the configured sections, in
 * order. Hidden fields are dropped unless listed in `forceVisible` (fields the
 * backend mandates, which must always render so the form can submit). Sections
 * left with no fields are removed.
 */
export function groupConfiguredSections(
  layout: ModuleFieldLayout,
  forceVisible: Set<string> = new Set(),
): ConfiguredSection[] {
  const bySection = new Map<string, ResolvedField[]>();
  for (const f of layout.allFields) {
    if (!f.isSystem) continue;
    if (f.hidden && !forceVisible.has(f.name)) continue;
    const arr = bySection.get(f.section) ?? [];
    arr.push(f);
    bySection.set(f.section, arr);
  }
  return layout.sections
    .map((s) => ({ id: s.id, label: s.label, fields: bySection.get(s.id) ?? [] }))
    .filter((s) => s.fields.length > 0);
}

/**
 * Returns the visible required system fields whose value in `data` is empty —
 * for enforcing admin-configured required flags beyond a form's fixed schema
 * core. `skip` lists names already enforced elsewhere (e.g. by the zod schema).
 */
export function collectMissingRequired(
  layout: ModuleFieldLayout,
  data: any,
  forceVisible: Set<string> = new Set(),
  skip: string[] = [],
): ResolvedField[] {
  return layout.allFields.filter((f) => {
    if (!f.isSystem || !f.required || f.hidden) return false;
    if (forceVisible.has(f.name) || skip.includes(f.name) || f.name === "createdAt") return false;
    const v = getFieldPath(data, f.name);
    return v == null || String(v).trim() === "";
  });
}

/**
 * Builds label resolvers for a module. `label(field, locale)` and
 * `sectionTitle(section, locale)` return the localized string while the
 * field/section still carries its English system default (i.e. not yet renamed
 * by an admin); once renamed, the admin's label wins. `locale` maps the field
 * name / section id to its translated string.
 */
export function moduleLabelResolvers(module: FieldModule) {
  const fieldDefaults = new Map(SYSTEM_DEFAULTS[module].map((d) => [d.name, d.label]));
  const sectionDefaults = new Map(DEFAULT_SECTIONS[module].map((s) => [s.id, s.label]));
  return {
    label: (f: ResolvedField, locale: Record<string, string | undefined>): string => {
      const def = fieldDefaults.get(f.name);
      if (def && f.label === def && locale[f.name]) return locale[f.name]!;
      return f.label;
    },
    sectionTitle: (s: { id: string; label: string }, locale: Record<string, string | undefined>): string => {
      const def = sectionDefaults.get(s.id);
      if (def && s.label === def && locale[s.id]) return locale[s.id]!;
      return s.label;
    },
  };
}
