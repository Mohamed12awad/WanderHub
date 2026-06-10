import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";

interface Props {
  module: string;
  values: unknown;
  className?: string;
}

/**
 * Read-only display of a record's custom field values on detail pages. Resolves
 * admin-defined labels from the workspace field schema and renders a 2-column
 * key/value grid. Renders nothing when there are no values.
 */
export function CustomFieldsView({ module, values, className }: Props) {
  const { getFieldsForModule, getSectionsForModule } = useWorkspaceSettings();

  if (!values || typeof values !== "object") return null;
  const entries = Object.entries(values as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return null;

  // Resolve label + section for each stored value (keyed by field id or name).
  const meta: Record<string, { label: string; section?: string }> = {};
  for (const f of getFieldsForModule(module)) {
    meta[f.id] = { label: f.label, section: f.section };
    if (f.name) meta[f.name] = { label: f.label, section: f.section };
  }
  const sections = getSectionsForModule(module);
  const sectionLabel = new Map(sections.map((s) => [s.id, s.label]));
  const sectionRank = new Map(sections.map((s, i) => [s.id, i]));

  // Group displayed values by section, in section order.
  const groups: { key: string; label: string; rank: number; items: [string, unknown][] }[] = [];
  const findGroup = (key: string) => groups.find((g) => g.key === key);
  for (const [k, v] of entries) {
    const m = meta[k];
    const key = m?.section && sectionLabel.has(m.section) ? m.section : "__custom__";
    const label = key === "__custom__" ? "Custom Fields" : sectionLabel.get(key)!;
    const rank = key === "__custom__" ? Number.MAX_SAFE_INTEGER : sectionRank.get(key) ?? 0;
    const g = findGroup(key);
    if (g) g.items.push([k, v]);
    else groups.push({ key, label, rank, items: [[k, v]] });
  }
  groups.sort((a, b) => a.rank - b.rank);

  return (
    <section className={className}>
      {groups.map((group) => (
        <div key={group.key} className="mb-5 last:mb-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {group.label}
          </h2>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2">
            {group.items.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-xs text-muted-foreground">{meta[k]?.label ?? k}</span>
                <span className="text-sm">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export default CustomFieldsView;
