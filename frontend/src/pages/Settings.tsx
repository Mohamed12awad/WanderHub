import { Routes, Route, Navigate, NavLink, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { cn } from "@/lib/utils";
import {
  User, Palette, LayoutGrid, TableProperties, Users, ShieldCheck,
  LogsIcon, ClipboardCheck, Landmark, ChevronLeft, Settings2,
} from "lucide-react";
import ProfileSettings from "./settings/ProfileSettings";
import AppearanceSettings from "./settings/AppearanceSettings";
import ModulesSettings from "./settings/ModulesSettings";
import FieldsSettings from "./settings/FieldsSettings";
import ApprovalsSettings from "./settings/ApprovalsSettings";
import AccountsSettings from "./settings/AccountsSettings";
import { Tasks } from "@/pages/Tasks";
import { Logs } from "@/components/Logs/Logs";
import { Roles } from "@/components/Roles/Roles";
import { Users as UsersPage } from "@/components/Users/Users";

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
    { to: "users",     icon: Users,          label: tr.nav.users },
    { to: "roles",     icon: ShieldCheck,    label: tr.nav.roles },
    { to: "approvals", icon: ClipboardCheck, label: "Approvals" },
    { to: "accounts",  icon: Landmark,       label: "Accounts" },
    { to: "logs",      icon: LogsIcon,       label: tr.nav.logs },
  ];

  return (
    <div className="flex h-full">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden sm:flex flex-col w-56 shrink-0 border-e border-border bg-white dark:bg-card overflow-y-auto">

        {/* Header */}
        <div className="px-4 pt-5 pb-4 border-b border-border">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-sm font-semibold text-foreground leading-tight">{s.title}</h1>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavSection label={s.personal} items={personalItems} />

          <div className="pt-3">
            <NavSection label={s.workspace} items={workspaceItems} />
          </div>

          {isAdmin && (
            <div className="pt-3">
              <NavSection label="Admin" items={adminItems} />
            </div>
          )}
        </nav>
      </aside>

      {/* ── Mobile: horizontal tab strip ── */}
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

      {/* ── Content area ── */}
      <main className="flex-1 overflow-auto sm:pt-0 pt-10 bg-muted/40 dark:bg-background">
        <Routes>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile"    element={<ProfileSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="modules"    element={<ModulesSettings />} />
          <Route path="fields"     element={<FieldsSettings />} />
          <Route path="tasks"      element={<Tasks />} />
          <Route path="logs"       element={<Logs />} />
          <Route path="roles"      element={<Roles />} />
          <Route path="users"      element={<UsersPage />} />
          <Route path="approvals"  element={<ApprovalsSettings />} />
          <Route path="accounts"   element={<AccountsSettings />} />
        </Routes>
      </main>
    </div>
  );
}

function NavSection({
  label,
  items,
}: {
  label: string;
  items: NavItem[];
}) {
  return (
    <div>
      <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map(({ to, icon: Icon, label: itemLabel }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/65 hover:bg-muted hover:text-foreground"
              )
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 inset-y-2 w-[3px] rounded-full bg-primary" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-foreground/50")} />
                {itemLabel}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
