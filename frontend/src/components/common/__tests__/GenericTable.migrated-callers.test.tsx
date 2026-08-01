import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { InvoicesPage } from "@/pages/Finance";
import Warehouses from "@/components/Inventory/Warehouses";
import CostCentersSettings from "@/pages/settings/CostCentersSettings";
import { getCostCenters, getInvoices, getInvoiceSummary, getWarehouses } from "@/utils/api";
import type { ReactElement } from "react";
import type { Invoice } from "@/types/types";

vi.mock("@/contexts/authContext", () => ({
  useAuth: () => ({ user: { _id: "user-1", permissions: [] } }),
}));

vi.mock("@/utils/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/api")>();
  return {
    ...actual,
    getCostCenters: vi.fn(),
    getInvoices: vi.fn(),
    getInvoiceSummary: vi.fn(),
    getWarehouses: vi.fn(),
  };
});

const invoice: Invoice = {
  _id: "invoice-1",
  invoiceNumber: "INV-001",
  title: "Implementation",
  customer: { _id: "customer-1", name: "Acme" },
  status: "sent",
  items: [],
  subtotal: 1234,
  taxRate: 0,
  tax: 0,
  total: 1234,
  totalPaid: 200,
  currency: "EGP",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  createdAt: "2026-08-01",
};

function renderSurface(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>{ui}</LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("migrated GenericTable callers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("lang", "en");
    vi.mocked(getInvoiceSummary).mockResolvedValue({ data: { hasInvoices: false, invoiced: [], collected: [], outstanding: [], overdue: 0 } } as never);
  });

  it("labels an invoice money cell from its Total column", async () => {
    vi.mocked(getInvoices).mockResolvedValue({ data: { data: [invoice], total: 1, page: 1, pages: 1 } } as never);

    renderSurface(<InvoicesPage />);

    const money = await screen.findByText((text) => text.includes("1,234"));
    expect(money.closest("td")).toHaveAttribute("data-label", "Total");
  });

  it("labels a warehouse status badge from its Flags column", async () => {
    vi.mocked(getWarehouses).mockResolvedValue({
      data: [{ _id: "warehouse-1", createdAt: "2026-08-01", code: "MAIN", name: "Main Warehouse", isDefault: true, isActive: true }],
    } as never);

    renderSurface(<Warehouses />);

    const badge = await screen.findByText("Default");
    expect(badge.closest("td")).toHaveAttribute("data-label", "Flags");
  });

  it("renders cost-center row actions in the trailing Actions cell", async () => {
    vi.mocked(getCostCenters).mockResolvedValue({
      data: [{ _id: "cost-center-1", createdAt: "2026-08-01", code: "CC-100", name: "Operations", isActive: true, parent: null }],
    } as never);

    renderSurface(<CostCentersSettings />);

    const edit = await screen.findByRole("button", { name: "Edit Operations" });
    expect(edit.closest("td")).toHaveAttribute("data-label", "Actions");
  });

  it("sends the invoice API sortKey instead of the translated header", async () => {
    vi.mocked(getInvoices).mockResolvedValue({ data: { data: [invoice], total: 1, page: 1, pages: 1 } } as never);

    renderSurface(<InvoicesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Total/i }));

    await waitFor(() => expect(getInvoices).toHaveBeenCalledWith(expect.objectContaining({ sort: "total", dir: "asc" })));
    expect(getInvoices).not.toHaveBeenCalledWith(expect.objectContaining({ sort: "Total" }));
  });
});
