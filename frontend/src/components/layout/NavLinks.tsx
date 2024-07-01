// Sidebar.js
import { useLocation } from "react-router-dom";
// import { Button } from "../ui/button";
// import { Link } from "react-router-dom";
import NavItem from "./NavItem";
import {
  Users2,
  Plane,
  Users,
  WalletCards,
  LayoutDashboard,
  DoorOpen,
  Banknote,
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";

function NavLinks() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <>
      <NavItem
        href="/customers"
        icon={Users2}
        label="Customers"
        active={location.pathname.includes("/customers")}
      />
      <NavItem
        href="/bookings"
        icon={Plane}
        label="Bookings"
        active={location.pathname.includes("/bookings")}
      />
      {["admin", "manager"].includes(user!.role) && (
        <NavItem
          href="/rooms"
          icon={DoorOpen}
          label="Rooms"
          active={location.pathname.includes("/rooms")}
        />
      )}
      <NavItem
        href="/expenses"
        icon={Banknote}
        label="Expenses"
        active={location.pathname.includes("/expenses")}
      />
      {user?.role == "admin" && (
        <NavItem
          href="/users"
          icon={Users}
          label="Users"
          active={location.pathname.includes("/users")}
        />
      )}
      <NavItem
        href="/reports"
        icon={WalletCards}
        label="Reports"
        active={location.pathname.includes("/reports")}
      />
      {user?.role == "admin" && (
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          active={location.pathname.includes("/dashboard")}
        />
      )}
      {/* 
            <NavItem
              href="/"
              icon={Home}
              label="Dashboard"
              active={location.pathname === "/"}
            />
            <NavItem
              href="/test"
              icon={ShoppingCart}
              label="Orders"
              badge="6"
              active={location.pathname.includes("/test")}
            />
            <NavItem
              href="/products"
              icon={Package}
              label="Products"
              active={location.pathname.includes("/products")}
            />
            <NavItem
              href="/analytics"
              icon={LineChart}
              label="Analytics"
              active={location.pathname === "/analytics"}
            /> */}
    </>
  );
}

export default NavLinks;
