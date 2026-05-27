import { useQuery } from "react-query";
import { getWorkspaceSettings } from "@/utils/api";

export type FieldType = "text" | "number" | "date" | "select" | "boolean" | "email" | "phone" | "url";

export interface FieldDef {
  id: string;
  name: string;      // internal key
  label: string;     // display label (user-editable)
  type: FieldType;
  required: boolean;
  options?: string;  // comma-separated for select type
  isSystem?: boolean;
  filterable?: boolean;
  order?: number;
}

export interface WorkspaceSettings {
  fieldGroups: { module: string; fields: FieldDef[] }[];
  moduleSettings: { module: string; enabled: boolean }[];
}

export function useWorkspaceSettings() {
  const { data, isLoading } = useQuery<WorkspaceSettings>(
    ["workspaceSettings"],
    async () => (await getWorkspaceSettings()).data,
    { staleTime: 5 * 60 * 1000 }
  );

  const getFieldsForModule = (module: string): FieldDef[] => {
    return data?.fieldGroups.find((g) => g.module === module)?.fields ?? [];
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
    const setting = data?.moduleSettings.find((s) => s.module === module);
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

  return { data, isLoading, getFieldsForModule, getFilterableCustomFields, getSystemFieldLabel, isModuleEnabled };
}
