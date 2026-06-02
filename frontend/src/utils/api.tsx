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

export async function refreshAccessToken(): Promise<string | null> {
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
    const original = error.config as (typeof error.config & { _retry?: boolean });
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
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
export const toggleUserState = (id: string) => api.put(`/users/active/${id}`);

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

// Summery API Requests
export const getSummery = (period?: string) =>
  api.get("/summery", { params: { timePeriod: period } });

export const getPendingApprovals = () => api.get("/summery/pending-approvals");
export const getLeadsReport = () => api.get("/reports/leads");

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
  api.patch(`/expenses/${id}/approval`, { approved: state });
export const approveExpenseReport = (id: string) => api.patch(`/expenses/${id}/approve`);
export const rejectExpenseReport = (id: string, reason: string) => api.patch(`/expenses/${id}/reject`, { reason });
// export const updateExpenseReportItem = (id: string, expenseId: string, data) =>
//   api.put(`/expenses/${id}/expense/${expenseId}`, data);
export const deleteExpenseReportItem = (
  id: string,
  expenseId: string
): Promise<void> => api.delete(`/expenses/${id}/expense/${expenseId}`);

// Activities API Requests
export const getActivities = (linkedTo: string, linkedModel: "Customer" | "Deal" | "Lead" | "Project" | "Supplier" | "PurchaseOrder" | "Invoice" | "Quote") =>
  api.get("/activities", { params: { linkedTo, linkedModel } });
export const getAllActivities = (params?: { month?: number; year?: number }) =>
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
  page?: number;
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
export const createAccount = (data: { name: string; type: string; currency: string; balance?: number; notes?: string }) =>
  api.post("/accounts", data);
export const updateAccount = (id: string, data: { name?: string; type?: string; currency?: string; balance?: number; notes?: string }) =>
  api.patch(`/accounts/${id}`, data);
export const deleteAccount = (id: string): Promise<void> => api.delete(`/accounts/${id}`);
export const getAccountStatement = (id: string, params?: { page?: number; limit?: number }) =>
  api.get(`/accounts/${id}/statement`, { params });

// Reports — Analytics
export const getRevenueReport = (params?: { startDate?: string; endDate?: string }) =>
  api.get("/reports/revenue", { params });
export const getPipelineReport = () => api.get("/reports/pipeline");
export const getExpensesCategoryReport = (params?: { startDate?: string; endDate?: string }) =>
  api.get("/reports/expenses-category", { params });
export const getOutstandingReport = () => api.get("/reports/outstanding");
export const getCustomerAcquisitionReport = (params?: { startDate?: string; endDate?: string }) =>
  api.get("/reports/customer-acquisition", { params });

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
  fieldGroups?: { module: string; fields: { id: string; name: string; label: string; type: string; required: boolean; options?: string }[] }[];
  moduleSettings?: { module: string; enabled: boolean }[];
}) => api.put("/settings/workspace", data);

export const getOrgSettings = () => api.get("/settings/organization");
export const updateOrgSettings = (data: { baseCurrency?: string; locale?: string }) =>
  api.put("/settings/organization", data);

// Leads
export const getLeads = (params?: { page?: number; limit?: number; q?: string; [key: string]: unknown }) =>
  api.get("/leads", { params });
export const getLeadById = (id: string) => api.get(`/leads/${id}`);
export const createLead = (data: Record<string, unknown>) => api.post("/leads", data);
export const updateLead = (id: string, data: Record<string, unknown>) => api.put(`/leads/${id}`, data);
export const deleteLead = (id: string): Promise<void> => api.delete(`/leads/${id}`);
export const convertLead = (id: string) => api.post(`/leads/${id}/convert`);

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
  api.patch(`/procurement/purchase-orders/${id}`, data);
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
  api.patch(`/procurement/vendor-bills/${id}`, data);
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
  api.patch(`/projects/${id}`, data);
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


