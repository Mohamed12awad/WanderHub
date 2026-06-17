// Role-aware, user-configurable post-login landing route.
//
// Decision (see plan): no hardcoded role→route priority list. The user picks a
// preferred landing page; if unset (or no longer permitted) we fall back to the
// first page they can actually see. Dashboard is ungated, so it's the universal
// default — the preference is what makes this role-aware for finance/procurement/
// inventory users who'd rather land on their own queue.

interface UserLike {
  permissions?: string[];
  defaultLandingPage?: string | null;
}

export interface LandingOption {
  path: string;
  /** Permission gating this destination; null = always available. */
  permission: string | null;
  label: string;
}

export const LANDING_OPTIONS: LandingOption[] = [
  { path: "/dashboard", permission: null, label: "Dashboard" },
  { path: "/leads", permission: "leads:view", label: "Leads" },
  { path: "/customers", permission: "contacts:view", label: "Contacts" },
  { path: "/deals", permission: "deals:view", label: "Deals" },
  { path: "/pipeline", permission: "deals:view", label: "Pipeline" },
  { path: "/sales-orders", permission: "sales-orders:view", label: "Sales Orders" },
  { path: "/finance/quotes", permission: "quotes:view", label: "Quotes" },
  { path: "/finance/invoices", permission: "invoices:view", label: "Invoices" },
  { path: "/products", permission: "products:view", label: "Products" },
  { path: "/inventory", permission: "products:view", label: "Inventory" },
  { path: "/procurement/purchase-orders", permission: "purchase-orders:view", label: "Purchase Orders" },
  { path: "/procurement/bills", permission: "vendor-bills:view", label: "Vendor Bills" },
  { path: "/expenses", permission: "expenses:view", label: "Expenses" },
  { path: "/projects", permission: "projects:view", label: "Projects" },
  { path: "/tasks", permission: "tasks:view", label: "Tasks" },
  { path: "/reports", permission: "reports:view", label: "Reports" },
  { path: "/accounting/chart-of-accounts", permission: "accounting:view", label: "Accounting" },
];

/** Mirrors the backend PermissionGuard: "*" grants all, scoped grants satisfy the base. */
export function hasPermission(perms: string[], permission: string | null): boolean {
  if (!permission) return true;
  return perms.includes("*") || perms.some((p) => p === permission || p.startsWith(`${permission}:`));
}

export function resolveHomeRoute(user: UserLike | null | undefined): string {
  const perms = user?.permissions ?? [];
  // Honour the user's choice when they can still reach it.
  if (user?.defaultLandingPage) {
    const chosen = LANDING_OPTIONS.find((o) => o.path === user.defaultLandingPage);
    if (chosen && hasPermission(perms, chosen.permission)) return chosen.path;
  }
  // Otherwise, the first destination they're allowed to see.
  const first = LANDING_OPTIONS.find((o) => hasPermission(perms, o.permission));
  return first?.path ?? "/dashboard";
}

/** Options the given user is actually allowed to pick (for the settings dropdown). */
export function permittedLandingOptions(perms: string[]): LandingOption[] {
  return LANDING_OPTIONS.filter((o) => hasPermission(perms, o.permission));
}
