import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LineItemsTable, { type LineItemRow } from "../LineItemsTable";

/**
 * The grid renders inside the document's <form>, so before this fix Enter in
 * any cell submitted the whole invoice — losing the line still being typed.
 * It happened on all five documents that embed this grid: invoice, quote,
 * purchase order, vendor bill and sales order.
 */
const items: LineItemRow[] = [
  { description: "Consulting", quantity: 2, unitPrice: 100, discount: 0, taxRate: 0 },
  { description: "Hosting", quantity: 1, unitPrice: 50, discount: 0, taxRate: 0 },
];

function renderGrid(rows: LineItemRow[], onChange = vi.fn(), onSubmit = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <form onSubmit={onSubmit}>
            <LineItemsTable items={rows} onChange={onChange} currency="USD" />
          </form>
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { onChange, onSubmit };
}

const cell = (row: number, col: string) =>
  document.querySelector<HTMLInputElement>(`[data-row="${row}"][data-col="${col}"]`)!;

describe("LineItemsTable — keyboard entry", () => {
  /**
   * Asserted through preventDefault rather than through onSubmit: jsdom does
   * not implement implicit form submission on Enter, so an onSubmit assertion
   * would pass whether or not the handler exists. preventDefault is the actual
   * mechanism that stops the browser submitting, so it is what gets pinned.
   */
  it("cancels the Enter keypress that would otherwise submit the document", () => {
    renderGrid(items);

    const notPrevented = fireEvent.keyDown(cell(0, "quantity"), { key: "Enter" });

    expect(notPrevented).toBe(false);
  });

  it("moves to the same column of the next row", () => {
    renderGrid(items);
    const target = cell(0, "unitPrice");
    target.focus();

    fireEvent.keyDown(target, { key: "Enter" });

    expect(document.activeElement).toBe(cell(1, "unitPrice"));
  });

  it("adds a row when Enter is pressed on the last one", () => {
    const { onChange } = renderGrid(items);

    fireEvent.keyDown(cell(1, "description"), { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as LineItemRow[];
    expect(next).toHaveLength(3);
    expect(next[2]).toMatchObject({ description: "", quantity: 1 });
    // The first two lines must survive untouched.
    expect(next.slice(0, 2)).toEqual(items);
  });

  it("leaves other keys alone so normal typing still works", () => {
    const { onChange, onSubmit } = renderGrid(items);

    fireEvent.keyDown(cell(0, "description"), { key: "a" });

    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("gives every cell an accessible name that identifies its line", () => {
    renderGrid(items);
    expect(screen.getByLabelText(/2$/, { selector: '[data-col="description"]' })).toBeInTheDocument();
  });
});
