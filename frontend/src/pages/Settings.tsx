import { Routes, Route, Navigate, NavLink, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/authContext";
import { Protected } from "@/components/common/Protected";
import { cn } from "@/lib/utils";
import {
  User, Palette, LayoutGrid, TableProperties, Users, ShieldCheck,
  LogsIcon, ClipboardCheck, Landmark, ChevronLeft, Settings2, Building2, Coins,
  KeyRound, Bell, GitBranch, ListOrdered, FileText, Percent, Mail,
  Lock, Download, AlertTriangle, Tag, Plug, Sparkles, BookText, Boxes,
  Network,
} from "lucide-react";
import ProfileSettings from "./settings/ProfileSettings";
import AppearanceSettings from "./settings/AppearanceSettings";
import ModulesSettings from "./settings/ModulesSettings";
import FieldsSettings from "./settings/FieldsSettings";
import ApprovalsSettings from "./settings/ApprovalsSettings";
import AccountsSettings from "./settings/AccountsSettings";
import AccountStatement from "./settings/AccountStatement";
import OrganizationSettings from "./settings/OrganizationSettings";
import ExchangeRatesSettings from "./settings/ExchangeRatesSettings";
import SecuritySettings from "./settings/SecuritySettings";
import NotificationsSettings from "./settings/NotificationsSettings";
import PipelineStagesSettings from "./settings/PipelineStagesSettings";
import CategoriesSettings from "./settings/CategoriesSettings";
import ProductCategoriesSettings from "./settings/ProductCategoriesSettings";
import NumberSequencesSettings from "./settings/NumberSequencesSettings";
import TaxRatesSettings from "./settings/TaxRatesSettings";
import CostCentersSettings from "./settings/CostCentersSettings";
import GlMappingSettings from "./settings/GlMappingSettings";
import InvoiceDefaultsSettings from "./settings/InvoiceDefaultsSettings";
import EmailConfigSettings from "./settings/EmailConfigSettings";
import PasswordPolicySettings from "./settings/PasswordPolicySettings";
import DataExportSettings from "./settings/DataExportSettings";
import DangerZoneSettings from "./settings/DangerZoneSettings";
import ApiKeysSettings from "./settings/ApiKeysSettings";
import AiSettings from "./settings/AiSettings";
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
  const isAdmin = (user?.permissions ?? []).some((p) => p === '*' || p === 'users:view' || p === 'settings:manage');

  const personalItems: NavItem[] = [
    { to: "/settings/profile",       icon: User,     label: s.profile },
    { to: "/settings/security",      icon: KeyRound, label: "Security" },
    { to: "/settings/appearance",    icon: Palette,  label: s.appearance },
    { to: "/settings/notifications", icon: Bell,     label: "Notifications" },
  ];

  const workspaceItems: NavItem[] = [
    { to: "/settings/organization",   icon: Building2, label: "Organization" },
    { to: "/settings/exchange-rates", icon: Coins,     label: "Exchange Rates" },
    { to: "/settings/modules",        icon: LayoutGrid, label: s.modules },
  ];

  const dataItems: NavItem[] = [
    { to: "/settings/fields",           icon: TableProperties, label: s.fields },
    { to: "/settings/pipeline-stages",  icon: GitBranch,       label: "Pipeline Stages" },
    { to: "/settings/categories",       icon: Tag,             label: "Categories" },
    { to: "/settings/product-categories", icon: Boxes,         label: "Product Categories" },
    { to: "/settings/number-sequences", icon: ListOrdered,     label: "Number Sequences" },
  ];

  const financeItems: NavItem[] = [
    { to: "/settings/accounts",         icon: Landmark,       label: "Accounts" },
    { to: "/settings/cost-centers",     icon: Network,        label: "Cost Centers" },
    { to: "/settings/gl-mapping",       icon: BookText,       label: "GL / Account Mapping" },
    { to: "/settings/tax-rates",        icon: Percent,        label: "Tax Rates" },
    { to: "/settings/invoice-defaults", icon: FileText,       label: "Invoice Defaults" },
    { to: "/settings/approvals",        icon: ClipboardCheck, label: "Approvals" },
  ];

  const teamItems: NavItem[] = [
    { to: "/settings/users", icon: Users,       label: tr.nav.users },
    { to: "/settings/roles", icon: ShieldCheck, label: tr.nav.roles },
    { to: "/settings/logs",  icon: LogsIcon,    label: tr.nav.logs },
  ];

  const advancedItems: NavItem[] = [
    { to: "/settings/email-config",    icon: Mail,          label: "Email Config" },
    { to: "/settings/api-keys",        icon: Plug,          label: "API Keys" },
    { to: "/settings/ai",              icon: Sparkles,      label: "AI Assistant" },
    { to: "/settings/password-policy", icon: Lock,          label: "Password Policy" },
    { to: "/settings/data-export",     icon: Download,      label: "Data Export" },
    { to: "/settings/danger-zone",     icon: AlertTriangle, label: "Danger Zone" },
  ];

  const allNonAdminItems = [...personalItems, ...workspaceItems, ...dataItems, ...financeItems];
  const allAdminItems    = [...teamItems, ...advancedItems];

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

          <div className="pt-3">
            <NavSection label="Data" items={dataItems} />
          </div>

          <div className="pt-3">
            <NavSection label="Finance" items={financeItems} />
          </div>

          {isAdmin && (
            <>
              <div className="pt-3">
                <NavSection label="Team & Access" items={teamItems} />
              </div>
              <div className="pt-3">
                <NavSection label="Advanced" items={advancedItems} />
              </div>
            </>
          )}
        </nav>
      </aside>

      {/* ── Right column: mobile tabs + content ── */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Mobile: horizontal tab strip — all non-admin groups separated by dividers */}
        <div className="sm:hidden flex border-b overflow-x-auto bg-white dark:bg-card px-2 gap-0.5 shrink-0">
          {allNonAdminItems.map(({ to, icon: Icon, label }, idx) => {
            // Insert group separator after Personal (3 items) and Workspace (3 items)
            const prevGroup = idx > 0 ? getGroupIndex(idx - 1) : -1;
            const currGroup = getGroupIndex(idx);
            const showSep = idx > 0 && currGroup !== prevGroup;
            return (
              <div key={to} className="flex items-center">
                {showSep && <span className="w-px bg-border shrink-0 my-2 mx-0.5" />}
                <NavLink
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
              </div>
            );
          })}
          {isAdmin && allAdminItems.map(({ to, icon: Icon, label }, idx) => (
            <div key={to} className="flex items-center">
              {idx === 0 && <span className="w-px bg-border shrink-0 my-2 mx-0.5" />}
              <NavLink
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
            </div>
          ))}
        </div>

        {/* ── Content area ── */}
        <main className="flex-1 overflow-auto bg-background">
          <Routes>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            {/* Personal */}
            <Route path="profile"        element={<ProfileSettings />} />
            <Route path="security"       element={<SecuritySettings />} />
            <Route path="appearance"     element={<AppearanceSettings />} />
            <Route path="notifications"  element={<NotificationsSettings />} />
            {/* Workspace */}
            <Route path="organization"   element={<OrganizationSettings />} />
            <Route path="exchange-rates" element={<ExchangeRatesSettings />} />
            <Route path="modules"        element={<ModulesSettings />} />
            {/* Data */}
            <Route path="pipeline-stages"  element={<PipelineStagesSettings />} />
            <Route path="categories"       element={<CategoriesSettings />} />
            <Route path="product-categories" element={<Protected permission="product-categories:view"><ProductCategoriesSettings /></Protected>} />
            <Route path="number-sequences" element={<NumberSequencesSettings />} />
            {/* Finance */}
            <Route path="accounts"         element={<AccountsSettings />} />
            <Route path="accounts/:id"     element={<AccountStatement />} />
            <Route path="cost-centers"     element={<Protected permission="accounting:manage"><CostCentersSettings /></Protected>} />
            <Route path="gl-mapping"       element={<Protected permission="settings:manage"><GlMappingSettings /></Protected>} />
            <Route path="tax-rates"        element={<TaxRatesSettings />} />
            <Route path="invoice-defaults" element={<InvoiceDefaultsSettings />} />
            <Route path="approvals"        element={<ApprovalsSettings />} />
            {/* Data — workspace-level changes require manage permission */}
            <Route path="fields" element={<Protected permission="settings:manage"><FieldsSettings /></Protected>} />
            {/* Team & Access */}
            <Route path="users"  element={<Protected permission="users:view"><UsersPage /></Protected>} />
            <Route path="roles"  element={<Protected permission="roles:view"><Roles /></Protected>} />
            <Route path="logs"   element={<Protected permission="logs:view"><Logs /></Protected>} />
            {/* Advanced */}
            <Route path="email-config"    element={<Protected permission="settings:manage"><EmailConfigSettings /></Protected>} />
            <Route path="api-keys"        element={<Protected permission="settings:manage"><ApiKeysSettings /></Protected>} />
            <Route path="ai"              element={<Protected permission="settings:manage"><AiSettings /></Protected>} />
            <Route path="password-policy" element={<Protected permission="settings:manage"><PasswordPolicySettings /></Protected>} />
            <Route path="data-export"     element={<Protected permission="settings:manage"><DataExportSettings /></Protected>} />
            <Route path="danger-zone"     element={<Protected permission="settings:manage"><DangerZoneSettings /></Protected>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// Returns the group index (0=personal,1=workspace,2=data,3=finance) for a given flat index
function getGroupIndex(idx: number): number {
  // personal:4, workspace:3, data:5, finance:5
  if (idx < 4) return 0;
  if (idx < 7) return 1;
  if (idx < 12) return 2;
  return 3;
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
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
