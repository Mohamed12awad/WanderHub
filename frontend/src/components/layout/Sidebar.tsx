// Sidebar.js
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import NavLinks from "./NavLinks";

export default function Sidebar() {
  return (
    <div className="hidden border-r dark:border-slate-800 bg-muted/40 dark:bg-gradient-to-r dark:from-gray-900 dark:to-slate-800 md:block row-start-1 row-end-3 print:hidden">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b dark:border-slate-800 px-4 lg:h-[60px] lg:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold dark:text-white"
          >
            {/* <Plane className="h-6 w-6" /> */}
            <img src="/logo.png" className="h-6 w-6" />

            <span>WonderHub</span>
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4 dark:text-white" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <NavLinks />
          </nav>
        </div>
      </div>
    </div>
  );
}
