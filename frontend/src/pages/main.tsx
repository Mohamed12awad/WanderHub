import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModulesProvider } from "@/contexts/ModulesContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
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

// ── Projects ──────────────────────────────────────────────────────────────────
const ProjectsPage  = lazy(() => import("@/components/Projects/Projects").then((m) => ({ default: m.Projects })));
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
      <Route path="/customers"                    element={<Customers />} />
      <Route path="/customers/add"                element={<AddCustomer />} />
      <Route path="/customers/:id"                element={<ViewCustomer />} />
      <Route path="/customers/:id/edit"           element={<EditCustomer />} />
      <Route path="/users"                        element={<Users />} />
      <Route path="/users/add"                    element={<AddUser />} />
      <Route path="/users/:id/edit"               element={<EditUser />} />
      <Route path="/deals"                        element={<Deals />} />
      <Route path="/deals/add"                    element={<AddDeal />} />
      <Route path="/deals/:id"                    element={<ViewDeal />} />
      <Route path="/deals/:id/edit"               element={<EditDeal />} />
      <Route path="/products"                     element={<Products />} />
      <Route path="/products/add"                 element={<AddProduct />} />
      <Route path="/products/:id"                 element={<ViewProduct />} />
      <Route path="/products/:id/edit"            element={<EditProduct />} />
      <Route path="/inventory"                    element={<Inventory />} />
      <Route path="/expenses"                     element={<Expenses />} />
      <Route path="/expenses/add"                 element={<AddExpenseReport />} />
      <Route path="/expenses/:id"                 element={<ViewExpense />} />
      <Route path="/expenses/:id/edit"            element={<EditExpenseReport />} />
      <Route path="/reports"                      element={<Reports />} />
      <Route path="/pipeline"                     element={<Pipeline />} />
      <Route path="/calendar"                     element={<ActivityCalendar />} />
      <Route path="/activities"                   element={<ActivitiesPage />} />
      <Route path="/tasks"                        element={<Tasks />} />
      <Route path="/logs"                         element={<Logs />} />
      <Route path="/roles"                        element={<Roles />} />
      <Route path="/settings/*"                   element={<Settings />} />
      <Route path="/finance/quotes"               element={<QuotesPage />} />
      <Route path="/finance/invoices"             element={<InvoicesPage />} />
      <Route path="/finance/quotes/new"           element={<QuoteForm />} />
      <Route path="/finance/quotes/:id"           element={<QuoteDetail />} />
      <Route path="/finance/quotes/:id/edit"      element={<QuoteForm />} />
      <Route path="/finance/invoices/new"         element={<InvoiceForm />} />
      <Route path="/finance/invoices/:id"         element={<InvoiceDetail />} />
      <Route path="/finance/invoices/:id/edit"    element={<InvoiceForm />} />
      <Route path="/finance/payments"             element={<Payments />} />
      <Route path="/leads"                        element={<LeadsPage />} />
      <Route path="/leads/add"                    element={<AddLead />} />
      <Route path="/leads/:id"                    element={<ViewLead />} />
      <Route path="/leads/:id/edit"               element={<EditLead />} />

      {/* Procurement */}
      <Route path="/procurement/suppliers"               element={<SuppliersPage />} />
      <Route path="/procurement/suppliers/add"            element={<AddSupplier />} />
      <Route path="/procurement/suppliers/:id"            element={<ViewSupplier />} />
      <Route path="/procurement/suppliers/:id/edit"       element={<EditSupplier />} />
      <Route path="/procurement/purchase-orders"          element={<PurchaseOrdersPage />} />
      <Route path="/procurement/purchase-orders/new"      element={<AddPurchaseOrder />} />
      <Route path="/procurement/purchase-orders/:id"      element={<ViewPurchaseOrder />} />
      <Route path="/procurement/purchase-orders/:id/edit" element={<EditPurchaseOrder />} />
      <Route path="/procurement/bills"                    element={<VendorBillsPage />} />
      <Route path="/procurement/bills/new"                element={<AddVendorBill />} />
      <Route path="/procurement/bills/:id"                element={<ViewVendorBill />} />
      <Route path="/procurement/bills/:id/edit"           element={<EditVendorBill />} />
      <Route path="/procurement/vendor-payments"          element={<VendorPaymentsPage />} />

      {/* Projects */}
      <Route path="/projects"          element={<ProjectsPage />} />
      <Route path="/projects/new"      element={<AddProject />} />
      <Route path="/projects/:id"      element={<ViewProject />} />
      <Route path="/projects/:id/edit" element={<EditProject />} />

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
