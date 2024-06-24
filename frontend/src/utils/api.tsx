// src/utils/api.js
import axios from "axios";
import { BookingData, Customer, PaymentData, UserData } from "@/types/types";

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
export const deleteBooking = (id: string) => api.delete(`/bookings/${id}`);
export const downloadInvoice = async (bookingId: string) => {
  try {
    const response = await api.get(`bookings/${bookingId}/invoice`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `invoice_${bookingId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error downloading the invoice:", error);
  }
};
// export const getBookingPayment = (id: string) => api.get(`/bookings/${id}`);

// Payment API Customers
export const createPayment = (data: PaymentData) =>
  api.post(`/partialPayments`, data);
export const deletePayment = (PaymentId: string) =>
  api.delete(`/partialPayments/${PaymentId}`);

// Roles API Customers
export const getRoles = () => api.get("/roles");

// User API Requests
export const getUsers = () => api.get("/users");
export const getUserById = (id: string) => api.get(`/users/${id}`);
export const createUser = (data: UserData) => api.post("/users", data);
export const updateUser = (userId: string, data: UserData) =>
  api.put(`/users/${userId}`, data);
export const deleteUser = (userId: string) => api.delete(`/users/${userId}`);
export const toggleUserState = (id: string) => api.put(`/users/active/${id}`);

// User API Customers
export const getCustomers = () => api.get("/customers");
export const getCustomerById = (id: string) => api.get(`/customers/${id}`);
export const createCustomer = (data: Customer) => api.post("/customers", data);
export const deleteCustomer = (customerId: string) =>
  api.delete(`/customers/${customerId}`);
export const updateCustomer = (customerId: string, data: Customer) =>
  api.put(`/customers/${customerId}`, data);

// Rooms API Customers
export const getRooms = () => api.get("/rooms");
