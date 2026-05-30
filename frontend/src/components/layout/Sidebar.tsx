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
import { Globe, Check, LogOut, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useOrgLogo } from "@/hooks/useOrgLogo";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const { collapsed, toggle } = useSidebar();
  const { logo } = useOrgLogo();

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <aside className="hidden md:flex flex-col overflow-hidden bg-[hsl(var(--sidebar-bg))] border-e border-white/[0.06] row-start-1 row-end-3 print:hidden transition-all duration-200">
      {/* Logo */}
      <div className={`flex h-[60px] items-center shrink-0 ${collapsed ? "justify-center px-2" : "gap-3 px-5"}`}>
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/40 overflow-hidden">
            {logo
              ? <img src={logo} className="h-full w-full object-contain p-0.5" alt="Logo" />
              : <img src="/logo.png" className="h-5 w-5" alt="NawaHub" />}
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-white truncate">
              NawaHub
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        <NavLinks />
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 shrink-0 border-t border-white/[0.06] space-y-0.5">
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full flex items-center rounded-md px-3 py-2 text-xs font-medium text-white/35 hover:bg-white/[0.07] hover:text-white/65 transition-colors"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-3.5 w-3.5 shrink-0 me-2.5" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* Language picker */}
        {!collapsed && (
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
        )}

        {/* User row */}
        <div className={`flex items-center rounded-md px-3 py-2 ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
            title={collapsed ? `${user?.name} · ${user?.role}` : undefined}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
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
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
