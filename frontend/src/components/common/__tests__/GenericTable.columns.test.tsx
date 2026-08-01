import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GenericTable, type TableColumn } from "../GenericTable";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { createSavedView, getSavedViews } from "@/utils/api";

vi.mock("@/utils/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/api")>();
  return {
    ...actual,
    getSavedViews: vi.fn().mockResolvedValue({ data: [] }),
    createSavedView: vi.fn().mockResolvedValue({ data: {} }),
  };
});

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

function renderTable(
  columns: TableColumn<Row>[],
  extra: Partial<{
    onRowClick: (item: Row) => void;
    rowClassName: (item: Row) => string | undefined;
    queryKey: string;
    module: string;
    initialEntries: string[];
  }> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { queryKey = "test", initialEntries = ["/"], ...tableProps } = extra;
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <GenericTable<Row>
            queryKey={queryKey}
            fetchData={vi.fn().mockResolvedValue({ data: rows })}
            columns={columns}
            title="Test"
            description="Test table"
            {...tableProps}
          />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const storeLayout = (order: string[], hidden: string[] = []) =>
  localStorage.setItem("ui-table-layout:test", JSON.stringify({ version: 1, order, hidden }));

describe("GenericTable — column contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("lang", "en");
    vi.mocked(getSavedViews).mockResolvedValue({ data: [] } as never);
  });

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

  it("hides a column from the header, body, and mobile labels together", async () => {
    const { container } = renderTable([nameCol, amountCol]);
    await screen.findByText("1500");

    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show Total" }));

    await waitFor(() => expect(screen.queryByRole("columnheader", { name: /Total/i })).not.toBeInTheDocument());
    expect(screen.queryByText("1500")).not.toBeInTheDocument();
    expect(container.querySelector('[data-label="Total"]')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ui-table-layout:test") ?? "{}")).toMatchObject({
      version: 1,
      order: ["name", "amount"],
      hidden: ["amount"],
    });
  });

  it("reorders headers, cells, and each cell's mobile label as one unit", async () => {
    renderTable([nameCol, amountCol]);
    await screen.findByText("Acme");

    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(screen.getByRole("button", { name: "Move Total up" }));

    const headerRow = screen.getAllByRole("row")[0];
    const headings = within(headerRow).getAllByRole("columnheader").map((heading) => heading.textContent?.trim());
    expect(headings[0]).toContain("Total");
    expect(headings[1]).toContain("Customer");

    const firstRow = screen.getByText("Acme").closest("tr")!;
    const cells = within(firstRow).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("1500");
    expect(cells[0]).toHaveAttribute("data-label", "Total");
    expect(cells[1]).toHaveTextContent("Acme");
    expect(cells[1]).toHaveAttribute("data-label", "Customer");
  });

  it("keeps a hideable:false identifier visible and disables its checkbox", async () => {
    storeLayout(["name", "amount"], ["name"]);
    renderTable([{ ...nameCol, hideable: false }, amountCol]);
    expect(await screen.findByText("Acme")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    const identifierToggle = screen.getByRole("checkbox", { name: "Customer is always shown" });
    expect(identifierToggle).toBeChecked();
    expect(identifierToggle).toBeDisabled();
    fireEvent.click(identifierToggle);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("drops unknown stored ids while retaining every known column", async () => {
    storeLayout(["removed-column", "amount", "name"], ["removed-column"]);
    renderTable([nameCol, amountCol]);
    await screen.findByText("Acme");

    const headerRow = screen.getAllByRole("row")[0];
    const headings = within(headerRow).getAllByRole("columnheader").map((heading) => heading.textContent?.trim());
    expect(headings[0]).toContain("Total");
    expect(headings[1]).toContain("Customer");
    expect(screen.getByText("1500")).toBeInTheDocument();
  });

  it("appends a column added after the stored layout was created", async () => {
    storeLayout(["name"]);
    renderTable([nameCol, amountCol]);
    await screen.findByText("Acme");

    const headerRow = screen.getAllByRole("row")[0];
    const headings = within(headerRow).getAllByRole("columnheader").map((heading) => heading.textContent?.trim());
    expect(headings[0]).toContain("Customer");
    expect(headings[1]).toContain("Total");
    expect(screen.getByText("1500")).toHaveAttribute("data-label", "Total");
  });

  it("applies an id-based English layout to Arabic column labels", async () => {
    storeLayout(["amount", "name"]);
    localStorage.setItem("lang", "ar");
    renderTable([
      { ...nameCol, header: "العميل" },
      { ...amountCol, header: "الإجمالي" },
    ]);
    await screen.findByText("Acme");

    const headerRow = screen.getAllByRole("row")[0];
    const headings = within(headerRow).getAllByRole("columnheader").map((heading) => heading.textContent?.trim());
    expect(headings[0]).toContain("الإجمالي");
    expect(headings[1]).toContain("العميل");
    expect(screen.getByText("1500")).toHaveAttribute("data-label", "الإجمالي");
  });

  it("serializes named-view layout as URL params without page or limit", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("My layout");
    renderTable([nameCol, amountCol], {
      module: "test-module",
      initialEntries: ["/?q=acme&page=4&limit=50"],
    });
    await screen.findByText("Acme");

    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show Total" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.pointerDown(screen.getByRole("button", { name: /^Views/ }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Save current view" }));

    await waitFor(() => expect(createSavedView).toHaveBeenCalledOnce());
    const payload = vi.mocked(createSavedView).mock.calls[0][0];
    const params = new URLSearchParams(payload.query);
    expect(payload).toMatchObject({ module: "test-module", name: "My layout" });
    expect(params.get("q")).toBe("acme");
    expect(params.get("colsVersion")).toBe("1");
    expect(params.get("cols")).toBe("name,amount");
    expect(params.get("hiddenCols")).toBe("amount");
    expect(params.has("page")).toBe(false);
    expect(params.has("limit")).toBe(false);
    prompt.mockRestore();
  });

  it("applies a named view's layout and replaces the previous route state", async () => {
    storeLayout(["name", "amount"]);
    vi.mocked(getSavedViews).mockResolvedValue({
      data: [{
        id: "view-1",
        module: "test-module",
        name: "Totals only",
        query: "colsVersion=1&cols=amount%2Cname&hiddenCols=name",
        createdAt: "2026-08-01",
      }],
    } as never);
    renderTable([nameCol, amountCol], {
      module: "test-module",
      initialEntries: ["/?q=Acme&page=3"],
    });
    await screen.findByText("Acme");

    fireEvent.pointerDown(screen.getByRole("button", { name: /^Views/ }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: /Totals only/ }));

    await waitFor(() => expect(screen.queryByText("Acme")).not.toBeInTheDocument());
    expect(screen.getByText("1500")).toHaveAttribute("data-label", "Total");
    expect(screen.getByText("250")).toHaveAttribute("data-label", "Total");
    expect(screen.queryByRole("columnheader", { name: /Customer/i })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("ui-table-layout:test") ?? "{}")).toMatchObject({
      order: ["amount", "name"],
      hidden: ["name"],
    });
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

  /**
   * The deleted *Row.tsx components each supplied `cursor-pointer` themselves,
   * so migrating to `columns` silently left every clickable row looking inert.
   * TableRow now derives the affordance from `onClick`, which is the only place
   * it cannot drift away from the behaviour again.
   */
  it("makes a clickable row look and behave clickable", async () => {
    const onRowClick = vi.fn();
    renderTable([nameCol], { onRowClick });

    const row = (await screen.findByText("Acme")).closest("tr")!;
    expect(row.className).toContain("cursor-pointer");
    expect(row).toHaveAttribute("tabindex", "0");
  });

  it("leaves a non-clickable row without the pointer affordance", async () => {
    renderTable([nameCol]);
    const row = (await screen.findByText("Acme")).closest("tr")!;
    expect(row.className).not.toContain("cursor-pointer");
    expect(row).not.toHaveAttribute("tabindex");
  });

  it("applies row-level state styling once, not per cell", async () => {
    renderTable([nameCol, amountCol], { rowClassName: (r) => (r.amount > 1000 ? "opacity-50" : undefined) });

    const dimmed = (await screen.findByText("Acme")).closest("tr")!;
    const normal = (await screen.findByText("Globex")).closest("tr")!;
    expect(dimmed.className).toContain("opacity-50");
    expect(normal.className).not.toContain("opacity-50");
    // The point of the prop: the cells stay free of the conditional class.
    expect(screen.getByText("Acme").className).not.toContain("opacity-50");
  });
});
