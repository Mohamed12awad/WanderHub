import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider, useLanguage } from "../LanguageContext";
import { InvoicesPage } from "@/pages/Finance";
import type { Invoice } from "@/types/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getInvoices, getInvoiceSummary } from "@/utils/api";

vi.mock("@/contexts/authContext", () => ({
  useAuth: () => ({ user: { permissions: [] } }),
}));

vi.mock("@/utils/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/api")>();
  return {
    ...actual,
    getInvoices: vi.fn(),
    getInvoiceSummary: vi.fn(),
  };
});

const TEST_DATE = "2026-08-05T12:00:00";

function FormatterProbe() {
  const { formatDate, formatNumber } = useLanguage();
  return (
    <>
      <output data-testid="date">{formatDate(TEST_DATE)}</output>
      <output data-testid="number">{formatNumber(1234567.89)}</output>
    </>
  );
}

function renderProbe(lang: "en" | "ar") {
  localStorage.setItem("lang", lang);
  render(<LanguageProvider><FormatterProbe /></LanguageProvider>);
}

describe("locale-aware formatters", () => {
  beforeEach(() => localStorage.clear());

  it("uses Arabic-Indic dates and numbers for Arabic", () => {
    renderProbe("ar");

    expect(screen.getByTestId("date")).toHaveTextContent("٥ أغسطس ٢٠٢٦");
    expect(screen.getByTestId("number")).toHaveTextContent("١٬٢٣٤٬٥٦٧٫٨٩");
  });

  it("uses Western dates and numbers for English", () => {
    renderProbe("en");

    expect(screen.getByTestId("date")).toHaveTextContent("Aug 5, 2026");
    expect(screen.getByTestId("number")).toHaveTextContent("1,234,567.89");
  });

  it("renders an Arabic invoice date cell instead of the browser-default numeric form", async () => {
    localStorage.setItem("lang", "ar");
    const invoice: Invoice = {
      _id: "invoice-1",
      invoiceNumber: "INV-001",
      title: "فاتورة اختبار",
      customer: { _id: "customer-1", name: "عميل" },
      status: "sent",
      items: [],
      subtotal: 1234,
      taxRate: 0,
      tax: 0,
      total: 1234,
      totalPaid: 0,
      currency: "EGP",
      issueDate: TEST_DATE,
      dueDate: TEST_DATE,
      createdAt: TEST_DATE,
    };

    vi.mocked(getInvoices).mockResolvedValue({ data: { data: [invoice], total: 1, page: 1, pages: 1 } } as never);
    vi.mocked(getInvoiceSummary).mockResolvedValue({ data: { hasInvoices: false, invoiced: [], collected: [], outstanding: [], overdue: 0 } } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LanguageProvider><InvoicesPage /></LanguageProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const dateCell = await screen.findByText("٥ أغسطس ٢٠٢٦");
    expect(dateCell).toBeInTheDocument();
    expect(dateCell).not.toHaveTextContent("8/5/2026");
  });
});
