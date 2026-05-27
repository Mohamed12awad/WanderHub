import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/utils/api";

export const MODULE_KEYS = [
  "customers", "deals", "pipeline", "calendar", "tasks", "products", "expenses", "finance", "reports",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
type ModulesState = Record<ModuleKey, boolean>;

const DEFAULT: ModulesState = {
  customers: true, deals: true, pipeline: true, calendar: true,
  tasks: true, products: true, expenses: true, finance: true, reports: true,
};

function loadFromStorage(): ModulesState {
  try {
    const s = localStorage.getItem("crm-modules");
    return s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

interface ModulesContextProps {
  modules: ModulesState;
  setModule: (key: ModuleKey, enabled: boolean) => void;
}

const ModulesContext = createContext<ModulesContextProps | undefined>(undefined);

export const ModulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<ModulesState>(loadFromStorage);

  // Sync from API on mount (non-blocking — keeps localStorage values during load)
  useEffect(() => {
    getWorkspaceSettings()
      .then((res) => {
        const settings: { module: string; enabled: boolean }[] = res.data?.moduleSettings ?? [];
        if (settings.length > 0) {
          const fromServer: Partial<ModulesState> = {};
          settings.forEach((s) => {
            if (MODULE_KEYS.includes(s.module as ModuleKey)) {
              fromServer[s.module as ModuleKey] = s.enabled;
            }
          });
          setModules((prev) => {
            const next = { ...prev, ...fromServer };
            localStorage.setItem("crm-modules", JSON.stringify(next));
            return next;
          });
        }
      })
      .catch(() => { /* ignore — localStorage state is already loaded */ });
  }, []);

  const setModule = (key: ModuleKey, enabled: boolean) => {
    setModules((prev) => {
      const next = { ...prev, [key]: enabled };
      localStorage.setItem("crm-modules", JSON.stringify(next));
      // Persist to server asynchronously
      const moduleSettings = MODULE_KEYS.map((k) => ({ module: k, enabled: next[k] }));
      updateWorkspaceSettings({ moduleSettings }).catch(() => { /* ignore */ });
      return next;
    });
  };

  return (
    <ModulesContext.Provider value={{ modules, setModule }}>
      {children}
    </ModulesContext.Provider>
  );
};

export const useModules = () => {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModules must be used within ModulesProvider");
  return ctx;
};
