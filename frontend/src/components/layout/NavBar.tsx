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
import { Menu, Search, LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import { useLanguage } from "../../contexts/LanguageContext";
import NavLinks from "./NavLinks";
import { ModeToggle } from "@/components/common/toggleTheme";

export default function NavBar() {
  const { logout, user } = useAuth();
  const { lang, tr } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header className="flex h-[60px] items-center gap-3 border-b border-border/60 bg-card px-4 lg:px-6 print:hidden shrink-0 shadow-sm shadow-black/[0.03]">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side={lang === "ar" ? "right" : "left"}
          className="flex flex-col w-72 p-0 bg-[hsl(var(--sidebar-bg))] border-e-0"
        >
          <div className="flex h-[60px] items-center gap-3 px-5 shrink-0">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/40">
                <img src="/logo.png" className="h-5 w-5" alt="WonderHub" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-white">WonderHub</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <NavLinks />
          </nav>
        </SheetContent>
      </Sheet>

      {/* Global search */}
      <button
        onClick={() =>
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
          )
        }
        className="flex flex-1 max-w-sm items-center gap-2.5 rounded-full border border-border/80 bg-muted/40 px-3.5 h-9 text-sm text-muted-foreground hover:bg-muted hover:border-border transition-all"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-start text-sm">{tr.common.search}…</span>
        <kbd className="hidden md:flex h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          <span className="text-xs leading-none">⌘</span>K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5 ms-auto shrink-0">
        <ModeToggle />

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 hover:text-primary-foreground"
            >
              {initials}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal py-2">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link to="/settings">
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive gap-2 cursor-pointer"
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
