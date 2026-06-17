// src/utils/api.js
import axios from "axios";
import {
  DealData,
  Customer,
  ExpenseReportData,
  ReportParams,
  Product,
  UserData,
  ActivityFormData,
  TaskFormData,
  QuoteFormData,
  InvoiceFormData,
  CostCenter,
} from "@/types/types";

import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // Send the httpOnly refresh cookie on requests that need it (refresh/logout).
  withCredentials: true,
});
// Add a request interceptor to include the in-memory access token in headers.
api.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Single-flight refresh: many requests may 401 at once, but only one refresh
// call should run; the rest await its result.
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    // Bare axios (no interceptors) so a 401 here can't recurse. The refresh
    // token is read from the httpOnly cookie, so no body is sent.
    const resp = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const { token, user } = resp.data;
    setAccessToken(token);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    return token;
  } catch {
    return null;
  }
}

// Single-flight: refresh tokens are single-use and rotate on every call, so two
// concurrent /refresh requests would make the second present an already-revoked
// token and fail (logging the user out). This collapses all overlapping callers
// — the response interceptor, multiple 401s, and React StrictMode's double-
// invoked auth effect — onto one in-flight rotation.
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function clearSessionAndRedirect() {
  localStorage.removeItem("user");
  clearAccessToken();
  window.location.href = "/login";
}

// Response interceptor: on a 401, transparently try to refresh the short-lived
// access token once and replay the original request; if refresh fails, end the
// session.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // NestJS class-validator returns `message` as a string[]; collapse it to a
    // single readable string so call sites can render it directly in a toast.
    const data = error.response?.data;
    if (data && Array.isArray(data.message)) {
      data.message = data.message.join(", ");
    }

    const original = error.config as (typeof error.config & { _retry?: boolean });
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers["Authorization"] = `Bearer ${newToken}`;
        return api(original);
      }
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

// Global search
export const globalSearch = (q: string) =>
  api.get("/search", { params: { q } });

// ── Bulk CSV import ─────────────────────────────────────────────────────────────
export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "enum" | "date";
  enumValues?: string[];
  hint?: string;
};
export type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
};
export const getImportFields = (entity: string) =>
  api.get<{ entity: string; fields: ImportField[] }>(`/import/${entity}/fields`);
export const importRecords = (
  entity: string,
  payload: { mapping: Record<string, string>; rows: Record<string, string>[] },
) => api.post<ImportResult>(`/import/${entity}`, payload);

// ── Export ──────────────────────────────────────────────────────────────────────
// Streams the full module dataset as CSV. Fetched as a blob (not a plain link) so
// the in-memory Bearer token is sent; the caller saves it via saveBlob().
export const exportEntity = (entity: string) =>
  api.get<Blob>(`/export/${entity}`, { responseType: "blob" });

// ── Dedup + merge ───────────────────────────────────────────────────────────────
export type DuplicateGroup = {
  field: "phone" | "email";
  value: string;
  records: { id: string; name: string; email: string | null; phone: string | null; createdAt: string }[];
};
export const getDuplicates = (entity: string) =>
  api.get<DuplicateGroup[]>(`/dedup/${entity}/duplicates`);
export const mergeRecords = (entity: string, surviveId: string, mergeIds: string[]) =>
  api.post<{ surviveId: string; merged: number }>(`/dedup/${entity}/merge`, { surviveId, mergeIds });

// ── Bulk actions ────────────────────────────────────────────────────────────────
export type BulkResult = { updated: number; failed: { id: string; message: string }[] };
export const bulkAction = (
  entity: string,
  payload: { ids: string[]; action: "delete" | "assignOwner" | "setStatus"; value?: string },
) => api.post<BulkResult>(`/bulk/${entity}`, payload);

// ── Saved views ─────────────────────────────────────────────────────────────────
export type SavedView = { id: string; module: string; name: string; query: string; createdAt: string };
export const getSavedViews = (module: string) =>
  api.get<SavedView[]>("/saved-views", { params: { module } });
export const createSavedView = (data: { module: string; name: string; query: string }) =>
  api.post<SavedView>("/saved-views", data);
export const deleteSavedView = (id: string): Promise<void> => api.delete(`/saved-views/${id}`);

// ── API keys ────────────────────────────────────────────────────────────────────
export type ApiKeyRow = {
  id: string; name: string; prefix: string;
  lastUsedAt: string | null; revokedAt: string | null; createdAt: string;
  user: { id: string; name: string };
};
export const getApiKeys = () => api.get<ApiKeyRow[]>("/api-keys");
export const createApiKey = (data: { name: string; userId?: string }) =>
  api.post<{ id: string; name: string; prefix: string; key: string; createdAt: string }>("/api-keys", data);
export const revokeApiKey = (id: string): Promise<void> => api.delete(`/api-keys/${id}`);

// ── Email tracking ──────────────────────────────────────────────────────────────
export type TrackedEmail = {
  id: string; to: string; subject: string;
  status: string; deliveryStatus?: string;
  openCount: number; openedAt: string | null;
  clickCount: number; clickedAt: string | null;
  createdAt: string;
};
export const sendEmail = (data: { to: string; subject: string; body: string; linkedToId?: string; linkedModel?: string }) =>
  api.post<TrackedEmail>("/emails", data);
export const getEmails = (linkedToId: string, linkedModel: string) =>
  api.get<TrackedEmail[]>("/emails", { params: { linkedToId, linkedModel } });

// ── AI assistant ────────────────────────────────────────────────────────────────
export type AiProviderName = "anthropic" | "google" | "openai";
export type AiConfig = {
  provider: AiProviderName;
  model: string;
  enabled: boolean;
  workspaceProviders: AiProviderName[];
  userProviders: AiProviderName[];
  defaultModels: Record<AiProviderName, string>;
};
export const getAiConfig = () => api.get<AiConfig>("/ai/config");
export const setAiConfig = (data: { provider?: string; model?: string; enabled?: boolean }) =>
  api.put<AiConfig>("/ai/config", data);
export const setAiKey = (provider: string, key: string, scope: "workspace" | "user" = "workspace") =>
  api.put(`/ai/keys/${provider}`, { key, scope });
export const removeAiKey = (provider: string, scope: "workspace" | "user" = "workspace"): Promise<void> =>
  api.delete(`/ai/keys/${provider}`, { params: { scope } });
export const aiSummarize = (entity: string, id: string) =>
  api.post<{ provider: string; model: string; summary: string }>("/ai/summarize", { entity, id });
export const aiScore = (entity: string, id: string) =>
  api.post<{ provider: string; model: string; score: number | null; rating: string | null; rationale: string; raw: string }>("/ai/score", { entity, id });

// Deals API Requests
export const getDeals = (params?: { page?: number; limit?: number; q?: string; [key: string]: unknown }) =>
  api.get("/deals", { params });
export const getDealById = (id: string) =>
  api.get(`/deals/${id}?includePayments=true`);
export const createDeal = (data: DealData) => api.post("/deals", data);
export const updateDeal = (id: string, data: DealData) =>
  api.put(`/deals/${id}`, data);
export const deleteDeal = (id: string): Promise<void> =>
  api.delete(`/deals/${id}`);
// Roles API Requests
export const getRoles = () => api.get("/roles");

// User API Requests
export const getUsers = (params?: Record<string, string | number | undefined>) =>
  api.get("/users", { params });
export const getUserById = (id: string) => api.get(`/users/${id}`);
export const createUser = (data: UserData) => api.post("/users", data);
export const updateUser = (userId: string, data: UserData) =>
  api.put(`/users/${userId}`, data);
export const deleteUser = (userId: string): Promise<void> =>
  api.delete(`/users/${userId}`);
export const toggleUserState = (id: string) => api.patch(`/users/${id}/toggle-active`);

// User API Requests
export const getCustomers = (params?: { page?: number; limit?: number; q?: string; [key: string]: unknown }) =>
  api.get("/customers", { params });
export const getCustomerById = (id: string) => api.get(`/customers/${id}`);
export const createCustomer = (data: Customer) => api.post("/customers", data);
export const deleteCustomer = (customerId: string): Promise<void> =>
  api.delete(`/customers/${customerId}`);
export const updateCustomer = (customerId: string, data: Customer) =>
  api.put(`/customers/${customerId}`, data);

// Products API Requests
export const getProducts = (params?: Record<string, string | number | undefined>) =>
  api.get("/products", { params });
export const getProductById = (id: string) => api.get(`/products/${id}`);
export const createProduct = (data: Product) => api.post("/products", data);
export const updateProduct = (id: string, data: Product) =>
  api.put(`/products/${id}`, data);
export const deleteProduct = (id: string): Promise<void> =>
  api.delete(`/products/${id}`);

// Summary API Requests
export const getSummary = (period?: string, range?: { startDate?: string; endDate?: string }) =>
  api.get("/summary", { params: { timePeriod: period, ...range } });

export const getPendingApprovals = () => api.get("/summary/pending-approvals");
export const getLeadsReport = (params?: ReportFilters) => api.get("/reports/leads", { params });

// Reports API Requests
export const getReport = (params: ReportParams) =>
  api.get("/reports", { params });
export const getBookingReport = (params: ReportParams) =>
  api.get("/reports/bookings", { params });

// // Expenses API Requests
export const getExpenses = (params?: { page?: number; limit?: number; q?: string; [key: string]: unknown }) =>
  api.get("/expenses", { params });
export const getExpenseById = (id: string) => api.get(`/expenses/${id}`);
export const createExpense = (data: ExpenseReportData) =>
  api.post("/expenses", data);
export const updateExpense = (id: string, data: ExpenseReportData) =>
  api.put(`/expenses/${id}`, data);
export const deleteExpense = (id: string): Promise<void> =>
  api.delete(`/expenses/${id}`);
export const approveExpense = (id: string, state: boolean) =>
  api.patch(`/expenses/${id}/approve`, { approved: state });
export const approveExpenseReport = (id: string) => api.patch(`/expenses/${id}/approve`);
export const rejectExpenseReport = (id: string, reason: string) => api.patch(`/expenses/${id}/reject`, { reason });
// export const updateExpenseReportItem = (id: string, expenseId: string, data) =>
//   api.put(`/expenses/${id}/expense/${expenseId}`, data);
export const deleteExpenseReportItem = (
  id: string,
  expenseId: string
): Promise<void> => api.delete(`/expenses/${id}/expense/${expenseId}`);

// Activities API Requests
export const getActivities = (linkedTo: string, linkedModel: "Customer" | "Deal" | "Lead" | "Project" | "Supplier" | "PurchaseOrder" | "Invoice" | "Quote" | "SalesOrder") =>
  api.get("/activities", { params: { linkedTo, linkedModel } });
export const getAllActivities = (params?: Record<string, string | number | undefined>) =>
  api.get("/activities", { params });
export const createActivity = (data: ActivityFormData) =>
  api.post("/activities", data);
export const updateActivity = (id: string, data: Partial<ActivityFormData>) =>
  api.put(`/activities/${id}`, data);
export const deleteActivity = (id: string): Promise<void> =>
  api.delete(`/activities/${id}`);

// Roles API Requests
export const createRole = (data: { name: string; permissions: string[] }) =>
  api.post("/roles", data);
export const updateRole = (id: string, permissions: string[]) =>
  api.put(`/roles/${id}`, { permissions });
export const deleteRole = (id: string): Promise<void> =>
  api.delete(`/roles/${id}`);

// Logs API Requests
export const getLogs = (params?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  actionType?: string;
  user?: string;
  page?: number;
  limit?: number;
}) => api.get("/logs", { params });

// Notes API Requests
export const getNotes = (params: { linkedTo: string; linkedModel: string }) =>
  api.get("/notes", { params });
export const createNote = (data: { content: string; linkedTo: string; linkedModel: string }) =>
  api.post("/notes", data);
export const updateNote = (id: string, content: string) =>
  api.put(`/notes/${id}`, { content });
export const deleteNote = (id: string): Promise<void> => api.delete(`/notes/${id}`);

// Timeline API Requests
export const getTimeline = (params: {
  linkedTo: string;
  linkedModel: string;
}) => api.get("/timeline", { params });

// Tasks API Requests
export const getTasks = (params?: {
  status?: string;
  priority?: string;
  assignedTo?: string;
  linkedTo?: string;
  overdue?: string;
  mine?: string;
  projectId?: string;
  q?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}) => api.get("/tasks", { params });
export const getTaskSummary = () => api.get("/tasks/summary");
export const getTaskById = (id: string) => api.get(`/tasks/${id}`);
export const createTask = (data: TaskFormData) => api.post("/tasks", data);
export const updateTask = (id: string, data: Partial<TaskFormData>) =>
  api.put(`/tasks/${id}`, data);
export const deleteTask = (id: string): Promise<void> => api.delete(`/tasks/${id}`);
export const completeTask = (id: string) => api.patch(`/tasks/${id}/complete`);

// Finance — Quotes
export const getQuotes = (params?: { status?: string; customer?: string; deal?: string }) =>
  api.get("/finance/quotes", { params });
export const getQuoteById = (id: string) => api.get(`/finance/quotes/${id}`);
export const createQuote = (data: QuoteFormData) => api.post("/finance/quotes", data);
export const updateQuote = (id: string, data: Partial<QuoteFormData>) =>
  api.put(`/finance/quotes/${id}`, data);
export const deleteQuote = (id: string): Promise<void> => api.delete(`/finance/quotes/${id}`);
export const approveQuote = (id: string) => api.patch(`/finance/quotes/${id}/approve`);
export const rejectQuote = (id: string, reason: string) => api.patch(`/finance/quotes/${id}/reject`, { reason });
export const convertQuoteToInvoice = (id: string) =>
  api.post(`/finance/quotes/${id}/convert`);
export const convertQuoteToSalesOrder = (id: string) =>
  api.post(`/finance/quotes/${id}/convert-to-sales-order`);

// ── Sales Orders ────────────────────────────────────────────────────────────────
export const getSalesOrders = (params?: { page?: number; limit?: number; status?: string; q?: string; [key: string]: unknown }) =>
  api.get("/sales-orders", { params });
export const getSalesOrderById = (id: string) => api.get(`/sales-orders/${id}`);
export const createSalesOrder = (data: any) => api.post("/sales-orders", data);
export const updateSalesOrder = (id: string, data: any) => api.put(`/sales-orders/${id}`, data);
export const deleteSalesOrder = (id: string): Promise<void> => api.delete(`/sales-orders/${id}`);
export const updateSalesOrderStatus = (id: string, status: string) =>
  api.patch(`/sales-orders/${id}/status`, { status });
export const approveSalesOrder = (id: string) => api.patch(`/sales-orders/${id}/approve`);
export const rejectSalesOrder = (id: string, reason: string) =>
  api.patch(`/sales-orders/${id}/reject`, { reason });
export const createInvoiceFromSalesOrder = (id: string) =>
  api.post(`/sales-orders/${id}/create-invoice`);
// Read-only: PO prefill data for SO line items short on stock (creates nothing).
export const getSalesOrderPurchaseOrderPrefill = (id: string) =>
  api.get(`/sales-orders/${id}/purchase-order-prefill`);

// Finance — Invoices
export const getInvoices = (params?: { status?: string; customer?: string; deal?: string }) =>
  api.get("/finance/invoices", { params });
export const getInvoiceById = (id: string) => api.get(`/finance/invoices/${id}`);
export const createInvoice = (data: InvoiceFormData) => api.post("/finance/invoices", data);
export const updateInvoice = (id: string, data: Partial<InvoiceFormData>) =>
  api.put(`/finance/invoices/${id}`, data);
export const deleteInvoice = (id: string): Promise<void> => api.delete(`/finance/invoices/${id}`);
export const approveInvoice = (id: string) => api.patch(`/finance/invoices/${id}/approve`);
export const rejectInvoice = (id: string, reason: string) => api.patch(`/finance/invoices/${id}/reject`, { reason });
export const sendInvoice   = (id: string) => api.patch(`/finance/invoices/${id}/send`);
export const recordInvoicePayment = (
  invoiceId: string,
  data: { amount: number; currency: string; date: string; method: string; reference?: string; notes?: string }
) => api.post(`/finance/invoices/${invoiceId}/payments`, data);
export const deleteInvoicePayment = (invoiceId: string, paymentId: string): Promise<void> =>
  api.delete(`/finance/invoices/${invoiceId}/payments/${paymentId}`);
export const editInvoicePayment = (
  invoiceId: string,
  paymentId: string,
  data: { amount?: number; currency?: string; date?: string; method?: string; reference?: string; notes?: string; accountId?: string }
) => api.patch(`/finance/invoices/${invoiceId}/payments/${paymentId}`, data);

// Accounts API Requests
export const getAccounts = () => api.get("/accounts");
export const createAccount = (data: { name: string; type: string; currency: string; balance?: number; notes?: string; chartOfAccountId?: string }) =>
  api.post("/accounts", data);
export const updateAccount = (id: string, data: { name?: string; type?: string; currency?: string; balance?: number; notes?: string; chartOfAccountId?: string }) =>
  api.patch(`/accounts/${id}`, data);
export const deleteAccount = (id: string): Promise<void> => api.delete(`/accounts/${id}`);
export const getAccountStatement = (id: string, params?: { page?: number; limit?: number }) =>
  api.get(`/accounts/${id}/statement`, { params });

// Reports — Analytics
// Unified filter set shared by every analytics endpoint (see backend
// report-utils.parseReportParams). All fields optional.
export type ReportFilters = {
  startDate?: string;
  endDate?: string;
  groupBy?: "month" | "quarter" | "year";
  ownerId?: string;
  status?: string;
  currency?: string;
};

export const getRevenueReport = (params?: ReportFilters) =>
  api.get("/reports/revenue", { params });
export const getPipelineReport = (params?: ReportFilters) =>
  api.get("/reports/pipeline", { params });
export const getExpensesCategoryReport = (params?: ReportFilters) =>
  api.get("/reports/expenses-category", { params });
export const getOutstandingReport = (params?: ReportFilters) =>
  api.get("/reports/outstanding", { params });
export const getCustomerAcquisitionReport = (params?: ReportFilters) =>
  api.get("/reports/customer-acquisition", { params });

// New analytics — Sales
export const getSalesLeaderboard = (params?: ReportFilters) =>
  api.get("/reports/sales-leaderboard", { params });
export const getConversionFunnel = (params?: ReportFilters) =>
  api.get("/reports/conversion-funnel", { params });
export const getDealMetrics = (params?: ReportFilters) =>
  api.get("/reports/deal-metrics", { params });

// New analytics — Finance
export const getProfitLoss = (params?: ReportFilters) =>
  api.get("/reports/profit-loss", { params });
export const getArAging = (params?: ReportFilters) =>
  api.get("/reports/ar-aging", { params });
export const getTopCustomers = (params?: ReportFilters) =>
  api.get("/reports/top-customers", { params });
export const getExpenseTrend = (params?: ReportFilters) =>
  api.get("/reports/expense-trend", { params });

// New analytics — Operations
export const getTopProducts = (params?: ReportFilters) =>
  api.get("/reports/top-products", { params });
export const receivePurchaseOrder = (id: string, warehouseId?: string) =>
  api.post(`/procurement/purchase-orders/${id}/receive`, warehouseId ? { warehouseId } : {});
export const getInventoryValuation = () => api.get("/reports/inventory-valuation");
export const getTaskStats = (params?: ReportFilters) =>
  api.get("/reports/task-stats", { params });

// Finance — Payments
export const getPayments = (params?: { page?: number; limit?: number }) =>
  api.get("/finance/payments", { params });

// Deals — create quote from deal
export const createQuoteFromDeal = (dealId: string) =>
  api.post(`/deals/${dealId}/create-quote`);

// Settings API Requests
export const getApprovalSettings = () => api.get("/settings/approvals");
export const updateApprovalSettings = (approvals: { module: string; approverRoles: string[]; enabled: boolean }[]) =>
  api.put("/settings/approvals", { approvals });

export const getWorkspaceSettings = () => api.get("/settings/workspace");
export const updateWorkspaceSettings = (data: {
  fieldGroups?: {
    module: string;
    fields: {
      id: string;
      name: string;
      label: string;
      type: string;
      required: boolean;
      hidden?: boolean;
      options?: string;
      isSystem?: boolean;
      filterable?: boolean;
      order?: number;
      section?: string;
      multiselect?: boolean;
      defaultValue?: string;
      helpText?: string;
      placeholder?: string;
      min?: number;
      max?: number;
      pattern?: string;
      maxLength?: number;
    }[];
    sections?: { id: string; label: string; order?: number }[];
  }[];
  moduleSettings?: { module: string; enabled: boolean }[];
  pipelineStages?: unknown[];
}) => api.put("/settings/workspace", data);

export const getOrgSettings = () => api.get("/settings/organization");
export const updateOrgSettings = (data: { baseCurrency?: string; locale?: string }) =>
  api.put("/settings/organization", data);

export const updateLandingPage = (defaultLandingPage: string | null) =>
  api.put("/users/me/landing-page", { defaultLandingPage });
export const markOnboarded = () => api.put("/users/me/onboarded", {});

// Leads
export const getLeads = (params?: { page?: number; limit?: number; q?: string; [key: string]: unknown }) =>
  api.get("/leads", { params });
export const getLeadById = (id: string) => api.get(`/leads/${id}`);
export const createLead = (data: Record<string, unknown>) => api.post("/leads", data);
export const updateLead = (id: string, data: Record<string, unknown>) => api.put(`/leads/${id}`, data);
export const deleteLead = (id: string): Promise<void> => api.delete(`/leads/${id}`);
export const convertLead = (id: string, data?: { createDeal?: boolean }) =>
  api.post(`/leads/${id}/convert`, data ?? {});

// Leads report
export const getLeadsFunnelReport = () => api.get("/reports/leads");

// Notifications
export const getNotifications = (params?: { unread?: boolean; page?: number }) =>
  api.get("/notifications", { params });
export const getUnreadCount = () => api.get("/notifications/unread-count");
export const markNotificationRead = (id: string) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put("/notifications/read-all");
export const deleteNotification = (id: string): Promise<void> => api.delete(`/notifications/${id}`);

// ── Procurement ───────────────────────────────────────────────────────────────

export const getSuppliers = (params?: { page?: number; limit?: number; q?: string }) =>
  api.get("/procurement/suppliers", { params });
export const getSupplierById = (id: string) => api.get(`/procurement/suppliers/${id}`);
export const createSupplier = (data: any) => api.post("/procurement/suppliers", data);
export const updateSupplier = (id: string, data: any) =>
  api.put(`/procurement/suppliers/${id}`, data);
export const deleteSupplier = (id: string): Promise<void> =>
  api.delete(`/procurement/suppliers/${id}`);

export const getPurchaseOrders = (params?: { page?: number; limit?: number; status?: string; q?: string; sort?: string; dir?: string; [key: string]: unknown }) =>
  api.get("/procurement/purchase-orders", { params });
export const getPurchaseOrderById = (id: string) => api.get(`/procurement/purchase-orders/${id}`);
export const createPurchaseOrder = (data: any) => api.post("/procurement/purchase-orders", data);
export const updatePurchaseOrder = (id: string, data: any) =>
  api.put(`/procurement/purchase-orders/${id}`, data);
export const deletePurchaseOrder = (id: string): Promise<void> =>
  api.delete(`/procurement/purchase-orders/${id}`);
export const updatePurchaseOrderStatus = (id: string, status: string) =>
  api.patch(`/procurement/purchase-orders/${id}/status`, { status });
export const approvePurchaseOrder = (id: string) => api.patch(`/procurement/purchase-orders/${id}/approve`);
export const createBillFromPO = (id: string) => api.post(`/procurement/purchase-orders/${id}/create-bill`);
export const rejectPurchaseOrder = (id: string, reason: string) =>
  api.patch(`/procurement/purchase-orders/${id}/reject`, { reason });

export const getVendorBills = (params?: { page?: number; limit?: number; status?: string; q?: string; [key: string]: unknown }) =>
  api.get("/procurement/vendor-bills", { params });
export const getVendorBillById = (id: string) => api.get(`/procurement/vendor-bills/${id}`);
export const createVendorBill = (data: any) => api.post("/procurement/vendor-bills", data);
export const updateVendorBill = (id: string, data: any) =>
  api.put(`/procurement/vendor-bills/${id}`, data);
export const deleteVendorBill = (id: string): Promise<void> =>
  api.delete(`/procurement/vendor-bills/${id}`);
export const approveVendorBill = (id: string) => api.patch(`/procurement/vendor-bills/${id}/approve`);
export const rejectVendorBill = (id: string, reason: string) =>
  api.patch(`/procurement/vendor-bills/${id}/reject`, { reason });
export const recordVendorBillPayment = (id: string, data: any) =>
  api.post(`/procurement/vendor-bills/${id}/payments`, data);
export const deleteVendorBillPayment = (billId: string, paymentId: string): Promise<void> =>
  api.delete(`/procurement/vendor-bills/${billId}/payments/${paymentId}`);
export const getVendorPayments = (params?: { page?: number; limit?: number; method?: string; currency?: string; date_from?: string; date_to?: string; amount_min?: number; amount_max?: number }) =>
  api.get("/procurement/vendor-bills/vendor-payments", { params });

// ── Projects ──────────────────────────────────────────────────────────────────

export const getProjects = (params?: { page?: number; limit?: number; status?: string; q?: string; [key: string]: unknown }) =>
  api.get("/projects", { params });
export const getProjectById = (id: string) => api.get(`/projects/${id}`);
export const createProject = (data: any) => api.post("/projects", data);
export const updateProject = (id: string, data: any) =>
  api.put(`/projects/${id}`, data);
export const deleteProject = (id: string): Promise<void> =>
  api.delete(`/projects/${id}`);

export const getProjectFinancials = (id: string) => api.get(`/projects/${id}/finance`);

export const getProjectMilestones = (id: string) => api.get(`/projects/${id}/milestones`);
export const createProjectMilestone = (projectId: string, data: any) =>
  api.post(`/projects/${projectId}/milestones`, data);
export const updateProjectMilestone = (projectId: string, milestoneId: string, data: any) =>
  api.patch(`/projects/${projectId}/milestones/${milestoneId}`, data);
export const deleteProjectMilestone = (projectId: string, milestoneId: string): Promise<void> =>
  api.delete(`/projects/${projectId}/milestones/${milestoneId}`);

export const getProjectMembers = (id: string) => api.get(`/projects/${id}/members`);
export const addProjectMember = (projectId: string, data: any) =>
  api.post(`/projects/${projectId}/members`, data);
export const removeProjectMember = (projectId: string, memberId: string): Promise<void> =>
  api.delete(`/projects/${projectId}/members/${memberId}`);
export const updateProjectMemberRole = (projectId: string, memberId: string, role: string) =>
  api.patch(`/projects/${projectId}/members/${memberId}`, { role });

// Project linked records (invoices / expenses / tasks)
export const getProjectInvoices  = (projectId: string) => api.get(`/projects/${projectId}/invoices`);
export const getProjectExpenses  = (projectId: string) => api.get(`/projects/${projectId}/expenses`);
export const getProjectTasks     = (projectId: string) => api.get(`/projects/${projectId}/tasks`);

// Milestone CRUD aliases (used by ViewProject)
export const createMilestone = (projectId: string, data: any) =>
  api.post(`/projects/${projectId}/milestones`, data);
export const updateMilestone = (projectId: string, milestoneId: string, data: any) =>
  api.patch(`/projects/${projectId}/milestones/${milestoneId}`, data);
export const deleteMilestone = (projectId: string, milestoneId: string): Promise<void> =>
  api.delete(`/projects/${projectId}/milestones/${milestoneId}`);

// ── Inventory ─────────────────────────────────────────────────────────────────
export const getInventory = (params?: { page?: number; limit?: number; q?: string; warehouseId?: string }) =>
  api.get("/inventory", { params });
export const getLowStock = () => api.get("/inventory/low-stock");
export const getInventoryMovements = (productId?: string) =>
  api.get("/inventory/movements", { params: productId ? { productId } : {} });
export const getInventoryMovementsPaged = (productId?: string, skip = 0, take = 50) =>
  api.get("/inventory/movements", { params: { ...(productId ? { productId } : {}), skip, take } });
export const adjustInventory = (productId: string, data: { qty: number; note?: string; reason?: string }) =>
  api.post(`/inventory/${productId}/adjust`, data);
export const setReorderLevel = (productId: string, reorderLevel: number) =>
  api.patch(`/inventory/${productId}/reorder-level`, { reorderLevel });
export const updateInventoryDetails = (productId: string, data: { reorderLevel?: number; location?: string }) =>
  api.patch(`/inventory/${productId}/details`, data);

// ── Attachments ───────────────────────────────────────────────────────────────
export const getAttachments = (linkedModel: string, linkedToId: string) =>
  api.get("/attachments", { params: { linkedModel, linkedToId } });
export const uploadAttachment = (file: File, linkedModel: string, linkedToId: string) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/attachments", form, {
    params: { linkedModel, linkedToId },
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const downloadAttachment = (id: string) =>
  api.get(`/attachments/${id}/download`, { responseType: "blob" });
export const deleteAttachment = (id: string): Promise<void> =>
  api.delete(`/attachments/${id}`);

// ── Exchange rates ────────────────────────────────────────────────────────────
export const getExchangeRates = () => api.get("/settings/exchange-rates");
export const upsertExchangeRate = (data: { currency: string; rate: number; asOf?: string }) =>
  api.put("/settings/exchange-rates", data);

// ── Approval chain steps ──────────────────────────────────────────────────────
export const getApprovalSteps = (entityType: string, entityId: string) =>
  api.get(`/approvals/${entityType}/${entityId}/steps`);

// ── Number Sequences ──────────────────────────────────────────────────────────
export const getNumberSequences = () => api.get("/settings/number-sequences");
export const updateNumberSequence = (
  key: string,
  data: { prefix?: string; padLength?: number; separator?: string },
) => api.put(`/settings/number-sequences/${key}`, data);

// ── Invoice Defaults ──────────────────────────────────────────────────────────
export const getInvoiceDefaults = () => api.get("/settings/invoice-defaults");
export const updateInvoiceDefaults = (data: {
  paymentTermsDays?: number;
  notes?: string;
  terms?: string;
  quotesValidDays?: number;
  taxInclusive?: boolean;
}) => api.put("/settings/invoice-defaults", data);

// ── Tax Rates ─────────────────────────────────────────────────────────────────
export type TaxRatePayload = {
  name: string;
  rate: number;
  isDefault?: boolean;
  liabilityAccountCode?: string | null;
  inputAccountCode?: string | null;
};
export const getTaxRates = () => api.get("/settings/tax-rates");
export const createTaxRate = (data: TaxRatePayload) =>
  api.post("/settings/tax-rates", data);
export const updateTaxRate = (id: string, data: Partial<TaxRatePayload>) =>
  api.patch(`/settings/tax-rates/${id}`, data);
export const deleteTaxRate = (id: string): Promise<void> =>
  api.delete(`/settings/tax-rates/${id}`);

// ── GL / Accounting config ────────────────────────────────────────────────────
export const getGlConfig = () => api.get("/settings/gl-config");
export const updateGlConfig = (data: Record<string, unknown>) =>
  api.put("/settings/gl-config", data);

// ── Cost Centers ─────────────────────────────────────────────────────────────
export type CostCenterPayload = {
  code: string;
  name: string;
  isActive?: boolean;
  parentId?: string | null;
};
export const getCostCenters = (params?: { q?: string; isActive?: boolean }) =>
  api.get<CostCenter[]>("/cost-centers", { params });
export const getCostCenter = (id: string) => api.get<CostCenter>(`/cost-centers/${id}`);
export const createCostCenter = (data: CostCenterPayload) => api.post<CostCenter>("/cost-centers", data);
export const updateCostCenter = (id: string, data: Partial<CostCenterPayload>) =>
  api.patch<CostCenter>(`/cost-centers/${id}`, data);
export const deleteCostCenter = (id: string): Promise<void> => api.delete(`/cost-centers/${id}`);

// ── Accounting — Chart of Accounts ────────────────────────────────────────────
export type ChartAccountPayload = {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  parentId?: string | null;
  currency?: string;
  isActive?: boolean;
  cashAccountId?: string | null;
};
export const getChartOfAccounts = (params?: Record<string, string | number | undefined>) =>
  api.get("/accounting/chart-of-accounts", { params });
export const getChartOfAccount = (id: string) => api.get(`/accounting/chart-of-accounts/${id}`);
export const getChartAccountLedger = (id: string, params?: { page?: number; from?: string; to?: string }) =>
  api.get(`/accounting/chart-of-accounts/${id}/ledger`, { params });
export const createChartOfAccount = (data: ChartAccountPayload) =>
  api.post("/accounting/chart-of-accounts", data);
export const updateChartOfAccount = (id: string, data: Partial<ChartAccountPayload>) =>
  api.patch(`/accounting/chart-of-accounts/${id}`, data);
export const deleteChartOfAccount = (id: string): Promise<void> =>
  api.delete(`/accounting/chart-of-accounts/${id}`);

// ── Accounting — Journal ──────────────────────────────────────────────────────
export type JournalLinePayload = {
  accountId: string;
  debit?: number;
  credit?: number;
  currency?: string;
  memo?: string;
};
export type JournalEntryPayload = {
  date: string;
  memo?: string;
  lines: JournalLinePayload[];
};
export const getJournalEntries = (params?: { page?: number; limit?: number; status?: string; sourceType?: string; q?: string }) =>
  api.get("/accounting/journal", { params });
export const getJournalEntry = (id: string) => api.get(`/accounting/journal/${id}`);
export const getDocumentJournalEntries = (model: "Invoice" | "VendorBill" | "ExpenseReport", id: string) =>
  api.get(`/accounting/journal/for/${model}/${id}`);
export const createJournalEntry = (data: JournalEntryPayload) =>
  api.post("/accounting/journal", data);
export const reverseJournalEntry = (id: string) => api.post(`/accounting/journal/${id}/reverse`);
export const runReconciliation = () => api.post("/accounting/reconcile");

// ── Accounting — Statements ───────────────────────────────────────────────────
export const getTrialBalance = (params?: { asOf?: string }) =>
  api.get("/accounting/trial-balance", { params });
export const getIncomeStatement = (params?: { start?: string; end?: string }) =>
  api.get("/accounting/profit-loss", { params });
export const getBalanceSheet = (params?: { asOf?: string }) =>
  api.get("/accounting/balance-sheet", { params });
export const getCashFlowStatement = (params?: { start?: string; end?: string }) =>
  api.get("/accounting/cash-flow", { params });

// ── Warehouses ────────────────────────────────────────────────────────────────
export type WarehousePayload = { name: string; code: string; address?: unknown; isDefault?: boolean; isActive?: boolean };
export const getWarehouses = (params?: Record<string, string | number | undefined>) =>
  api.get("/warehouses", { params });
export const createWarehouse = (data: WarehousePayload) => api.post("/warehouses", data);
export const updateWarehouse = (id: string, data: Partial<WarehousePayload>) => api.patch(`/warehouses/${id}`, data);
export const deleteWarehouse = (id: string): Promise<void> => api.delete(`/warehouses/${id}`);
export const transferStock = (data: { productId: string; fromWarehouseId: string; toWarehouseId: string; qty: number; note?: string }) =>
  api.post("/inventory/transfers", data);
export const returnStock = (data: { movementId: string; qty: number; note?: string }) =>
  api.post("/inventory/returns", data);
export const getStockValuation = (params?: { warehouseId?: string; q?: string; page?: number; limit?: number }) =>
  api.get("/inventory/valuation", { params });

// ── Product categories ────────────────────────────────────────────────────────
export type ProductCategoryPayload = { name: string; code?: string | null; costMethod?: string | null; parentId?: string | null };
export const getProductCategories = (params?: Record<string, string | number | undefined>) =>
  api.get("/product-categories", { params });
export const createProductCategory = (data: ProductCategoryPayload) => api.post("/product-categories", data);
export const updateProductCategory = (id: string, data: Partial<ProductCategoryPayload>) => api.patch(`/product-categories/${id}`, data);
export const deleteProductCategory = (id: string): Promise<void> => api.delete(`/product-categories/${id}`);

// ── Accounting — Period close ─────────────────────────────────────────────────
export const getClosedPeriods = () => api.get("/accounting/periods");
export const closePeriod = (period: string) => api.post(`/accounting/periods/${period}/close`);
export const reopenPeriod = (period: string) => api.post(`/accounting/periods/${period}/reopen`);

// ── Notification Preferences ──────────────────────────────────────────────────
export const getNotificationPreferences = () =>
  api.get("/users/me/notification-preferences");
export const updateNotificationPreferences = (data: Record<string, { inApp: boolean; email: boolean }>) =>
  api.put("/users/me/notification-preferences", data);

// ── Password Policy ───────────────────────────────────────────────────────────
export const getPasswordPolicy = () => api.get("/settings/password-policy");
export const updatePasswordPolicy = (data: {
  minLength?: number;
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSymbol?: boolean;
}) => api.put("/settings/password-policy", data);

// ── Email / SMTP Config ───────────────────────────────────────────────────────
export const getEmailConfig = () => api.get("/settings/email-config");
export const updateEmailConfig = (data: {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
}) => api.put("/settings/email-config", data);
export const testEmailConfig = () => api.post("/settings/email-config/test");

// ── Sample Data (Settings → Danger Zone) ──────────────────────────────────────
export const loadSampleData = () => api.post("/settings/sample-data/load");
export const clearSampleData = (): Promise<{ data: { ok: boolean; total: number } }> =>
  api.post("/settings/sample-data/clear");

// ── Security — sessions, login history, change password ───────────────────────
export const getSessions = () => api.get("/users/me/sessions");
export const revokeSession = (sessionId: string) =>
  api.delete(`/users/me/sessions/${sessionId}`);
export const getLoginHistory = () => api.get("/users/me/login-history");
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post("/users/me/change-password", { currentPassword, newPassword });


