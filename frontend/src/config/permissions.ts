export const PERMISSION_REGISTRY = {
  contacts: ["view", "create", "edit", "delete", "export"],
  deals:    ["view", "create", "edit", "delete", "export"],
  products: ["view", "create", "edit", "delete"],
  expenses: ["view", "create", "edit", "delete", "approve"],
  tasks:    ["view", "create", "edit", "delete"],
  quotes:   ["view", "create", "edit", "delete", "approve"],
  invoices: ["view", "create", "edit", "delete", "approve"],
  "sales-orders": ["view", "create", "edit", "delete", "approve"],
  reports:  ["view", "export"],
  users:    ["view", "create", "edit", "delete"],
  roles:    ["view", "manage"],
  settings: ["view", "manage"],
  logs:     ["view"],
  suppliers: ["view", "create", "edit", "delete"],
  "purchase-orders": ["view", "create", "edit", "delete", "approve"],
  "vendor-bills": ["view", "create", "edit", "delete", "approve"],
  projects: ["view", "create", "edit", "delete"],
} as const;

export type Resource = keyof typeof PERMISSION_REGISTRY;
export type Permission = `${Resource}:${string}`;

export const ALL_ACTIONS = ["view", "create", "edit", "delete", "export", "approve", "manage"] as const;
