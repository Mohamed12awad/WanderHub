import React, { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { ModulesProvider } from "@/contexts/ModulesContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

import { AuthProvider, useAuth } from "@/contexts/authContext";
import { resolveHomeRoute } from "@/lib/resolveHomeRoute";
import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Protected } from "@/components/common/Protected";
import { SearchPalette } from "@/components/common/SearchPalette";
import LoadingSpinner from "@/components/common/spinner";
import Login from "./Login";
import NotFound from "./NotFound";

// Route-level code splitting — all pages load on demand
const Dashboard        = lazy(() => import("./Dashboard").then((m) => ({ default: m.Dashboard })));
const Customers        = lazy(() => import("@/components/Customers/Customers").then((m) => ({ default: m.Customers })));
const AddCustomer      = lazy(() => import("@/components/Customers/AddCustomers"));
const EditCustomer     = lazy(() => import("@/components/Customers/EditCustomer"));
const ViewCustomer     = lazy(() => import("@/components/Customers/ViewCustomer"));
const Users            = lazy(() => import("@/components/Users/Users").then((m) => ({ default: m.Users })));
const AddUser          = lazy(() => import("@/components/Users/AddUser"));
const EditUser         = lazy(() => import("@/components/Users/EditUser"));
const Deals            = lazy(() => import("@/components/Deals/Deals").then((m) => ({ default: m.Deals })));
const AddDeal          = lazy(() => import("@/components/Deals/AddDeal"));
const EditDeal         = lazy(() => import("@/components/Deals/EditDeal"));
const ViewDeal         = lazy(() => import("@/components/Deals/ViewDeal"));
const Products         = lazy(() => import("@/components/Products/Products").then((m) => ({ default: m.Products })));
const AddProduct       = lazy(() => import("@/components/Products/AddProduct"));
const EditProduct      = lazy(() => import("@/components/Products/EditProduct"));
const ViewProduct      = lazy(() => import("@/components/Products/ViewProduct"));
const Inventory        = lazy(() => import("@/components/Inventory/Inventory").then((m) => ({ default: m.Inventory })));
const Warehouses       = lazy(() => import("@/components/Inventory/Warehouses"));
const StockTransfer    = lazy(() => import("@/components/Inventory/StockTransfer"));
const Valuation        = lazy(() => import("@/components/Inventory/Valuation"));
const Expenses         = lazy(() => import("@/components/Expenses/Expenses").then((m) => ({ default: m.Expenses })));
const AddExpenseReport = lazy(() => import("@/components/Expenses/AddExpenses"));
const EditExpenseReport = lazy(() => import("@/components/Expenses/EditExpenses"));
const ViewExpense      = lazy(() => import("@/components/Expenses/ViewExpenses"));
const Reports          = lazy(() => import("@/components/Reports/Reports"));
const Pipeline         = lazy(() => import("@/components/Pipeline/Pipeline").then((m) => ({ default: m.Pipeline })));
const Logs             = lazy(() => import("@/components/Logs/Logs").then((m) => ({ default: m.Logs })));
const Roles            = lazy(() => import("@/components/Roles/Roles").then((m) => ({ default: m.Roles })));
const ActivityCalendar = lazy(() => import("@/components/Activities/ActivityCalendar").then((m) => ({ default: m.ActivityCalendar })));
const ActivitiesPage   = lazy(() => import("@/pages/ActivitiesPage").then((m) => ({ default: m.ActivitiesPage })));
const Tasks            = lazy(() => import("@/pages/Tasks").then((m) => ({ default: m.Tasks })));
const Settings         = lazy(() => import("@/pages/Settings"));
const Onboarding       = lazy(() => import("@/pages/Onboarding"));
const QuotesPage       = lazy(() => import("@/pages/Finance").then((m) => ({ default: m.QuotesPage })));
const InvoicesPage     = lazy(() => import("@/pages/Finance").then((m) => ({ default: m.InvoicesPage })));
const QuoteForm        = lazy(() => import("@/components/Finance/QuoteForm"));
const QuoteDetail      = lazy(() => import("@/components/Finance/QuoteDetail"));
const InvoiceForm      = lazy(() => import("@/components/Finance/InvoiceForm"));
const InvoiceDetail    = lazy(() => import("@/components/Finance/InvoiceDetail"));
const Payments         = lazy(() => import("@/pages/Payments"));
const LeadsPage        = lazy(() => import("@/components/Leads/Leads").then((m) => ({ default: m.Leads })));
const AddLead          = lazy(() => import("@/components/Leads/AddLead").then((m) => ({ default: m.AddLead })));
const EditLead         = lazy(() => import("@/components/Leads/EditLead").then((m) => ({ default: m.EditLead })));
const ViewLead         = lazy(() => import("@/components/Leads/ViewLead").then((m) => ({ default: m.ViewLead })));

// ── Procurement ───────────────────────────────────────────────────────────────
const SuppliersPage      = lazy(() => import("@/components/Procurement/Suppliers/Suppliers"));
const AddSupplier        = lazy(() => import("@/components/Procurement/Suppliers/SupplierForm").then((m) => ({ default: () => m.default({ mode: "add" }) })));
const EditSupplier       = lazy(() => import("@/components/Procurement/Suppliers/SupplierForm").then((m) => ({ default: () => m.default({ mode: "edit" }) })));
const ViewSupplier       = lazy(() => import("@/components/Procurement/Suppliers/ViewSupplier"));
const PurchaseOrdersPage = lazy(() => import("@/components/Procurement/PurchaseOrders/PurchaseOrders"));
const AddPurchaseOrder   = lazy(() => import("@/components/Procurement/PurchaseOrders/PurchaseOrderForm").then((m) => ({ default: () => m.default({ mode: "add" }) })));
const EditPurchaseOrder  = lazy(() => import("@/components/Procurement/PurchaseOrders/PurchaseOrderForm").then((m) => ({ default: () => m.default({ mode: "edit" }) })));
const ViewPurchaseOrder  = lazy(() => import("@/components/Procurement/PurchaseOrders/ViewPurchaseOrder"));
const VendorBillsPage    = lazy(() => import("@/components/Procurement/VendorBills/VendorBills").then((m) => ({ default: m.VendorBills })));
const AddVendorBill      = lazy(() => import("@/components/Procurement/VendorBills/VendorBillForm").then((m) => ({ default: () => m.default({ mode: "add" }) })));
const EditVendorBill     = lazy(() => import("@/components/Procurement/VendorBills/VendorBillForm").then((m) => ({ default: () => m.default({ mode: "edit" }) })));
const ViewVendorBill     = lazy(() => import("@/components/Procurement/VendorBills/ViewVendorBill"));
const VendorPaymentsPage = lazy(() => import("@/components/Procurement/VendorPayments/VendorPayments").then((m) => ({ default: m.VendorPayments })));

// ── Sales Orders ──────────────────────────────────────────────────────────────
const SalesOrdersPage = lazy(() => import("@/components/SalesOrders/SalesOrders").then((m) => ({ default: m.SalesOrders })));
const SalesOrderForm  = lazy(() => import("@/components/SalesOrders/SalesOrderForm"));
const ViewSalesOrder  = lazy(() => import("@/components/SalesOrders/ViewSalesOrder"));

// ── Accounting (GL) ─────────────────────────────────────────────────────────────
const ChartOfAccounts   = lazy(() => import("@/components/Accounting/ChartOfAccounts"));
const AccountLedger     = lazy(() => import("@/components/Accounting/AccountLedger"));
const JournalEntries    = lazy(() => import("@/components/Accounting/JournalEntries"));
const JournalEntryDetail = lazy(() => import("@/components/Accounting/JournalEntryDetail"));
const TrialBalance      = lazy(() => import("@/components/Accounting/TrialBalance"));
const ProfitLoss        = lazy(() => import("@/components/Accounting/ProfitLoss"));
const BalanceSheet      = lazy(() => import("@/components/Accounting/BalanceSheet"));
const CashFlow          = lazy(() => import("@/components/Accounting/CashFlow"));
const AccountingPeriods = lazy(() => import("@/components/Accounting/Periods"));
const AccountingAudit    = lazy(() => import("@/components/Accounting/Audit"));

// ── Projects ──────────────────────────────────────────────────────────────────
const ProjectsPage  = lazy(() => import("@/components/Projects/Projects").then((m) => ({ default: m.Projects })));
const ProjectsBoard = lazy(() => import("@/components/Projects/ProjectsBoard").then((m) => ({ default: m.ProjectsBoard })));
const AddProject    = lazy(() => import("@/components/Projects/ProjectForm").then((m) => ({ default: () => m.default({ mode: "add" }) })));
const EditProject   = lazy(() => import("@/components/Projects/ProjectForm").then((m) => ({ default: () => m.default({ mode: "edit" }) })));
const ViewProject   = lazy(() => import("@/components/Projects/ViewProject"));

const PageLoader = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/**
 * Top-level layout route. Hosts the providers that need router hooks (AuthProvider
 * uses `useNavigate`) so they live INSIDE the data router, plus the always-mounted
 * command palette. Language/Query/Theme providers wrap RouterProvider in App.tsx.
 */
const AppShell: React.FC = () => (
  <AuthProvider>
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
    <SearchPalette />
  </AuthProvider>
);

/**
 * Auth gate + first-run redirect. Provides ModulesContext to everything below
 * (the onboarding flow needs it too) and renders an <Outlet/> so onboarding can
 * appear full-screen while the rest of the app gets the sidebar/navbar chrome.
 */
const RequireAuth: React.FC = () => {
  const { isLoggedIn, loading, user } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner loading={loading} />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  // First-run: force the onboarding flow until it's completed.
  if (user && user.hasOnboarded === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return (
    <ModulesProvider>
      <Outlet />
    </ModulesProvider>
  );
};

/** The authenticated app shell (sidebar + navbar + scrollable main). */
const AppChrome: React.FC = () => (
  <SidebarProvider>
    <MainLayout />
  </SidebarProvider>
);

/** Index route → the user's configured (or first-permitted) landing page. */
const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={resolveHomeRoute(user)} replace />;
};

const MainLayout: React.FC = () => {
  const { collapsed } = useSidebar();
  return (
    <div
      className={[
        "grid min-h-screen md:h-screen w-full md:grid-rows-[60px_1fr] bg-background transition-all duration-200",
        collapsed ? "md:grid-cols-[64px_1fr]" : "md:grid-cols-[240px_1fr]",
      ].join(" ")}
    >
      <Sidebar />
      <NavBar />
      <main className="overflow-auto h-full">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        {/* Full-screen first-run flow (no sidebar/navbar) */}
        <Route path="onboarding" element={<Onboarding />} />

        <Route element={<AppChrome />}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} handle={{ crumb: "Dashboard" }} />

        {/* Customers */}
        <Route path="customers" handle={{ crumb: "Contacts" }}>
          <Route index element={<Protected permission="contacts:view"><Customers /></Protected>} />
          <Route path="add" element={<Protected permission="contacts:create"><AddCustomer /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="contacts:view"><ViewCustomer /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="contacts:edit"><EditCustomer /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        {/* Users */}
        <Route path="users" handle={{ crumb: "Users" }}>
          <Route index element={<Protected permission="users:view"><Users /></Protected>} />
          <Route path="add" element={<Protected permission="users:create"><AddUser /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id/edit" element={<Protected permission="users:edit"><EditUser /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        {/* Deals */}
        <Route path="deals" handle={{ crumb: "Deals" }}>
          <Route index element={<Protected permission="deals:view"><Deals /></Protected>} />
          <Route path="add" element={<Protected permission="deals:create"><AddDeal /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="deals:view"><ViewDeal /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="deals:edit"><EditDeal /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        {/* Products */}
        <Route path="products" handle={{ crumb: "Products" }}>
          <Route index element={<Protected permission="products:view"><Products /></Protected>} />
          <Route path="add" element={<Protected permission="products:create"><AddProduct /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="products:view"><ViewProduct /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="products:edit"><EditProduct /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        {/* Inventory */}
        <Route path="inventory" handle={{ crumb: "Inventory" }}>
          <Route index element={<Protected permission="products:view"><Inventory /></Protected>} />
          <Route path="warehouses" element={<Protected permission="warehouses:view"><Warehouses /></Protected>} handle={{ crumb: "Warehouses" }} />
          <Route path="transfers" element={<Protected permission="products:edit"><StockTransfer /></Protected>} handle={{ crumb: "Transfers" }} />
          <Route path="valuation" element={<Protected permission="products:view"><Valuation /></Protected>} handle={{ crumb: "Valuation" }} />
        </Route>

        {/* Expenses */}
        <Route path="expenses" handle={{ crumb: "Expenses" }}>
          <Route index element={<Protected permission="expenses:view"><Expenses /></Protected>} />
          <Route path="add" element={<Protected permission="expenses:create"><AddExpenseReport /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="expenses:view"><ViewExpense /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="expenses:edit"><EditExpenseReport /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        <Route path="reports" element={<Protected permission="reports:view"><Reports /></Protected>} handle={{ crumb: "Reports" }} />
        <Route path="pipeline" element={<Protected permission="deals:view"><Pipeline /></Protected>} handle={{ crumb: "Pipeline" }} />
        <Route path="calendar" element={<Protected permission="activities:view"><ActivityCalendar /></Protected>} handle={{ crumb: "Calendar" }} />
        <Route path="activities" element={<Protected permission="activities:view"><ActivitiesPage /></Protected>} handle={{ crumb: "Activities" }} />
        <Route path="tasks" element={<Protected permission="tasks:view"><Tasks /></Protected>} handle={{ crumb: "Tasks" }} />
        <Route path="logs" element={<Protected permission="logs:view"><Logs /></Protected>} handle={{ crumb: "Logs" }} />
        <Route path="roles" element={<Protected permission="roles:view"><Roles /></Protected>} handle={{ crumb: "Roles" }} />
        <Route path="settings/*" element={<Settings />} handle={{ crumb: "Settings" }} />

        {/* Leads */}
        <Route path="leads" handle={{ crumb: "Leads" }}>
          <Route index element={<Protected permission="leads:view"><LeadsPage /></Protected>} />
          <Route path="add" element={<Protected permission="leads:create"><AddLead /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="leads:view"><ViewLead /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="leads:edit"><EditLead /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        {/* Finance */}
        <Route path="finance" handle={{ crumb: "Finance" }}>
          <Route index element={<Navigate to="invoices" replace />} />
          <Route path="quotes" handle={{ crumb: "Quotes" }}>
            <Route index element={<Protected permission="quotes:view"><QuotesPage /></Protected>} />
            <Route path="new" element={<Protected permission="quotes:create"><QuoteForm /></Protected>} handle={{ crumb: "New" }} />
            <Route path=":id" element={<Protected permission="quotes:view"><QuoteDetail /></Protected>} handle={{ crumb: "Details" }} />
            <Route path=":id/edit" element={<Protected permission="quotes:edit"><QuoteForm /></Protected>} handle={{ crumb: "Edit" }} />
          </Route>
          <Route path="invoices" handle={{ crumb: "Invoices" }}>
            <Route index element={<Protected permission="invoices:view"><InvoicesPage /></Protected>} />
            <Route path="new" element={<Protected permission="invoices:create"><InvoiceForm /></Protected>} handle={{ crumb: "New" }} />
            <Route path=":id" element={<Protected permission="invoices:view"><InvoiceDetail /></Protected>} handle={{ crumb: "Details" }} />
            <Route path=":id/edit" element={<Protected permission="invoices:edit"><InvoiceForm /></Protected>} handle={{ crumb: "Edit" }} />
          </Route>
          <Route path="payments" element={<Protected permission="invoices:view"><Payments /></Protected>} handle={{ crumb: "Payments" }} />
        </Route>

        {/* Procurement */}
        <Route path="procurement" handle={{ crumb: "Procurement" }}>
          <Route index element={<Navigate to="purchase-orders" replace />} />
          <Route path="suppliers" handle={{ crumb: "Suppliers" }}>
            <Route index element={<Protected permission="suppliers:view"><SuppliersPage /></Protected>} />
            <Route path="add" element={<Protected permission="suppliers:create"><AddSupplier /></Protected>} handle={{ crumb: "New" }} />
            <Route path=":id" element={<Protected permission="suppliers:view"><ViewSupplier /></Protected>} handle={{ crumb: "Details" }} />
            <Route path=":id/edit" element={<Protected permission="suppliers:edit"><EditSupplier /></Protected>} handle={{ crumb: "Edit" }} />
          </Route>
          <Route path="purchase-orders" handle={{ crumb: "Purchase Orders" }}>
            <Route index element={<Protected permission="purchase-orders:view"><PurchaseOrdersPage /></Protected>} />
            <Route path="new" element={<Protected permission="purchase-orders:create"><AddPurchaseOrder /></Protected>} handle={{ crumb: "New" }} />
            <Route path=":id" element={<Protected permission="purchase-orders:view"><ViewPurchaseOrder /></Protected>} handle={{ crumb: "Details" }} />
            <Route path=":id/edit" element={<Protected permission="purchase-orders:edit"><EditPurchaseOrder /></Protected>} handle={{ crumb: "Edit" }} />
          </Route>
          <Route path="bills" handle={{ crumb: "Vendor Bills" }}>
            <Route index element={<Protected permission="vendor-bills:view"><VendorBillsPage /></Protected>} />
            <Route path="new" element={<Protected permission="vendor-bills:create"><AddVendorBill /></Protected>} handle={{ crumb: "New" }} />
            <Route path=":id" element={<Protected permission="vendor-bills:view"><ViewVendorBill /></Protected>} handle={{ crumb: "Details" }} />
            <Route path=":id/edit" element={<Protected permission="vendor-bills:edit"><EditVendorBill /></Protected>} handle={{ crumb: "Edit" }} />
          </Route>
          <Route path="vendor-payments" element={<Protected permission="vendor-bills:view"><VendorPaymentsPage /></Protected>} handle={{ crumb: "Vendor Payments" }} />
        </Route>

        {/* Sales Orders */}
        <Route path="sales-orders" handle={{ crumb: "Sales Orders" }}>
          <Route index element={<Protected permission="sales-orders:view"><SalesOrdersPage /></Protected>} />
          <Route path="new" element={<Protected permission="sales-orders:create"><SalesOrderForm mode="add" /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="sales-orders:view"><ViewSalesOrder /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="sales-orders:edit"><SalesOrderForm mode="edit" /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        {/* Accounting (GL) */}
        <Route path="accounting" handle={{ crumb: "Accounting" }}>
          <Route index element={<Navigate to="chart-of-accounts" replace />} />
          <Route path="chart-of-accounts" handle={{ crumb: "Chart of Accounts" }}>
            <Route index element={<Protected permission="accounting:view"><ChartOfAccounts /></Protected>} />
            <Route path=":id" element={<Protected permission="accounting:view"><AccountLedger /></Protected>} handle={{ crumb: "Ledger" }} />
          </Route>
          <Route path="journal" handle={{ crumb: "Journal" }}>
            <Route index element={<Protected permission="accounting:view"><JournalEntries /></Protected>} />
            <Route path=":id" element={<Protected permission="accounting:view"><JournalEntryDetail /></Protected>} handle={{ crumb: "Entry" }} />
          </Route>
          <Route path="trial-balance" element={<Protected permission="accounting:view"><TrialBalance /></Protected>} handle={{ crumb: "Trial Balance" }} />
          <Route path="profit-loss" element={<Protected permission="accounting:view"><ProfitLoss /></Protected>} handle={{ crumb: "Profit & Loss" }} />
          <Route path="balance-sheet" element={<Protected permission="accounting:view"><BalanceSheet /></Protected>} handle={{ crumb: "Balance Sheet" }} />
          <Route path="cash-flow" element={<Protected permission="accounting:view"><CashFlow /></Protected>} handle={{ crumb: "Cash Flow" }} />
          <Route path="periods" element={<Protected permission="accounting:manage"><AccountingPeriods /></Protected>} handle={{ crumb: "Periods" }} />
          <Route path="audit" element={<Protected permission="accounting:view"><AccountingAudit /></Protected>} handle={{ crumb: "Audit" }} />
        </Route>

        {/* Projects */}
        <Route path="projects" handle={{ crumb: "Projects" }}>
          <Route index element={<Protected permission="projects:view"><ProjectsPage /></Protected>} />
          <Route path="board" element={<Protected permission="projects:view"><ProjectsBoard /></Protected>} handle={{ crumb: "Board" }} />
          <Route path="new" element={<Protected permission="projects:create"><AddProject /></Protected>} handle={{ crumb: "New" }} />
          <Route path=":id" element={<Protected permission="projects:view"><ViewProject /></Protected>} handle={{ crumb: "Details" }} />
          <Route path=":id/edit" element={<Protected permission="projects:edit"><EditProject /></Protected>} handle={{ crumb: "Edit" }} />
        </Route>

        <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Route>
  )
);
