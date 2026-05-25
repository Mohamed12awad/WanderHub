import React from "react";
import { Routes, Route } from "react-router-dom";
import { ModulesProvider } from "@/contexts/ModulesContext";

import NavBar from "@/components/layout/NavBar";
import Sidebar from "@/components/layout/Sidebar";
import { Dashboard } from "./Dashboard";

import { Customers } from "@/components/Customers/Customers";
import AddCustomer from "@/components/Customers/AddCustomers";
import EditCustomer from "@/components/Customers/EditCustomer";
import ViewCustomer from "@/components/Customers/ViewCustomer";

import { Users } from "@/components/Users/Users";
import AddUser from "@/components/Users/AddUser";
import EditUser from "@/components/Users/EditUser";

import { Deals } from "@/components/Deals/Deals";
import AddDeal from "@/components/Deals/AddDeal";
import EditDeal from "@/components/Deals/EditDeal";
import ViewDeal from "@/components/Deals/ViewDeal";

import { Products } from "@/components/Products/Products";
import AddProduct from "@/components/Products/AddProduct";
import EditProduct from "@/components/Products/EditProduct";
import ViewProduct from "@/components/Products/ViewProduct";

import { Expenses } from "@/components/Expenses/Expenses";
import AddExpenseReport from "@/components/Expenses/AddExpenses";
import EditExpenseReport from "@/components/Expenses/EditExpenses";
import ViewExpense from "@/components/Expenses/ViewExpenses";

import Reports from "@/components/Reports/Reports";
import { Pipeline } from "@/components/Pipeline/Pipeline";
import { Logs } from "@/components/Logs/Logs";
import { Roles } from "@/components/Roles/Roles";
import { ActivityCalendar } from "@/components/Activities/ActivityCalendar";
import { Tasks } from "@/pages/Tasks";
import Settings from "@/pages/Settings";
import FinancePage from "@/pages/Finance";
import QuoteForm from "@/components/Finance/QuoteForm";
import QuoteDetail from "@/components/Finance/QuoteDetail";
import InvoiceForm from "@/components/Finance/InvoiceForm";
import InvoiceDetail from "@/components/Finance/InvoiceDetail";

const routes = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/customers", element: <Customers /> },
  { path: "/customers/add", element: <AddCustomer /> },
  { path: "/customers/:id", element: <ViewCustomer /> },
  { path: "/customers/:id/edit", element: <EditCustomer /> },
  { path: "/users", element: <Users /> },
  { path: "/users/add", element: <AddUser /> },
  { path: "/users/:id/edit", element: <EditUser /> },
  { path: "/deals", element: <Deals /> },
  { path: "/deals/add", element: <AddDeal /> },
  { path: "/deals/:id", element: <ViewDeal /> },
  { path: "/deals/:id/edit", element: <EditDeal /> },
  { path: "/products", element: <Products /> },
  { path: "/products/add", element: <AddProduct /> },
  { path: "/products/:id", element: <ViewProduct /> },
  { path: "/products/:id/edit", element: <EditProduct /> },
  { path: "/expenses", element: <Expenses /> },
  { path: "/expenses/add", element: <AddExpenseReport /> },
  { path: "/expenses/:id", element: <ViewExpense /> },
  { path: "/expenses/:id/edit", element: <EditExpenseReport /> },
  { path: "/reports", element: <Reports /> },
  { path: "/pipeline", element: <Pipeline /> },
  { path: "/calendar", element: <ActivityCalendar /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "/logs", element: <Logs /> },
  { path: "/roles", element: <Roles /> },
  { path: "/settings/*", element: <Settings /> },
  { path: "/finance/quotes", element: <FinancePage /> },
  { path: "/finance/invoices", element: <FinancePage /> },
  { path: "/finance/quotes/new", element: <QuoteForm /> },
  { path: "/finance/quotes/:id", element: <QuoteDetail /> },
  { path: "/finance/quotes/:id/edit", element: <QuoteForm /> },
  { path: "/finance/invoices/new", element: <InvoiceForm /> },
  { path: "/finance/invoices/:id", element: <InvoiceDetail /> },
  { path: "/finance/invoices/:id/edit", element: <InvoiceForm /> },
];

const DefaultLayout: React.FC = () => {
  return (
    <ModulesProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] md:grid-rows-[60px_1fr] bg-[#f5f6fa] dark:bg-background">
        <Sidebar />
        <NavBar />
        <main className="overflow-auto">
          <Routes>
            {routes.map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
          </Routes>
        </main>
      </div>
    </ModulesProvider>
  );
};

export default DefaultLayout;
