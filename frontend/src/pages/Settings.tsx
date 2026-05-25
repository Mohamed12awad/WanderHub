import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { cn } from "@/lib/utils";
import { User, Palette, LayoutGrid, TableProperties, Users, ShieldCheck, LogsIcon, ClipboardCheck } from "lucide-react";
import ProfileSettings from "./settings/ProfileSettings";
import AppearanceSettings from "./settings/AppearanceSettings";
import ModulesSettings from "./settings/ModulesSettings";
import FieldsSettings from "./settings/FieldsSettings";
import ApprovalsSettings from "./settings/ApprovalsSettings";
import { Tasks } from "@/pages/Tasks";
import { Logs } from "@/components/Logs/Logs";
import { Roles } from "@/components/Roles/Roles";



interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

export default function Settings() {
  const { tr } = useLanguage();
  const { user } = useAuth();
  const s = tr.settings;
  const isAdmin = ["admin", "super admin"].includes(user?.role ?? "");

  const personalItems: NavItem[] = [
    { to: "profile", icon: User, label: s.profile },
    { to: "appearance", icon: Palette, label: s.appearance },
  ];

  const workspaceItems: NavItem[] = [
    { to: "modules", icon: LayoutGrid, label: s.modules },
    { to: "fields", icon: TableProperties, label: s.fields },
  ];

  const adminItems: NavItem[] = [
    { to: "users", icon: Users, label: tr.nav.users },
    { to: "roles", icon: ShieldCheck, label: tr.nav.roles },
    { to: "approvals", icon: ClipboardCheck, label: "Approvals" },
    { to: "logs", icon: LogsIcon, label: tr.nav.logs },
  ];

  return (
    <div className="flex h-full">
      {/* Settings sub-navigation */}
      <aside className="hidden sm:flex flex-col w-52 shrink-0 border-e bg-white dark:bg-[hsl(var(--sidebar-bg))] overflow-y-auto">
        <div className="px-4 py-5 border-b">
          <h1 className="text-sm font-bold text-foreground">{s.title}</h1>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-4">
          <NavSection label={s.personal} items={personalItems} />
          <NavSection label={s.workspace} items={workspaceItems} />
          {isAdmin && <NavSection label={tr.nav.roles.replace(/.*/, "Admin")} items={adminItems} external />}
        </nav>
      </aside>

      {/* Mobile: horizontal tab strip */}
      <div className="sm:hidden flex border-b overflow-x-auto bg-white dark:bg-card px-2 gap-0.5 shrink-0 absolute top-[60px] start-0 end-0 z-10">
        {[...personalItems, ...workspaceItems].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Content area */}
      <main className="flex-1 overflow-auto sm:pt-0 pt-10 bg-[#f5f6fa] dark:bg-background">
        <Routes>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="modules" element={<ModulesSettings />} />
          <Route path="fields" element={<FieldsSettings />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="logs" element={<Logs />} />
          <Route path="roles" element={<Roles />} />
          <Route path="approvals" element={<ApprovalsSettings />} />


        </Routes>
      </main>
    </div>
  );
}

function NavSection({
  label, items, external,
}: {
  label: string;
  items: { to: string; icon: React.ElementType; label: string }[];
  external?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
        {label}
      </p>
      {items.map(({ to, icon: Icon, label: itemLabel }) =>
        external ? (
          <a
            key={to}
            href={to}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {itemLabel}
          </a>
        ) : (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {itemLabel}
          </NavLink>
        )
      )}
    </div>
  );
}
