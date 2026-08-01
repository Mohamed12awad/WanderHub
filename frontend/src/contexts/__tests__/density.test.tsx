import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GenericTable, type TableColumn } from "@/components/common/GenericTable";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { DENSITY_PAGE_SIZE, ThemeProvider } from "@/contexts/ThemeProvider";

/**
 * Rows per page defaulted to 10, which meant paging constantly through a
 * month of invoices on a screen with room for far more. Density now supplies
 * the default — but an explicit ?limit in the URL has to keep winning, or a
 * shared link would resolve to a different page of rows for each recipient.
 */
type Row = { _id: string; createdAt: string; name: string };

const nameCol: TableColumn<Row> = { id: "name", header: "Name", kind: "text", cell: (r) => r.name };

function renderTable(initialUrl = "/") {
  const fetchData = vi.fn().mockResolvedValue({ data: [{ _id: "1", createdAt: "2026-01-01", name: "Acme" }] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <LanguageProvider>
            <GenericTable<Row>
              queryKey="density-test"
              fetchData={fetchData}
              columns={[nameCol]}
              title="Test"
              description="Test table"
            />
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return fetchData;
}

describe("row density", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.density;
  });

  it("defaults an unset preference to comfortable, not the old 10", async () => {
    const fetchData = renderTable();
    await waitFor(() => expect(fetchData).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 })));
    expect(fetchData).not.toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it("pages more rows when the stored preference is compact", async () => {
    localStorage.setItem("ui-density", "compact");
    const fetchData = renderTable();
    await waitFor(() => expect(fetchData).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 })));
  });

  it("lets an explicit ?limit override the density default", async () => {
    localStorage.setItem("ui-density", "compact");
    const fetchData = renderTable("/?limit=10");
    await screen.findByText("Acme");
    expect(fetchData).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it("publishes the density on <html> so cell padding can key off it", async () => {
    localStorage.setItem("ui-density", "compact");
    renderTable();
    await waitFor(() => expect(document.documentElement.dataset.density).toBe("compact"));
  });

  it("keeps every page size inside the server's cap of 100", () => {
    for (const size of Object.values(DENSITY_PAGE_SIZE)) {
      expect(size).toBeLessThanOrEqual(100);
      expect(size).toBeGreaterThanOrEqual(10);
    }
  });
});
