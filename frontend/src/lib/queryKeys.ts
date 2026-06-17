/**
 * Centralized TanStack Query key factory.
 * All queries and invalidations must reference keys from here.
 * String-literal keys scattered across the codebase will drift; this file won't.
 */
export const queryKeys = {
  // ── Auth / Users ─────────────────────────────────────────────
  users: {
    all:    ["users"] as const,
    select: ["users-all"] as const,
    min:    ["users-min"] as const,
    detail: (id: string) => ["user", id] as const,
  },

  // ── CRM ──────────────────────────────────────────────────────
  customers: {
    all:       ["customers"] as const,
    select:    ["customers-all"] as const,
    detail:    (id: string) => ["customer", id] as const,
    deals:     (id: string) => ["customer-deals", id] as const,
    projects:  (id: string) => ["customer-projects", id] as const,
  },
  leads: {
    all:    ["leads"] as const,
    detail: (id: string) => ["lead", id] as const,
    report: ["leads-report"] as const,
  },
  deals: {
    all:    ["deals"] as const,
    allFlat: ["deals-all"] as const,
    detail: (id: string) => ["deals", id] as const,
  },
  activities: {
    forEntity: (linkedTo: string) => ["activities", linkedTo] as const,
  },

  // ── Tasks / Projects ─────────────────────────────────────────
  tasks: {
    all: ["tasks"] as const,
  },
  projects: {
    all:        ["projects"] as const,
    select:     ["projects-all"] as const,
    selectLite: ["projects-select"] as const,
    detail:     (id: string) => ["project", id] as const,
    milestones: (projectId: string) => ["milestones-select", projectId] as const,
  },

  // ── Finance ──────────────────────────────────────────────────
  invoices: {
    table:  ["invoices-gt"] as const,
    select: ["invoices-all"] as const,
    all:    (filter?: object) => filter ? ["invoices", filter] as const : ["invoices"] as const,
    detail: (id: string) => ["invoices", id] as const,
  },
  quotes: {
    table:  ["quotes-gt"] as const,
    all:    (filter?: object) => filter ? ["quotes", filter] as const : ["quotes"] as const,
    detail: (id: string) => ["quotes", id] as const,
  },
  payments: {
    all:   ["payments"] as const,
    table: ["payments-gt"] as const,
  },

  // ── Procurement ──────────────────────────────────────────────
  suppliers: {
    all:    ["suppliers"] as const,
    select: ["suppliers-all"] as const,
    detail: (id: string) => ["supplier", id] as const,
  },
  purchaseOrders: {
    all:    ["purchase-orders"] as const,
    detail: (id: string) => ["purchase-order", id] as const,
  },
  vendorBills: {
    all:    ["vendor-bills"] as const,
    detail: (id: string) => ["vendor-bill", id] as const,
    purchaseOrderSelect: ["pos-all"] as const,
  },
  vendorPayments: {
    all: ["vendor-payments"] as const,
  },

  // ── Sales Orders ─────────────────────────────────────────────
  salesOrders: {
    all:    ["sales-orders"] as const,
    detail: (id: string) => ["sales-order", id] as const,
  },

  // ── Products / Inventory ─────────────────────────────────────
  products: {
    all:    ["products"] as const,
    detail: (id: string) => ["product", id] as const,
  },
  inventory: {
    all: ["inventory"] as const,
  },
  warehouses: {
    all: ["warehouses"] as const,
  },
  inventoryValuation: (warehouseId?: string) => ["inventory-valuation", warehouseId ?? ""] as const,
  productCategories: { all: ["product-categories"] as const },

  // ── Expenses ─────────────────────────────────────────────────
  expenses: {
    all:    ["expenses"] as const,
    detail: (id: string) => ["expenses", id] as const,
  },

  // ── Misc ─────────────────────────────────────────────────────
  notes:     (linkedTo: string, model: string) => ["notes", linkedTo, model] as const,
  timeline:  (linkedTo: string, model: string) => ["timeline", linkedTo, model] as const,
  emails:    (linkedTo: string, model: string) => ["emails", linkedTo, model] as const,
  roles:     { all: ["roles"] as const },
  reports:   { leads: ["leads-report"] as const },
  savedViews:(module: string) => ["saved-views", module] as const,
  approvalSteps: (entityType: string, entityId: string) => ["approval-steps", entityType, entityId] as const,
  duplicates:(entity: string) => ["duplicates", entity] as const,
  importFields:(entity: string) => ["import-fields", entity] as const,
  accounts:  { all: ["accounts"] as const },
  costCenters: { all: ["cost-centers"] as const },

  // ── Accounting (GL) ──────────────────────────────────────────
  accounting: {
    chartOfAccounts: ["coa"] as const,
    chartAccount:    (id: string) => ["coa", id] as const,
    accountLedger:   (id: string, page?: number) => ["account-ledger", id, page ?? 1] as const,
    journal:         (filter?: object) => filter ? ["journal", filter] as const : ["journal"] as const,
    journalEntry:    (id: string) => ["journal-entry", id] as const,
    glConfig:        ["gl-config"] as const,
    trialBalance:    (asOf?: string) => asOf ? ["trial-balance", asOf] as const : ["trial-balance"] as const,
    profitLoss:      (start?: string, end?: string) => ["profit-loss", start ?? "", end ?? ""] as const,
    balanceSheet:    (asOf?: string) => ["balance-sheet", asOf ?? ""] as const,
    cashFlow:        (start?: string, end?: string) => ["cash-flow", start ?? "", end ?? ""] as const,
    periods:         ["accounting-periods"] as const,
  },
};
