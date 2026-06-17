import { Link } from "react-router-dom";
import NavLinks from "./NavLinks";
import { useAuth } from "@/contexts/authContext";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useOrgLogo } from "@/hooks/useOrgLogo";

export default function Sidebar() {
  const { user } = useAuth();
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md shadow-black/15">
            {logo
              ? <img src={logo} className="h-full w-full object-contain p-1" alt="Logo" />
              : <img src="/logo.png" className="h-full w-full object-cover" alt="NawaHub" />}
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
        {/* Expand toggle — standalone only when collapsed (there's no room in the user row). */}
        {collapsed && (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="w-full flex items-center justify-center rounded-md px-3 py-2 text-white/35 hover:bg-white/[0.07] hover:text-white/65 transition-colors"
          >
            <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
          </button>
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
              {/* Collapse toggle — sits beside the name (Settings/Sign out now live in the top-bar avatar menu). */}
              <button
                onClick={toggle}
                className="shrink-0 text-white/30 hover:text-white/65 transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
