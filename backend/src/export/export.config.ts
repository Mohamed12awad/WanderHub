/**
 * Registry of entities that support full-dataset CSV export.
 *
 * Export is intentionally symmetric with the /import module: the same modules
 * are exportable, and the column set is a superset of the importable fields so a
 * user can round-trip data. Unlike the table-level "export" (which only dumped
 * the rows currently loaded in the browser), this streams EVERY non-deleted row
 * for the module straight from the database — see ExportService for the
 * cursor-based, memory-bounded streaming implementation.
 */

/** Extracts and stringifies one cell from a record. Must be null-safe. */
export type ExportValue = (row: Record<string, any>) => string | number | boolean | null | undefined;

export interface ExportColumn {
  header: string;
  value: ExportValue;
}

export interface ExportEntityConfig {
  /** `<base>:view` permission required to export this entity. */
  permission: string;
  /** Prisma delegate name (e.g. `customer`, `invoice`). */
  model: string;
  /**
   * Optional ownership scoping. When set, the export is filtered to the records
   * the user may see (own / team / all) exactly like the module's list endpoint.
   * Omit for shared catalog/finance models that aren't owner-scoped.
   */
  scope?: { base: string; ownerField: string };
  /** Whether the model has a `deletedAt` soft-delete column (default true). */
  softDelete?: boolean;
  /** Prisma `include` for related records referenced by columns. */
  include?: Record<string, unknown>;
  columns: ExportColumn[];
}

// ── Reusable cell helpers ─────────────────────────────────────────────────────
const date = (v: unknown): string => (v ? new Date(v as string).toISOString() : '');
const dec = (v: unknown): string => (v == null ? '' : String(v)); // Prisma.Decimal -> string
const rel = (obj: unknown, key: string): string =>
  obj && typeof obj === 'object' ? String((obj as Record<string, unknown>)[key] ?? '') : '';

export const EXPORT_ENTITIES: Record<string, ExportEntityConfig> = {
  customers: {
    permission: 'contacts:view',
    model: 'customer',
    scope: { base: 'contacts', ownerField: 'ownerId' },
    include: { owner: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Type', value: (r) => r.type },
      { header: 'Name', value: (r) => r.name },
      { header: 'First Name', value: (r) => r.firstName },
      { header: 'Last Name', value: (r) => r.lastName },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'Mobile', value: (r) => r.mobile },
      { header: 'Email', value: (r) => r.email },
      { header: 'Company Name', value: (r) => r.companyName ?? r.company },
      { header: 'Tax ID', value: (r) => r.taxId },
      { header: 'Job Title', value: (r) => r.jobTitle },
      { header: 'Website', value: (r) => r.website },
      { header: 'Location', value: (r) => r.location },
      { header: 'Status', value: (r) => r.status },
      { header: 'Source', value: (r) => r.source },
      { header: 'Owner', value: (r) => rel(r.owner, 'name') },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  leads: {
    permission: 'leads:view',
    model: 'lead',
    scope: { base: 'leads', ownerField: 'ownerId' },
    include: { owner: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Name', value: (r) => r.name },
      { header: 'Company', value: (r) => r.company },
      { header: 'Job Title', value: (r) => r.jobTitle },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'Email', value: (r) => r.email },
      { header: 'Mobile', value: (r) => r.mobile },
      { header: 'Website', value: (r) => r.website },
      { header: 'City', value: (r) => r.city },
      { header: 'Country', value: (r) => r.country },
      { header: 'Source', value: (r) => r.source },
      { header: 'Campaign', value: (r) => r.campaign },
      { header: 'Status', value: (r) => r.status },
      { header: 'Rating', value: (r) => r.rating },
      { header: 'Budget', value: (r) => r.budget },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Expected Close', value: (r) => date(r.expectedCloseDate) },
      { header: 'Owner', value: (r) => rel(r.owner, 'name') },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  deals: {
    permission: 'deals:view',
    model: 'deal',
    scope: { base: 'deals', ownerField: 'ownerId' },
    include: { customer: true, owner: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Title', value: (r) => r.title },
      { header: 'Customer', value: (r) => rel(r.customer, 'name') },
      { header: 'Category', value: (r) => r.category },
      { header: 'Deal Type', value: (r) => r.dealType },
      { header: 'Amount', value: (r) => dec(r.price) },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Status', value: (r) => r.status },
      { header: 'Priority', value: (r) => r.priority },
      { header: 'Probability', value: (r) => r.probability },
      { header: 'Source', value: (r) => r.source },
      { header: 'Expected Close', value: (r) => date(r.expectedCloseDate) },
      { header: 'Owner', value: (r) => rel(r.owner, 'name') },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  products: {
    permission: 'products:view',
    model: 'product',
    include: { category: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Name', value: (r) => r.name },
      { header: 'Type', value: (r) => r.type },
      { header: 'Capacity', value: (r) => r.capacity },
      { header: 'Location', value: (r) => r.location },
      { header: 'Tracks Inventory', value: (r) => r.tracksInventory },
      { header: 'Category', value: (r) => rel(r.category, 'name') },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  suppliers: {
    permission: 'suppliers:view',
    model: 'supplier',
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Name', value: (r) => r.name },
      { header: 'Email', value: (r) => r.email },
      { header: 'Phone', value: (r) => r.phone },
      { header: 'Tax ID', value: (r) => r.taxId },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Status', value: (r) => r.status },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  quotes: {
    permission: 'quotes:view',
    model: 'quote',
    include: { customer: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Quote Number', value: (r) => r.quoteNumber },
      { header: 'Title', value: (r) => r.title },
      { header: 'Customer', value: (r) => rel(r.customer, 'name') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Subtotal', value: (r) => dec(r.subtotal) },
      { header: 'Tax Rate', value: (r) => r.taxRate },
      { header: 'Tax', value: (r) => dec(r.tax) },
      { header: 'Total', value: (r) => dec(r.total) },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Valid Until', value: (r) => date(r.validUntil) },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  invoices: {
    permission: 'invoices:view',
    model: 'invoice',
    include: { customer: true, costCenter: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Invoice Number', value: (r) => r.invoiceNumber },
      { header: 'Title', value: (r) => r.title },
      { header: 'Customer', value: (r) => rel(r.customer, 'name') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Subtotal', value: (r) => dec(r.subtotal) },
      { header: 'Tax Rate', value: (r) => r.taxRate },
      { header: 'Tax Inclusive', value: (r) => r.taxInclusive },
      { header: 'Tax', value: (r) => dec(r.tax) },
      { header: 'Total', value: (r) => dec(r.total) },
      { header: 'Total Paid', value: (r) => dec(r.totalPaid) },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Cost Center', value: (r) => rel(r.costCenter, 'name') },
      { header: 'Issue Date', value: (r) => date(r.issueDate) },
      { header: 'Due Date', value: (r) => date(r.dueDate) },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  'sales-orders': {
    permission: 'sales-orders:view',
    model: 'salesOrder',
    include: { customer: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Order Number', value: (r) => r.orderNumber },
      { header: 'Title', value: (r) => r.title },
      { header: 'Customer', value: (r) => rel(r.customer, 'name') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Subtotal', value: (r) => dec(r.subtotal) },
      { header: 'Tax', value: (r) => dec(r.tax) },
      { header: 'Total', value: (r) => dec(r.total) },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Expected Date', value: (r) => date(r.expectedDate) },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  'purchase-orders': {
    permission: 'purchase-orders:view',
    model: 'purchaseOrder',
    include: { supplier: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'PO Number', value: (r) => r.poNumber },
      { header: 'Title', value: (r) => r.title },
      { header: 'Supplier', value: (r) => rel(r.supplier, 'name') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Subtotal', value: (r) => dec(r.subtotal) },
      { header: 'Tax', value: (r) => dec(r.tax) },
      { header: 'Total', value: (r) => dec(r.total) },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Expected Date', value: (r) => date(r.expectedDate) },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  'vendor-bills': {
    permission: 'vendor-bills:view',
    model: 'vendorBill',
    include: { supplier: true, costCenter: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Bill Number', value: (r) => r.billNumber },
      { header: 'Title', value: (r) => r.title },
      { header: 'Supplier', value: (r) => rel(r.supplier, 'name') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Subtotal', value: (r) => dec(r.subtotal) },
      { header: 'Tax', value: (r) => dec(r.tax) },
      { header: 'Total', value: (r) => dec(r.total) },
      { header: 'Total Paid', value: (r) => dec(r.totalPaid) },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Cost Center', value: (r) => rel(r.costCenter, 'name') },
      { header: 'Issue Date', value: (r) => date(r.issueDate) },
      { header: 'Due Date', value: (r) => date(r.dueDate) },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  expenses: {
    permission: 'expenses:view',
    model: 'expenseReport',
    include: { user: true, project: true, costCenter: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Title', value: (r) => r.title },
      { header: 'User', value: (r) => rel(r.user, 'name') },
      { header: 'Project', value: (r) => rel(r.project, 'name') },
      { header: 'Approval Status', value: (r) => r.approvalStatus },
      { header: 'Cost Center', value: (r) => rel(r.costCenter, 'name') },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  projects: {
    permission: 'projects:view',
    model: 'project',
    include: { customer: true, manager: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Name', value: (r) => r.name },
      { header: 'Status', value: (r) => r.status },
      { header: 'Priority', value: (r) => r.priority },
      { header: 'Budget', value: (r) => r.budget },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Start Date', value: (r) => date(r.startDate) },
      { header: 'End Date', value: (r) => date(r.endDate) },
      { header: 'Customer', value: (r) => rel(r.customer, 'name') },
      { header: 'Manager', value: (r) => rel(r.manager, 'name') },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  tasks: {
    permission: 'tasks:view',
    model: 'task',
    include: { assignedTo: true, project: true },
    columns: [
      { header: 'ID', value: (r) => r.id },
      { header: 'Title', value: (r) => r.title },
      { header: 'Status', value: (r) => r.status },
      { header: 'Priority', value: (r) => r.priority },
      { header: 'Due Date', value: (r) => date(r.dueDate) },
      { header: 'Assigned To', value: (r) => rel(r.assignedTo, 'name') },
      { header: 'Project', value: (r) => rel(r.project, 'name') },
      { header: 'Estimated Cost', value: (r) => dec(r.estimatedCost) },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
  // Chart of Accounts — full COA export (parent referenced by code so the file is
  // re-importable into a fresh workspace).
  'chart-of-accounts': {
    permission: 'accounting:view',
    model: 'chartOfAccount',
    include: { parent: true },
    columns: [
      { header: 'Code', value: (r) => r.code },
      { header: 'Name', value: (r) => r.name },
      { header: 'Type', value: (r) => r.type },
      { header: 'Normal Balance', value: (r) => r.normalBalance },
      { header: 'Parent Code', value: (r) => rel(r.parent, 'code') },
      { header: 'Currency', value: (r) => r.currency },
      { header: 'Active', value: (r) => r.isActive },
      { header: 'Created At', value: (r) => date(r.createdAt) },
    ],
  },
};

export type ExportEntity = keyof typeof EXPORT_ENTITIES;
