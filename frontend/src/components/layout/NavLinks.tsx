import React from "react";
import { useLocation } from "react-router-dom";
import NavItem from "./NavItem";
import {
  Users2,
  Handshake,
  WalletCards,
  LayoutDashboard,
  Package,
  Banknote,
  KanbanSquare,
  CalendarDays,
  CheckSquare,
  FileText,
  Receipt,
  CreditCard,
  UserSearch,
  ShoppingCart,
  Briefcase,
  Truck,
  ClipboardList,
  HandCoins,
  ListChecks,
  Boxes,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModules } from "@/contexts/ModulesContext";
import { useSidebar } from "@/contexts/SidebarContext";

const NavSection: React.FC<{ label: string }> = ({ label }) => {
  const { collapsed } = useSidebar();
  if (collapsed)
    return <div className="pt-3 border-t border-white/[0.06] mx-2" />;
  return (
    <div className="pt-4 pb-1 px-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
        {label}
      </p>
    </div>
  );
};

function NavLinks() {
  const { user } = useAuth();
  const { tr, lang } = useLanguage();
  const { modules } = useModules();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isAdminOrAbove = ["admin", "manager", "super admin"].includes(
    user!.role,
  );

  // Mirror the backend PermissionGuard: "*" grants everything, and a scoped
  // grant (e.g. "deals:view:own") satisfies the broader "deals:view".
  const perms: string[] = user?.permissions ?? [];
  const can = (p: string) =>
    perms.includes("*") || perms.some((x) => x === p || x.startsWith(`${p}:`));

  // A link shows only when its module is enabled AND the user can view it, so we
  // never surface a link that 403s on click.
  const showLeads = modules.leads && can("leads:view");
  const showContacts = modules.customers && can("contacts:view");
  const showDeals = modules.deals && can("deals:view");
  const showPipeline = modules.pipeline && can("deals:view");
  const showQuotes = modules.quotes && can("quotes:view");
  const showInvoices = modules.invoices && can("invoices:view");
  const showSalesOrders = modules.salesOrders && can("sales-orders:view");
  const showSuppliers = modules.suppliers && can("suppliers:view");
  const showPurchaseOrders = modules.purchaseOrders && can("purchase-orders:view");
  const showVendorBills = modules.vendorBills && can("vendor-bills:view");
  const showExpenses = modules.expenses && can("expenses:view");
  const showTasks = modules.tasks && can("tasks:view");
  const showProjects = modules.projects && can("projects:view");
  const showCalendar = modules.calendar && can("activities:view");
  const showProducts =
    isAdminOrAbove && modules.products && can("products:view");
  const showReports = modules.reports && can("reports:view");

  const hasCRM = showLeads || showContacts || showDeals || showPipeline;
  const hasSales = showQuotes || showInvoices || showSalesOrders; // money IN: quotes → sales orders → invoices → payments
  const hasPurchases = showSuppliers || showPurchaseOrders || showVendorBills || showExpenses; // money OUT: POs → bills → expenses
  const hasWork = showTasks || showProjects || showCalendar;
  const hasCatalog = showProducts || showReports;

  return (
    <div className="space-y-0.5">
      {/* ── Dashboard ── */}
      <NavItem
        href="/dashboard"
        icon={LayoutDashboard}
        label={tr.nav.dashboard}
        active={isActive("/dashboard")}
      />
      {showReports && (
        <NavItem
          href="/reports"
          icon={WalletCards}
          label={tr.nav.reports}
          active={isActive("/reports")}
        />
      )}

      {/* ── CRM: leads → contacts → deals → pipeline ── */}
      {hasCRM && <NavSection label={lang === "ar" ? "إدارة العملاء" : "CRM"} />}
      {showLeads && (
        <NavItem
          href="/leads"
          icon={UserSearch}
          label={tr.nav.leads}
          active={isActive("/leads")}
        />
      )}
      {showContacts && (
        <NavItem
          href="/customers"
          icon={Users2}
          label={tr.nav.contacts}
          active={isActive("/customers")}
        />
      )}
      {showDeals && (
        <NavItem
          href="/deals"
          icon={Handshake}
          label={tr.nav.deals}
          active={isActive("/deals")}
        />
      )}
      {showPipeline && (
        <NavItem
          href="/pipeline"
          icon={KanbanSquare}
          label={tr.nav.pipeline}
          active={isActive("/pipeline")}
        />
      )}

      {/* ── Sales (money IN): quotes → invoices → payments received ── */}
      {hasSales && <NavSection label={lang === "ar" ? "مبيعات" : "Sales"} />}
      {showQuotes && (
        <NavItem
          href="/finance/quotes"
          icon={FileText}
          label={tr.nav.quotes}
          active={isActive("/finance/quotes")}
        />
      )}
      {showSalesOrders && (
        <NavItem
          href="/sales-orders"
          icon={ClipboardCheck}
          label={tr.nav.salesOrders || "Sales Orders"}
          active={isActive("/sales-orders")}
        />
      )}
      {showInvoices && (
        <>
          <NavItem
            href="/finance/invoices"
            icon={Receipt}
            label={tr.nav.invoices}
            active={isActive("/finance/invoices")}
          />
          <NavItem
            href="/finance/payments"
            icon={CreditCard}
            label={tr.nav.payments}
            active={isActive("/finance/payments")}
          />
        </>
      )}

      {/* ── Purchases (money OUT): suppliers → POs → bills → vendor payments → expenses ── */}
      {hasPurchases && (
        <NavSection label={lang === "ar" ? "مشتريات" : "Purchases"} />
      )}
      {showSuppliers && (
        <NavItem
          href="/procurement/suppliers"
          icon={Truck}
          label={tr.nav.suppliers || "Suppliers"}
          active={isActive("/procurement/suppliers")}
        />
      )}
      {showPurchaseOrders && (
        <NavItem
          href="/procurement/purchase-orders"
          icon={ShoppingCart}
          label={tr.nav.purchaseOrders || "Purchase Orders"}
          active={isActive("/procurement/purchase-orders")}
        />
      )}
      {showVendorBills && (
        <>
          <NavItem
            href="/procurement/bills"
            icon={ClipboardList}
            label={tr.nav.bills || "Vendor Bills"}
            active={isActive("/procurement/bills")}
          />
          <NavItem
            href="/procurement/vendor-payments"
            icon={HandCoins}
            label={tr.nav.vendorPayments || "Vendor Payments"}
            active={isActive("/procurement/vendor-payments")}
          />
        </>
      )}
      {showExpenses && (
        <NavItem
          href="/expenses"
          icon={Banknote}
          label={tr.nav.expenses}
          active={isActive("/expenses")}
        />
      )}

      {/* ── Work: tasks → projects → calendar ── */}
      {hasWork && <NavSection label={lang === "ar" ? "العمل" : "Work"} />}
      {showTasks && (
        <NavItem
          href="/tasks"
          icon={CheckSquare}
          label={tr.nav.tasks}
          active={isActive("/tasks")}
        />
      )}
      {showProjects && (
        <NavItem
          href="/projects"
          icon={Briefcase}
          label={tr.nav.projects || "Projects"}
          active={isActive("/projects")}
        />
      )}
      {showCalendar && (
        <NavItem
          href="/calendar"
          icon={CalendarDays}
          label={tr.nav.calendar}
          active={isActive("/calendar")}
        />
      )}
      {showCalendar && (
        <NavItem
          href="/activities"
          icon={ListChecks}
          label="Activities"
          active={isActive("/activities")}
        />
      )}

      {/* ── Catalog: products → reports ── */}
      {hasCatalog && (
        <NavSection label={lang === "ar" ? "الكتالوج" : "Catalog"} />
      )}
      {showProducts && (
        <NavItem
          href="/products"
          icon={Package}
          label={tr.nav.products}
          active={isActive("/products")}
        />
      )}
      {showProducts && (
        <NavItem
          href="/inventory"
          icon={Boxes}
          label="Inventory"
          active={isActive("/inventory")}
        />
      )}
    </div>
  );
}

export default NavLinks;
