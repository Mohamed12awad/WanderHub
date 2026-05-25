export const PERMISSION_REGISTRY = {
  contacts: ["view", "create", "edit", "delete", "export"],
  deals:    ["view", "create", "edit", "delete", "export"],
  products: ["view", "create", "edit", "delete"],
  expenses: ["view", "create", "edit", "delete", "approve"],
  tasks:    ["view", "create", "edit", "delete"],
  finance:  ["view", "create", "edit", "delete", "approve"],
  reports:  ["view", "export"],
  users:    ["view", "create", "edit", "delete"],
  roles:    ["view", "manage"],
  settings: ["view", "manage"],
  logs:     ["view"],
} as const;

export type Resource = keyof typeof PERMISSION_REGISTRY;
export type Permission = `${Resource}:${string}`;
