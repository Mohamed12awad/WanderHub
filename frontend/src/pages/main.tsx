import React from "react";
import { Routes, Route } from "react-router-dom";

// Layout Components
import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";

// Dashboard Component
import { Dashboard } from "./Dashboard";

// Customer Components
import { Customers } from "@/components/Customers/Customers";
import AddCustomer from "@/components/Customers/AddCustomers";
import EditCustomer from "@/components/Customers/EditCustomer";
import ViewCustomer from "@/components/Customers/ViewCustomer";

// User Components
import { Users } from "@/components/Users/Users";
import AddUser from "@/components/Users/AddUser";
import EditUser from "@/components/Users/EditUser";

// Booking Components
import { Bookings } from "@/components/Bookings/Bookings";
import AddBooking from "@/components/Bookings/AddBookings";
import EditBooking from "@/components/Bookings/EditBookings";
import ViewBooking from "@/components/Bookings/ViewBooking";

// Room Components
import { Rooms } from "@/components/Rooms/Rooms";
import AddRoom from "@/components/Rooms/AddRoom";
import EditRoom from "@/components/Rooms/EditRoom";
import ViewRoom from "@/components/Rooms/ViewRoom";

// Expense Components
import { Expenses } from "@/components/Expenses/Expenses";
import AddExpenseReport from "@/components/Expenses/AddExpenses";
import EditExpenseReport from "@/components/Expenses/EditExpenses";
import ViewExpense from "@/components/Expenses/ViewExpenses";

// Report Component
import Reports from "@/components/Reports/Reports";

// Route Configuration
const routes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/customers", element: <Customers /> },
  { path: "/customers/add", element: <AddCustomer /> },
  { path: "/customers/:id", element: <ViewCustomer /> },
  { path: "/customers/:id/edit", element: <EditCustomer /> },
  { path: "/users", element: <Users /> },
  { path: "/users/add", element: <AddUser /> },
  { path: "/users/:id/edit", element: <EditUser /> },
  { path: "/bookings", element: <Bookings /> },
  { path: "/bookings/add", element: <AddBooking /> },
  { path: "/bookings/:id", element: <ViewBooking /> },
  { path: "/bookings/:id/edit", element: <EditBooking /> },
  { path: "/rooms", element: <Rooms /> },
  { path: "/rooms/add", element: <AddRoom /> },
  { path: "/rooms/:id", element: <ViewRoom /> },
  { path: "/rooms/:id/edit", element: <EditRoom /> },
  { path: "/expenses", element: <Expenses /> },
  { path: "/expenses/add", element: <AddExpenseReport /> },
  { path: "/expenses/:id", element: <ViewExpense /> },
  { path: "/expenses/:id/edit", element: <EditExpenseReport /> },
  { path: "/reports", element: <Reports /> },
];

const DefaultLayout: React.FC = () => {
  return (
    <div className="grid min-h-screen dark:bg-gradient-to-br from-gray-50 to-gray-300 w-full md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] lg:grid-rows-[60px_1fr]">
      <Sidebar />
      <NavBar />
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
      </Routes>
    </div>
  );
};

export default DefaultLayout;
