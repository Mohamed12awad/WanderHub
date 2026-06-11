import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModulesProvider } from "@/contexts/ModulesContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Protected } from "@/components/common/Protected";
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

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard"                    element={<Dashboard />} />
      <Route path="/customers"                    element={<Protected permission="contacts:view"><Customers /></Protected>} />
      <Route path="/customers/add"                element={<Protected permission="contacts:create"><AddCustomer /></Protected>} />
      <Route path="/customers/:id"                element={<Protected permission="contacts:view"><ViewCustomer /></Protected>} />
      <Route path="/customers/:id/edit"           element={<Protected permission="contacts:edit"><EditCustomer /></Protected>} />
      <Route path="/users"                        element={<Protected permission="users:view"><Users /></Protected>} />
      <Route path="/users/add"                    element={<Protected permission="users:create"><AddUser /></Protected>} />
      <Route path="/users/:id/edit"               element={<Protected permission="users:edit"><EditUser /></Protected>} />
      <Route path="/deals"                        element={<Protected permission="deals:view"><Deals /></Protected>} />
      <Route path="/deals/add"                    element={<Protected permission="deals:create"><AddDeal /></Protected>} />
      <Route path="/deals/:id"                    element={<Protected permission="deals:view"><ViewDeal /></Protected>} />
      <Route path="/deals/:id/edit"               element={<Protected permission="deals:edit"><EditDeal /></Protected>} />
      <Route path="/products"                     element={<Protected permission="products:view"><Products /></Protected>} />
      <Route path="/products/add"                 element={<Protected permission="products:create"><AddProduct /></Protected>} />
      <Route path="/products/:id"                 element={<Protected permission="products:view"><ViewProduct /></Protected>} />
      <Route path="/products/:id/edit"            element={<Protected permission="products:edit"><EditProduct /></Protected>} />
      <Route path="/inventory"                    element={<Protected permission="products:view"><Inventory /></Protected>} />
      <Route path="/expenses"                     element={<Protected permission="expenses:view"><Expenses /></Protected>} />
      <Route path="/expenses/add"                 element={<Protected permission="expenses:create"><AddExpenseReport /></Protected>} />
      <Route path="/expenses/:id"                 element={<Protected permission="expenses:view"><ViewExpense /></Protected>} />
      <Route path="/expenses/:id/edit"            element={<Protected permission="expenses:edit"><EditExpenseReport /></Protected>} />
      <Route path="/reports"                      element={<Protected permission="reports:view"><Reports /></Protected>} />
      <Route path="/pipeline"                     element={<Protected permission="deals:view"><Pipeline /></Protected>} />
      <Route path="/calendar"                     element={<Protected permission="activities:view"><ActivityCalendar /></Protected>} />
      <Route path="/activities"                   element={<Protected permission="activities:view"><ActivitiesPage /></Protected>} />
      <Route path="/tasks"                        element={<Protected permission="tasks:view"><Tasks /></Protected>} />
      <Route path="/logs"                         element={<Protected permission="logs:view"><Logs /></Protected>} />
      <Route path="/roles"                        element={<Protected permission="roles:view"><Roles /></Protected>} />
      <Route path="/settings/*"                   element={<Settings />} />
      <Route path="/finance/quotes"               element={<Protected permission="quotes:view"><QuotesPage /></Protected>} />
      <Route path="/finance/invoices"             element={<Protected permission="invoices:view"><InvoicesPage /></Protected>} />
      <Route path="/finance/quotes/new"           element={<Protected permission="quotes:create"><QuoteForm /></Protected>} />
      <Route path="/finance/quotes/:id"           element={<Protected permission="quotes:view"><QuoteDetail /></Protected>} />
      <Route path="/finance/quotes/:id/edit"      element={<Protected permission="quotes:edit"><QuoteForm /></Protected>} />
      <Route path="/finance/invoices/new"         element={<Protected permission="invoices:create"><InvoiceForm /></Protected>} />
      <Route path="/finance/invoices/:id"         element={<Protected permission="invoices:view"><InvoiceDetail /></Protected>} />
      <Route path="/finance/invoices/:id/edit"    element={<Protected permission="invoices:edit"><InvoiceForm /></Protected>} />
      <Route path="/finance/payments"             element={<Protected permission="invoices:view"><Payments /></Protected>} />
      <Route path="/leads"                        element={<Protected permission="leads:view"><LeadsPage /></Protected>} />
      <Route path="/leads/add"                    element={<Protected permission="leads:create"><AddLead /></Protected>} />
      <Route path="/leads/:id"                    element={<Protected permission="leads:view"><ViewLead /></Protected>} />
      <Route path="/leads/:id/edit"               element={<Protected permission="leads:edit"><EditLead /></Protected>} />

      {/* Procurement */}
      <Route path="/procurement/suppliers"               element={<Protected permission="suppliers:view"><SuppliersPage /></Protected>} />
      <Route path="/procurement/suppliers/add"            element={<Protected permission="suppliers:create"><AddSupplier /></Protected>} />
      <Route path="/procurement/suppliers/:id"            element={<Protected permission="suppliers:view"><ViewSupplier /></Protected>} />
      <Route path="/procurement/suppliers/:id/edit"       element={<Protected permission="suppliers:edit"><EditSupplier /></Protected>} />
      <Route path="/procurement/purchase-orders"          element={<Protected permission="purchase-orders:view"><PurchaseOrdersPage /></Protected>} />
      <Route path="/procurement/purchase-orders/new"      element={<Protected permission="purchase-orders:create"><AddPurchaseOrder /></Protected>} />
      <Route path="/procurement/purchase-orders/:id"      element={<Protected permission="purchase-orders:view"><ViewPurchaseOrder /></Protected>} />
      <Route path="/procurement/purchase-orders/:id/edit" element={<Protected permission="purchase-orders:edit"><EditPurchaseOrder /></Protected>} />
      <Route path="/procurement/bills"                    element={<Protected permission="vendor-bills:view"><VendorBillsPage /></Protected>} />
      <Route path="/procurement/bills/new"                element={<Protected permission="vendor-bills:create"><AddVendorBill /></Protected>} />
      <Route path="/procurement/bills/:id"                element={<Protected permission="vendor-bills:view"><ViewVendorBill /></Protected>} />
      <Route path="/procurement/bills/:id/edit"           element={<Protected permission="vendor-bills:edit"><EditVendorBill /></Protected>} />
      <Route path="/procurement/vendor-payments"          element={<Protected permission="vendor-bills:view"><VendorPaymentsPage /></Protected>} />

      {/* Sales Orders */}
      <Route path="/sales-orders"          element={<Protected permission="sales-orders:view"><SalesOrdersPage /></Protected>} />
      <Route path="/sales-orders/new"      element={<Protected permission="sales-orders:create"><SalesOrderForm mode="add" /></Protected>} />
      <Route path="/sales-orders/:id"      element={<Protected permission="sales-orders:view"><ViewSalesOrder /></Protected>} />
      <Route path="/sales-orders/:id/edit" element={<Protected permission="sales-orders:edit"><SalesOrderForm mode="edit" /></Protected>} />

      {/* Projects */}
      <Route path="/projects"          element={<Protected permission="projects:view"><ProjectsPage /></Protected>} />
      <Route path="/projects/board"    element={<Protected permission="projects:view"><ProjectsBoard /></Protected>} />
      <Route path="/projects/new"      element={<Protected permission="projects:create"><AddProject /></Protected>} />
      <Route path="/projects/:id"      element={<Protected permission="projects:view"><ViewProject /></Protected>} />
      <Route path="/projects/:id/edit" element={<Protected permission="projects:edit"><EditProject /></Protected>} />

      <Route path="*"                             element={<NotFound />} />
    </Routes>
  </Suspense>
);

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
          <AppRoutes />
        </ErrorBoundary>
      </main>
    </div>
  );
};

const DefaultLayout: React.FC = () => (
  <ModulesProvider>
    <SidebarProvider>
      <MainLayout />
    </SidebarProvider>
  </ModulesProvider>
);

export default DefaultLayout;
