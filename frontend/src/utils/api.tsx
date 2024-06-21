// src/utils/api.js
import axios from "axios";

export interface UserData {
  email: string;
  password: string;
  name: string;
  role: string;
}
interface BookingData {
  customer: string;
  room: string;
  startDate: Date;
  endDate: Date;
  price: number;
  currency: string;
  totalPaid: number;
  status: string;
  numberOfPeople: number;
  extraBusSeats: number;
  bookingLocation: string;
  notes: string;
}
type FormData = {
  name: string;
  phone: string;
  mobile: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  identification: {
    passportNumber: string;
    nationalId: string;
  };
  dateOfBirth: string; // Adjust based on actual type (e.g., Date)
  gender: string;
  preferredContactMethod: string;
  paymentInformation: {
    cardType: string;
    cardNumber: string;
    expirationDate: string;
  };
  loyaltyProgram: {
    memberId: string;
    points: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  location: string;
  // Add more fields as per your form schema
};

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
export const getBookingById = (id: string) => api.get(`/bookings/${id}`);
export const createBooking = (data: BookingData) => api.post("/bookings", data);
export const updateBooking = (id: string, data: BookingData) =>
  api.put(`/bookings/${id}`, data);
export const deleteBooking = (BookingId: string) =>
  api.delete(`/bookings/${BookingId}`);
// export const getInvoice = (bookingId: string) =>
//   api.get(`bookings/${bookingId}/invoice`, {
//     responseType: "blob",
//   });
export const downloadInvoice = async (bookingId: string) => {
  try {
    const response = await api.get(`bookings/${bookingId}/invoice`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `invoice_${bookingId}.pdf`); // Specify the file name
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error downloading the invoice:", error);
  }
};

// Roles API Customers
export const getRoles = () => api.get("/roles");

// User API Requests
export const getUsers = () => api.get("/users");
export const getUsersById = () => api.get("/users");
export const createUser = (data: UserData) => api.post("/users", data);
export const deleteUser = (userId: string) => api.delete(`/users/${userId}`);
export const toggleUserState = (id: string) => api.put(`/users/active/${id}`);

// User API Customers
export const getCustomers = () => api.get("/customers");
export const getCustomerById = (id: string) => api.get(`/customers/${id}`);
export const createCustomer = (data: FormData) => api.post("/customers", data);
export const deleteCustomer = (customerId: string) =>
  api.delete(`/customers/${customerId}`);
export const updateCustomer = (customerId: string, data: FormData) =>
  api.put(`/customers/${customerId}`, data);

// Rooms API Customers
export const getRooms = () => api.get("/rooms");
