import { Link } from "react-router-dom";
import NavLinks from "./NavLinks";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, Lang } from "@/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check, LogOut, Settings } from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <aside className="hidden md:flex flex-col overflow-hidden border-e bg-[hsl(var(--sidebar-bg))] border-border row-start-1 row-end-3 print:hidden">
      {/* Logo */}
      <div className="flex h-[60px] items-center px-5 border-b dark:border-border shrink-0">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <img src="/logo.png" className="h-5 w-5" alt="WonderHub" />
          </div>
          <span className="text-base">WonderHub</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
        <NavLinks />
      </nav>

      {/* Footer */}
      <div className="border-t dark:border-border px-3 py-3 space-y-1 shrink-0">
        {/* Language picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{LANGUAGES[lang].native}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            {(Object.entries(LANGUAGES) as [Lang, typeof LANGUAGES[Lang]][]).map(([code, meta]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => setLang(code)}
                className="gap-2 cursor-pointer"
              >
                <span className="text-base leading-none">{meta.flag}</span>
                <span>{meta.native}</span>
                {code === lang && <Check className="ms-auto h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User info */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize truncate">{user?.role}</p>
          </div>
          <Link
            to="/settings"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={logout}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
