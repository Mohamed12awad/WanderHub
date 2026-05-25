// src/utils/api.js
import axios from "axios";
import {
  DealData,
  Customer,
  ExpenseReportData,
  PaymentData,
  ReportParams,
  Product,
  UserData,
  ActivityFormData,
  TaskFormData,
  QuoteFormData,
  InvoiceFormData,
} from "@/types/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login page if token is expired
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      window.location.href = "/login";
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
export const downloadInvoice = async (dealId: string) => {
  try {
    const response = await api.get(`deals/${dealId}/invoice`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `invoice_${dealId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error downloading the invoice:", error);
  }
};

// Payment API Requests
export const createPayment = (data: PaymentData) =>
  api.post(`/partialPayments`, data);
export const deletePayment = (PaymentId: string): Promise<void> =>
  api.delete(`/partialPayments/${PaymentId}`);

// Roles API Requests
export const getRoles = () => api.get("/roles");

// User API Requests
export const getUsers = (params?: { page?: number; limit?: number; q?: string }) =>
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
export const getProducts = (params?: { page?: number; limit?: number; q?: string }) =>
  api.get("/products", { params });
export const getProductById = (id: string) => api.get(`/products/${id}`);
export const createProduct = (data: Product) => api.post("/products", data);
export const updateProduct = (id: string, data: Product) =>
  api.put(`/products/${id}`, data);
export const deleteProduct = (id: string): Promise<void> =>
  api.delete(`/products/${id}`);

// Summery API Requests
export const getSummery = (period?: string) =>
  api.get("/summery", {
    params: {
      timePeriod: period,
    },
  });

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
export const getActivities = (linkedTo: string, linkedModel: "Customer" | "Deal") =>
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
  linkedModel: "Customer" | "Deal";
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
export const recordInvoicePayment = (
  invoiceId: string,
  data: { amount: number; currency: string; date: string; method: string; reference?: string; notes?: string }
) => api.post(`/finance/invoices/${invoiceId}/payments`, data);
export const deleteInvoicePayment = (invoiceId: string, paymentId: string): Promise<void> =>
  api.delete(`/finance/invoices/${invoiceId}/payments/${paymentId}`);

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
