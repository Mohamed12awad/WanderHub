import React from "react";
import { useLocation } from "react-router-dom";
import NavItem from "./NavItem";
import {
  Users2, Handshake, WalletCards, LayoutDashboard,
  Package, Banknote, KanbanSquare,
  CalendarDays, CheckSquare, FileText, Receipt, CreditCard, UserSearch,
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModules } from "@/contexts/ModulesContext";
import { useSidebar } from "@/contexts/SidebarContext";

const NavSection: React.FC<{ label: string }> = ({ label }) => {
  const { collapsed } = useSidebar();
  if (collapsed) return <div className="pt-3 border-t border-white/[0.06] mx-2" />;
  return (
    <div className="pt-4 pb-1 px-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{label}</p>
    </div>
  );
};

function NavLinks() {
  const { user } = useAuth();
  const { tr, lang } = useLanguage();
  const { modules } = useModules();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isAdminOrAbove = ["admin", "manager", "super admin"].includes(user!.role);

  const hasCRM = modules.customers || modules.deals || modules.pipeline || modules.leads;
  const hasWork = modules.calendar || modules.tasks;
  const hasFinance = modules.expenses || modules.finance;
  const hasCatalog = (isAdminOrAbove && modules.products) || modules.reports;

  return (
    <div className="space-y-0.5">
      <NavItem href="/dashboard" icon={LayoutDashboard} label={tr.nav.dashboard} active={isActive("/dashboard")} />

      {/* CRM */}
      {hasCRM && <NavSection label={lang === "ar" ? "إدارة العملاء" : "CRM"} />}
      {modules.customers && (
        <NavItem href="/customers" icon={Users2} label={tr.nav.contacts} active={isActive("/customers")} />
      )}
      {modules.leads && (
        <NavItem href="/leads" icon={UserSearch} label={tr.nav.leads} active={isActive("/leads")} />
      )}
      {modules.deals && (
        <NavItem href="/deals" icon={Handshake} label={tr.nav.deals} active={isActive("/deals")} />
      )}
      {modules.pipeline && (
        <NavItem href="/pipeline" icon={KanbanSquare} label={tr.nav.pipeline} active={isActive("/pipeline")} />
      )}

      {/* Work */}
      {hasWork && <NavSection label={lang === "ar" ? "العمل" : "Work"} />}
      {modules.calendar && (
        <NavItem href="/calendar" icon={CalendarDays} label={tr.nav.calendar} active={isActive("/calendar")} />
      )}
      {modules.tasks && (
        <NavItem href="/tasks" icon={CheckSquare} label={tr.nav.tasks} active={isActive("/tasks")} />
      )}

      {/* Finance */}
      {hasFinance && <NavSection label={lang === "ar" ? "المالية" : "Finance"} />}
      {modules.expenses && (
        <NavItem href="/expenses" icon={Banknote} label={tr.nav.expenses} active={isActive("/expenses")} />
      )}
      {modules.finance && (
        <>
          <NavItem href="/finance/quotes" icon={FileText} label={tr.nav.quotes} active={isActive("/finance/quotes")} />
          <NavItem href="/finance/invoices" icon={Receipt} label={tr.nav.invoices} active={isActive("/finance/invoices")} />
          <NavItem href="/finance/payments" icon={CreditCard} label={tr.nav.payments} active={isActive("/finance/payments")} />
        </>
      )}

      {/* Catalog & Reports */}
      {hasCatalog && <NavSection label={lang === "ar" ? "الكتالوج" : "Catalog"} />}
      {isAdminOrAbove && modules.products && (
        <NavItem href="/products" icon={Package} label={tr.nav.products} active={isActive("/products")} />
      )}
      {modules.reports && (
        <NavItem href="/reports" icon={WalletCards} label={tr.nav.reports} active={isActive("/reports")} />
      )}

    </div>
  );
}

export default NavLinks;
