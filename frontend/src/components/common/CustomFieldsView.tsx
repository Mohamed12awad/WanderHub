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
  const { getFieldsForModule } = useWorkspaceSettings();

  if (!values || typeof values !== "object") return null;
  const entries = Object.entries(values as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return null;

  const labels: Record<string, string> = {};
  for (const f of getFieldsForModule(module)) {
    labels[f.id] = f.label;
    if (f.name) labels[f.name] = f.label;
  }

  return (
    <section className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Custom Fields
      </h2>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="text-xs text-muted-foreground">{labels[k] ?? k}</span>
            <span className="text-sm">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CustomFieldsView;
