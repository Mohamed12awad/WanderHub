// Sidebar.js
import { useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import NavItem from "./NavItem"; // Adjust the import path according to your project structure
import {
  // Home,
  // ShoppingCart,
  Users2,
  // LineChart,
  Bell,
  Plane,
  // Package,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="hidden border-r bg-muted/40 md:block row-start-1 row-end-3">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="#" className="flex items-center gap-2 font-semibold">
            <Plane className="h-6 w-6" />
            <span>Sahab Tours</span>
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
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
            {user?.role == "admin" && (
              <NavItem
                href="/users"
                icon={Users}
                label="Users"
                active={location.pathname.includes("/users")}
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
          </nav>
        </div>
      </div>
    </div>
  );
}
