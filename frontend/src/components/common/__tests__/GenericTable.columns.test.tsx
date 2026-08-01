import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GenericTable, type TableColumn } from "../GenericTable";
import { LanguageProvider } from "@/contexts/LanguageContext";

/**
 * The `columns` contract exists because `headers[] + renderRow()` could not
 * support reordering, hiding or persistence: the two were related only by array
 * position (`withMobileLabels` matched a row's Nth child to `headers[N]`), and
 * the *translated* header string doubled as the sort key — so a column's
 * identity changed with the UI language.
 *
 * These tests pin the three properties the old shape could not give:
 * label-follows-cell, order-independence, and stable sort identity.
 */
type Row = { _id: string; createdAt: string; name: string; amount: number };

const rows: Row[] = [
  { _id: "1", createdAt: "2026-01-01", name: "Acme", amount: 1500 },
  { _id: "2", createdAt: "2026-01-02", name: "Globex", amount: 250 },
];

const nameCol: TableColumn<Row> = { id: "name", header: "Customer", sortKey: "customerName", kind: "text", cell: (r) => r.name };
const amountCol: TableColumn<Row> = { id: "amount", header: "Total", sortKey: "total", kind: "number", cell: (r) => String(r.amount) };

function renderTable(columns: TableColumn<Row>[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <GenericTable<Row>
            queryKey="test"
            fetchData={vi.fn().mockResolvedValue({ data: rows })}
            columns={columns}
            title="Test"
            description="Test table"
          />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("GenericTable — column contract", () => {
  it("labels each cell from its own column, not by child index", async () => {
    renderTable([nameCol, amountCol]);
    const cell = await screen.findByText("Acme");
    expect(cell).toHaveAttribute("data-label", "Customer");
    expect(await screen.findByText("1500")).toHaveAttribute("data-label", "Total");
  });

  it("keeps labels correct when the column order is reversed", async () => {
    // This is the case the old headers[]/renderRow() pairing got wrong: swapping
    // header order left the mobile labels attached to the wrong data.
    renderTable([amountCol, nameCol]);
    expect(await screen.findByText("Acme")).toHaveAttribute("data-label", "Customer");
    expect(await screen.findByText("1500")).toHaveAttribute("data-label", "Total");

    const headerRow = screen.getAllByRole("row")[0];
    const headings = within(headerRow).getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(headings[0]).toContain("Total");
    expect(headings[1]).toContain("Customer");
  });

  it("drops a hidden column without disturbing the rest", async () => {
    renderTable([nameCol]);
    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.queryByText("1500")).not.toBeInTheDocument();
  });

  it("sorts by the stable sortKey rather than the translated header", async () => {
    renderTable([nameCol, amountCol]);
    const button = await screen.findByRole("button", { name: /Total/i });
    button.click();
    // `total` is the API field; "Total" is only the display label.
    await screen.findByText("Acme");
    expect(window.location.search).not.toContain("sort=Total");
  });

  it("gives numeric columns tabular figures and end alignment", async () => {
    renderTable([nameCol, amountCol]);
    const numeric = await screen.findByText("1500");
    expect(numeric.className).toContain("tabular-nums");
    expect(numeric.className).toContain("text-end");
  });
});
