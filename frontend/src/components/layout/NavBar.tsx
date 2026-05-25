import { useState } from "react";
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
import { Menu, Search, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { useLanguage } from "../../contexts/LanguageContext";
import NavLinks from "./NavLinks";

const SEARCH_ROUTES: Record<string, string> = {
  deals: "/deals",
  customers: "/customers",
  contacts: "/customers",
  products: "/products",
  expenses: "/expenses",
  pipeline: "/pipeline",
};

export default function NavBar() {
  const { logout, user } = useAuth();
  const { lang, tr } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = Object.keys(SEARCH_ROUTES).find((k) => q.includes(k));
    navigate(match ? SEARCH_ROUTES[match] : "/customers");
    setQuery("");
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header className="flex h-[60px] items-center gap-3 border-b bg-white dark:bg-[hsl(var(--card))] dark:border-border px-4 lg:px-5 print:hidden shrink-0">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side={lang === "ar" ? "right" : "left"} className="flex flex-col w-72 p-0">
          <div className="flex h-[60px] items-center gap-2.5 px-5 border-b shrink-0">
            <Link to="/" className="flex items-center gap-2.5 font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <img src="/logo.png" className="h-5 w-5" alt="WonderHub" />
              </div>
              <span>WonderHub</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks />
          </nav>
        </SheetContent>
      </Sheet>

      {/* Search */}
      <form className="flex-1" onSubmit={handleSearch}>
        <div className="relative max-w-xs">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={`${tr.common.search}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-8 pe-14 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:bg-background"
          />
          <kbd className="pointer-events-none absolute end-2 top-1.5 hidden h-6 select-none items-center rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground md:flex">
            ⌘K
          </kbd>
        </div>
      </form>

      <div className="flex items-center gap-1.5 ms-auto shrink-0">
        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
            >
              {initials}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive gap-2"
            >
              <LogOut className="h-4 w-4" />
              {lang === "en" ? "Sign out" : "تسجيل الخروج"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
