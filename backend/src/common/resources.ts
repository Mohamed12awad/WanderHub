/**
 * The canonical permission-resource vocabulary.
 *
 * This is the SINGLE source of truth for the `<resource>` half of a permission
 * string (`<resource>:<action>[:<scope>]`). It must stay in sync with
 * `frontend/src/config/permissions.ts` — that file drives the Roles admin UI,
 * so a resource missing there cannot be granted to anyone, and a resource named
 * differently here silently never matches a user's permissions.
 *
 * Why this file exists: services previously passed ad-hoc names such as
 * `finance`, `sales` and `procurement` to `VisibilityService.ownershipWhere()`.
 * No such permission can exist, so scope resolution never matched and — because
 * it used to default to `all` — record-level filtering silently did nothing on
 * invoices, quotes, sales orders, purchase orders and vendor bills. Typing the
 * resource argument as `Resource` makes that class of drift a compile error.
 */
export const RESOURCES = [
  'contacts',
  'leads',
  'deals',
  'products',
  'expenses',
  'tasks',
  'quotes',
  'invoices',
  'sales-orders',
  'purchase-orders',
  'vendor-bills',
  'suppliers',
  'projects',
  'warehouses',
  'product-categories',
  'activities',
  'reports',
  'users',
  'roles',
  'settings',
  'accounting',
  'logs',
  'emails',
  'notes',
] as const;

export type Resource = (typeof RESOURCES)[number];

const RESOURCE_SET: ReadonlySet<string> = new Set(RESOURCES);

/** Narrowing guard for values that arrive as plain strings (config-driven callers). */
export function isResource(value: string): value is Resource {
  return RESOURCE_SET.has(value);
}
