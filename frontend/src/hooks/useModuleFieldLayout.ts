import { useMemo } from "react";
import { useWorkspaceSettings, type FieldDef, type SectionDef } from "@/hooks/useWorkspaceSettings";
import { SYSTEM_DEFAULTS, DEFAULT_SECTIONS, type FieldModule } from "@/config/fieldDefaults";

// ─────────────────────────────────────────────────────────────────────────────
// Resolves the *effective* field layout for a module by merging the built-in
// system defaults (config/fieldDefaults) with the admin overrides saved in
// WorkspaceConfig.fieldGroups — the same merge the Fields settings editor does,
// but shaped for forms to consume. Forms render their bespoke widgets keyed by
// field `name`; this hook tells them the order, sectioning, required flag,
// visibility, label and (for selects) option overrides for each one.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedField extends FieldDef {
  name: string;
  section: string;
  order: number;
}

export interface ResolvedSection extends SectionDef {
  /** Visible (non-hidden) fields in display order. */
  fields: ResolvedField[];
}

type SavedGroup = { module: string; fields?: FieldDef[]; sections?: SectionDef[] };

function resolveLayout(module: FieldModule, savedGroups: SavedGroup[]) {
  const saved = savedGroups.find((g) => g.module === module);

  // Sections: defaults, overlaid with saved label/order. Keep a saved section
  // only if it's still a current default OR user-created (`sec_…`).
  const defaults = DEFAULT_SECTIONS[module];
  const defaultIds = new Set(defaults.map((s) => s.id));
  const byId = new Map<string, SectionDef>(defaults.map((s) => [s.id, { ...s }]));
  (saved?.sections ?? []).forEach((sv) => {
    if (!defaultIds.has(sv.id) && !sv.id.startsWith("sec_")) return;
    const base = byId.get(sv.id);
    byId.set(sv.id, {
      id: sv.id,
      label: sv.label ?? base?.label ?? sv.id,
      order: sv.order ?? base?.order ?? byId.size,
    });
  });
  const sections = [...byId.values()].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
  const secIds = new Set(sections.map((s) => s.id));
  const rank = new Map(sections.map((s, i) => [s.id, i]));
  const primary = sections[0]?.id;

  // Fields: inject any missing system defaults, then overlay saved overrides.
  const sysDefaults = SYSTEM_DEFAULTS[module].map((d, i) => ({ id: `sys_${module}_${d.name}`, order: i, ...d }));
  const defaultSectionById = new Map(sysDefaults.map((d) => [d.id, d.section]));
  const existing = saved?.fields ? [...saved.fields] : [];
  const existingIds = new Set(existing.map((f) => f.id));
  const merged = [...sysDefaults.filter((d) => !existingIds.has(d.id)), ...existing];

  const resolved: ResolvedField[] = merged.map((f) => {
    const section = f.section && secIds.has(f.section)
      ? f.section
      : (defaultSectionById.get(f.id!) && secIds.has(defaultSectionById.get(f.id!)!)
          ? defaultSectionById.get(f.id!)!
          : primary!);
    return { ...f, name: f.name ?? "", section, order: f.order ?? 0 } as ResolvedField;
  });

  resolved.sort((a, b) => {
    const sa = rank.get(a.section) ?? 0;
    const sb = rank.get(b.section) ?? 0;
    return sa !== sb ? sa - sb : a.order - b.order;
  });

  const sectionsWithFields: ResolvedSection[] = sections.map((s) => ({
    ...s,
    fields: resolved.filter((f) => f.section === s.id && !f.hidden),
  }));

  return { sections: sectionsWithFields, fields: resolved };
}

export interface ModuleFieldLayout {
  /** Ordered sections, each carrying its visible fields in order. */
  sections: ResolvedSection[];
  /** Every resolved field (including hidden ones), in display order. */
  allFields: ResolvedField[];
  /** Every resolved field (including hidden ones) keyed by name. */
  byName: Map<string, ResolvedField>;
  isRequired: (name: string) => boolean;
  isHidden: (name: string) => boolean;
  label: (name: string, fallback?: string) => string;
  options: (name: string) => string[] | undefined;
}

export function useModuleFieldLayout(module: FieldModule): ModuleFieldLayout {
  const { data } = useWorkspaceSettings();
  const savedGroups = (data?.fieldGroups ?? []) as SavedGroup[];

  return useMemo(() => {
    const { sections, fields } = resolveLayout(module, savedGroups);
    const byName = new Map(fields.map((f) => [f.name, f]));
    return {
      sections,
      allFields: fields,
      byName,
      isRequired: (name) => !!byName.get(name)?.required,
      isHidden: (name) => !!byName.get(name)?.hidden,
      label: (name, fallback) => byName.get(name)?.label ?? fallback ?? name,
      options: (name) => {
        const raw = byName.get(name)?.options;
        if (raw == null) return undefined;
        return raw.split(",").map((o) => o.trim()).filter(Boolean);
      },
    };
    // savedGroups identity changes only when the query data changes.
  }, [module, savedGroups]);
}
