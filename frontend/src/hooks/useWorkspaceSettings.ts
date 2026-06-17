import { useQuery } from "@tanstack/react-query";
import { getWorkspaceSettings } from "@/utils/api";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "email"
  | "phone"
  | "url";

export interface SectionDef {
  id: string;
  label: string;
  order: number;
}

export interface FieldDef {
  id: string;
  name: string;      // internal key
  label: string;     // display label (user-editable)
  type: FieldType;
  required: boolean;
  hidden?: boolean;  // when true, the field is omitted from create/edit forms
  options?: string;  // comma-separated for select type
  isSystem?: boolean;
  filterable?: boolean;
  order?: number;
  section?: string;  // section id the field belongs to (layout editor)
  // Optional, additive richer-field props (backward compatible).
  multiselect?: boolean;   // select: allow multiple values
  defaultValue?: string;   // prefilled when the value is empty
  helpText?: string;       // shown under the input
  placeholder?: string;
  min?: number;            // number: minimum
  max?: number;            // number: maximum
  pattern?: string;        // text/textarea/phone: regex constraint
  maxLength?: number;      // text/textarea: max length
}

export interface WorkspaceSettings {
  fieldGroups: { module: string; fields: FieldDef[]; sections?: SectionDef[] }[];
  moduleSettings: { module: string; enabled: boolean }[];
  pipelineStages: unknown[];
}

type LegacyId = { id?: string; _id?: string };

export function normalizeWorkspaceSettings(data: any): WorkspaceSettings {
  return {
    ...data,
    fieldGroups: Array.isArray(data?.fieldGroups)
      ? data.fieldGroups.map((group: any) => ({
          ...group,
          fields: Array.isArray(group.fields)
            ? group.fields.map((field: FieldDef & LegacyId) => ({
                ...field,
                id: field.id ?? field._id,
              }))
            : [],
          sections: Array.isArray(group.sections)
            ? group.sections.map((section: SectionDef & LegacyId) => ({
                ...section,
                id: section.id ?? section._id,
              }))
            : undefined,
        }))
      : [],
    moduleSettings: Array.isArray(data?.moduleSettings) ? data.moduleSettings : [],
    pipelineStages: Array.isArray(data?.pipelineStages) ? data.pipelineStages : [],
  };
}

export function useWorkspaceSettings() {
  const { data, isPending } = useQuery({
    queryKey: ["workspaceSettings"],
    queryFn: async () => normalizeWorkspaceSettings((await getWorkspaceSettings()).data),
    staleTime: 5 * 60 * 1000
  });

  const getFieldsForModule = (module: string): FieldDef[] => {
    return data?.fieldGroups?.find((g: any) => g.module === module)?.fields ?? [];
  };

  /** Returns the ordered section layout for a module (empty if none defined) */
  const getSectionsForModule = (module: string): SectionDef[] => {
    const sections: SectionDef[] = data?.fieldGroups?.find((g: any) => g.module === module)?.sections ?? [];
    return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  /** Returns only custom (non-system) filterable fields for use in filter panels */
  const getFilterableCustomFields = (module: string): FieldDef[] => {
    return getFieldsForModule(module).filter((f) => !f.isSystem && f.filterable);
  };

  /** Returns system field override label for a given internal name */
  const getSystemFieldLabel = (module: string, name: string): string | undefined => {
    const fields = getFieldsForModule(module);
    const override = fields.find((f) => f.isSystem && f.name === name);
    return override?.label;
  };

  const isModuleEnabled = (module: string): boolean => {
    const setting = data?.moduleSettings.find((s: any) => s.module === module);
    if (!setting) {
      try {
        const stored = localStorage.getItem("crm-modules");
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed[module] ?? true;
        }
      } catch { /* ignore */ }
      return true;
    }
    return setting.enabled;
  };

  return { data, isPending, getFieldsForModule, getSectionsForModule, getFilterableCustomFields, getSystemFieldLabel, isModuleEnabled };
}
