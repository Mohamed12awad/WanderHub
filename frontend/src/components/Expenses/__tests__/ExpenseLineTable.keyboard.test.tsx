import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ExpenseLineTable, { blankLine, type ExpenseLine } from "../ExpenseLineTable";

/**
 * Same defect as the invoice grid: this table sits inside ExpenseForm's
 * <form onSubmit>, so Enter in a cell submitted the expense mid-entry.
 */
const lines: ExpenseLine[] = [
  { ...blankLine(), description: "Taxi", amount: 40 },
  { ...blankLine(), description: "Hotel", amount: 300 },
];

function renderGrid(onChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <form onSubmit={vi.fn()}>
            <ExpenseLineTable lines={lines} onChange={onChange} />
          </form>
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return onChange;
}

const cell = (row: number, col: string) =>
  document.querySelector<HTMLInputElement>(`[data-row="${row}"][data-col="${col}"]`)!;

describe("ExpenseLineTable — keyboard entry", () => {
  it("cancels the Enter keypress that would otherwise submit the expense", () => {
    renderGrid();
    expect(fireEvent.keyDown(cell(0, "amount"), { key: "Enter" })).toBe(false);
  });

  it("moves to the same column of the next row", () => {
    renderGrid();
    const target = cell(0, "description");
    target.focus();
    fireEvent.keyDown(target, { key: "Enter" });
    expect(document.activeElement).toBe(cell(1, "description"));
  });

  it("adds a line when Enter is pressed on the last row", () => {
    const onChange = renderGrid();
    fireEvent.keyDown(cell(1, "beneficiary"), { key: "Enter" });
    expect((onChange.mock.calls[0][0] as ExpenseLine[])).toHaveLength(3);
  });

  /**
   * A date input opens its picker on Enter in several browsers. Hijacking that
   * would break the control to fix a submit that the picker already swallows.
   */
  it("leaves a date cell's own Enter behaviour alone", () => {
    renderGrid();
    const date = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(fireEvent.keyDown(date, { key: "Enter" })).toBe(true);
  });
});
