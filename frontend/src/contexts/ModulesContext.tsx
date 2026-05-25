import React, { createContext, useContext, useState, ReactNode } from "react";

export const MODULE_KEYS = [
  "customers", "deals", "pipeline", "calendar", "tasks", "products", "expenses", "finance", "reports",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
type ModulesState = Record<ModuleKey, boolean>;

const DEFAULT: ModulesState = {
  customers: true, deals: true, pipeline: true, calendar: true,
  tasks: true, products: true, expenses: true, finance: true, reports: true,
};

interface ModulesContextProps {
  modules: ModulesState;
  setModule: (key: ModuleKey, enabled: boolean) => void;
}

const ModulesContext = createContext<ModulesContextProps | undefined>(undefined);

export const ModulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<ModulesState>(() => {
    try {
      const s = localStorage.getItem("crm-modules");
      return s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  const setModule = (key: ModuleKey, enabled: boolean) => {
    setModules((prev) => {
      const next = { ...prev, [key]: enabled };
      localStorage.setItem("crm-modules", JSON.stringify(next));
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
