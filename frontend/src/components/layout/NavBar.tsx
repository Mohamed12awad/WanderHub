// import { useState } from "react";
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

import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/authContext.tsx";
import NavLinks from "./NavLinks.tsx";
import { ModeToggle } from "../common/toggleTheme.tsx";

export default function NavBar() {
  const { logout } = useAuth();
  // const [searchContext, setSearchContext] = useState("customers");

  // const handleSearchContextChange = (context: string) => {
  //   setSearchContext(context);
  // };

  return (
    <div className="flex flex-col print:hidden dark:bg-slate-800">
      <header className="flex h-14 items-center gap-4 border-b dark:border-slate-800 bg-muted/40 px-4 lg:h-[60px] lg:px-6">
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
                <img src="/logo.png" className="h-6 w-6" />
                <span>WonderHub</span>
              </Link>
              <NavLinks />
            </nav>
          </SheetContent>
        </Sheet>
        <div className="w-full flex-1 flex items-center">
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="">
                {searchContext.charAt(0).toUpperCase() + searchContext.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => handleSearchContextChange("customers")}
              >
                Customers
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSearchContextChange("bookings")}
              >
                Bookings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
          <form className="w-full" method="get">
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={`Search ${"customers"}...`}
                className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
              />
            </div>
          </form>
        </div>
        <ModeToggle />
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
