// NavBar.js
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaUserCircle, FaBars, FaSearch } from "react-icons/fa";

import {
  // Home,
  // ShoppingCart,
  Users2,
  Users,
  // LineChart,
  Plane,
  LayoutDashboard,
  // Package,
} from "lucide-react";

import NavItem from "./NavItem"; // Adjust the import path according to your project structure
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/authContext.tsx";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col print:hidden">
      <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <FaBars className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <nav className="grid gap-2 text-lg font-medium">
              <Link
                to="/"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                {/* <Plane className="h-6 w-6" /> */}
                <img src="/logo.png" className="h-6 w-6" />

                <span>WonderHub</span>
              </Link>
              {/* <NavItem href="#" icon={Home} label="Dashboard" />
              <NavItem href="#" icon={ShoppingCart} label="Orders" badge="6" />
              <NavItem href="#" icon={Package} label="Products" active />
              <NavItem href="#" icon={Users2} label="Customers" />
              <NavItem href="#" icon={LineChart} label="Analytics" /> */}
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
              {user?.role == "admin" && (
                <NavItem
                  href="/dashboard"
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={location.pathname.includes("/dashboard")}
                />
              )}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="w-full flex-1">
          <form>
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
              />
            </div>
          </form>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <FaUserCircle className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </div>
  );
}
