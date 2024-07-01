// src/utils/api.js
import axios from "axios";
import {
  BookingData,
  Customer,
  ExpenseReportData,
  PaymentData,
  ReportParams,
  Room,
  UserData,
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

// Bookings API Requests
export const getBookings = () => api.get("/bookings");
export const getBookingById = (id: string) =>
  api.get(`/bookings/${id}?includePayments=true`);
export const createBooking = (data: BookingData) => api.post("/bookings", data);
export const updateBooking = (id: string, data: BookingData) =>
  api.put(`/bookings/${id}`, data);
export const deleteBooking = (id: string): Promise<void> =>
  api.delete(`/bookings/${id}`);
// export const downloadInvoice = async (bookingId: string) => {
//   try {
//     const response = await api.get(`bookings/${bookingId}/invoice`, {
//       responseType: "blob",
//     });
//     const url = window.URL.createObjectURL(new Blob([response.data]));
//     const link = document.createElement("a");
//     link.href = url;
//     link.setAttribute("download", `invoice_${bookingId}.pdf`);
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//   } catch (error) {
//     console.error("Error downloading the invoice:", error);
//   }
// };

// Payment API Requests
export const createPayment = (data: PaymentData) =>
  api.post(`/partialPayments`, data);
export const deletePayment = (PaymentId: string): Promise<void> =>
  api.delete(`/partialPayments/${PaymentId}`);

// Roles API Requests
export const getRoles = () => api.get("/roles");

// User API Requests
export const getUsers = () => api.get("/users");
export const getUserById = (id: string) => api.get(`/users/${id}`);
export const createUser = (data: UserData) => api.post("/users", data);
export const updateUser = (userId: string, data: UserData) =>
  api.put(`/users/${userId}`, data);
export const deleteUser = (userId: string): Promise<void> =>
  api.delete(`/users/${userId}`);
export const toggleUserState = (id: string) => api.put(`/users/active/${id}`);

// User API Requests
export const getCustomers = () => api.get("/customers");
export const getCustomerById = (id: string) => api.get(`/customers/${id}`);
export const createCustomer = (data: Customer) => api.post("/customers", data);
export const deleteCustomer = (customerId: string): Promise<void> =>
  api.delete(`/customers/${customerId}`);
export const updateCustomer = (customerId: string, data: Customer) =>
  api.put(`/customers/${customerId}`, data);

// Rooms API Requests
export const getRooms = () => api.get("/rooms");
export const getRoomById = (id: string) => api.get(`/rooms/${id}`);
export const createRoom = (roomData: Room) => api.post("/rooms", roomData);
export const updateRoom = (id: string, data: Room) =>
  api.put(`/rooms/${id}`, data);
export const deleteRoom = (id: string): Promise<void> =>
  api.delete(`/rooms/${id}`);

// Summery API Requests
export const getSummery = (period: string) =>
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
export const getExpenses = () => api.get("/expenses");
export const getExpenseById = (id: string) => api.get(`/expenses/${id}`);
export const createExpense = (data: ExpenseReportData) =>
  api.post("/expenses", data);
export const updateExpense = (id: string, data: ExpenseReportData) =>
  api.put(`/expenses/${id}`, data);
export const deleteExpense = (id: string): Promise<void> =>
  api.delete(`/expenses/${id}`);
export const approveExpense = (id: string, state: boolean) =>
  api.patch(`/expenses/${id}/approval`, { approved: state });
// export const updateExpenseReportItem = (id: string, expenseId: string, data) =>
//   api.put(`/expenses/${id}/expense/${expenseId}`, data);
export const deleteExpenseReportItem = (
  id: string,
  expenseId: string
): Promise<void> => api.delete(`/expenses/${id}/expense/${expenseId}`);
