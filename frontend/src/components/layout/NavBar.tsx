import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Search, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { useLanguage } from "../../contexts/LanguageContext";
import NavLinks from "./NavLinks";
export default function NavBar() {
  const { logout, user } = useAuth();
  const { lang, tr } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header className="flex h-[60px] items-center gap-3 border-b bg-card border-border px-4 lg:px-5 print:hidden shrink-0">
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

      {/* Global search button — opens the Cmd+K SearchPalette */}
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
        className="flex flex-1 max-w-xs items-center gap-2 rounded-md bg-muted/50 px-3 h-9 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start">{tr.common.search}…</span>
        <kbd className="hidden md:flex h-5 select-none items-center rounded border bg-background px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

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
