/**
 * The grantable permission matrix — this drives the Roles admin UI, so a
 * resource missing here cannot be granted to anyone.
 *
 * MUST stay in sync with `backend/src/common/resources.ts` (`RESOURCES`). The
 * backend enforces `<resource>:<action>` via `@RequirePermission` and resolves
 * record-level scope from `<resource>:view:own|team|all`; a name that exists in
 * one place and not the other is silently unenforceable or ungrantable.
 */
export const PERMISSION_REGISTRY = {
  contacts: ["view", "create", "edit", "delete", "export"],
  leads:    ["view", "create", "edit", "delete", "export"],
  deals:    ["view", "create", "edit", "delete", "export"],
  products: ["view", "create", "edit", "delete"],
  expenses: ["view", "create", "edit", "delete", "approve"],
  tasks:    ["view", "create", "edit", "delete"],
  activities: ["view", "create", "edit", "delete"],
  notes:    ["view", "create", "edit", "delete"],
  emails:   ["view", "send"],
  quotes:   ["view", "create", "edit", "delete", "approve"],
  invoices: ["view", "create", "edit", "delete", "approve"],
  "sales-orders": ["view", "create", "edit", "delete", "approve"],
  reports:  ["view", "export"],
  users:    ["view", "create", "edit", "delete"],
  roles:    ["view", "manage"],
  settings: ["view", "manage"],
  accounting: ["view", "manage"],
  logs:     ["view"],
  suppliers: ["view", "create", "edit", "delete"],
  "purchase-orders": ["view", "create", "edit", "delete", "approve"],
  "vendor-bills": ["view", "create", "edit", "delete", "approve"],
  warehouses: ["view", "manage"],
  "product-categories": ["view", "manage"],
  projects: ["view", "create", "edit", "delete"],
} as const;

export type Resource = keyof typeof PERMISSION_REGISTRY;
export type Permission = `${Resource}:${string}`;

export const ALL_ACTIONS = ["view", "create", "edit", "delete", "export", "approve", "manage", "send"] as const;
