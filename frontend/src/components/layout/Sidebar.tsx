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
    <aside className="hidden md:flex flex-col overflow-hidden bg-[hsl(var(--sidebar-bg))] border-e border-white/[0.06] row-start-1 row-end-3 print:hidden">
      {/* Logo ─ same height as the header */}
      <div className="flex h-[60px] items-center gap-3 px-5 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/40">
            <img src="/logo.png" className="h-5 w-5" alt="WonderHub" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white truncate">
            WonderHub
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        <NavLinks />
      </nav>

      {/* Footer — language + user */}
      <div className="px-3 py-3 shrink-0 border-t border-white/[0.06] space-y-0.5">
        {/* Language picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-white/35 hover:bg-white/[0.07] hover:text-white/65 transition-colors">
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

        {/* User row */}
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/75 truncate">{user?.name}</p>
            <p className="text-[10px] text-white/35 capitalize truncate">{user?.role}</p>
          </div>
          <Link
            to="/settings"
            className="shrink-0 text-white/30 hover:text-white/65 transition-colors"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={logout}
            className="shrink-0 text-white/30 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
