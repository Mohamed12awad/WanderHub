import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";
import { Routes, Route } from "react-router-dom";
import React from "react";
import AddCustomer from "@/components/Customers/AddCustomers";
import AddUser from "../components/Users/AddUser";
import { Customers } from "@/components/Customers/Customers";
import EditCustomer from "@/components/Customers/EditCustomer";
import { Bookings } from "@/components/Bookings/Bookings";
import ViewCustomer from "@/components/Customers/ViewCustomer";
import { Users } from "@/components/Users/Users";
import PrivateRoute from "@/components/PrivateRoute";
import AddBooking from "@/components/Bookings/AddBookings";
import EditBooking from "@/components/Bookings/EditBookings";

const DefaultLayout: React.FC = () => {
  // This will conditionally render the Sidebar and NavBar
  return (
    <>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_ 1fr] lg:grid-cols-[280px_1fr] lg:grid-rows-[60px_1fr]">
        <Sidebar />
        <NavBar />
        <Routes>
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<ViewCustomer />} />
          <Route path="/customers/add" element={<AddCustomer />} />
          <Route path="/customers/:id/edit" element={<EditCustomer />} />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Users />
              </PrivateRoute>
            }
          />
          <Route path="/users/add" element={<AddUser />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/add" element={<AddBooking />} />
          <Route path="/bookings/:id/edit" element={<EditBooking />} />
        </Routes>
      </div>
    </>
  );
};

export default DefaultLayout;
