import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

/**
 * Keyboard navigation for the always-editable line-item grids.
 *
 * Both grids render inside their document's <form>, so without intercepting it
 * Enter in any cell submits the whole document — saving an invoice or expense
 * with the line still half-typed. Enter instead means "next row", adding one at
 * the end, which is also how a line-item grid is expected to behave.
 *
 * Cells opt in by carrying `data-row` and `data-col`; the hook finds them by
 * query rather than by a ref matrix, so adding a column needs no wiring here.
 */
export function useGridKeyboardNav(rowCount: number, addRow: () => void) {
  const gridRef = useRef<HTMLDivElement>(null);
  // A row that does not exist yet cannot be focused until React has rendered
  // it, so the request is parked here and applied on the next commit.
  const [pendingFocus, setPendingFocus] = useState<{ row: number; col: string } | null>(null);

  const focusCell = useCallback((row: number, col: string) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-row="${row}"][data-col="${col}"]`);
    if (!el) return false;
    el.focus();
    el.select?.();
    return true;
  }, []);

  useEffect(() => {
    if (!pendingFocus) return;
    focusCell(pendingFocus.row, pendingFocus.col);
    setPendingFocus(null);
  }, [pendingFocus, focusCell]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (event.key !== "Enter" || target.tagName !== "INPUT") return;
      // A date input opens a picker on Enter in some browsers; leave it alone.
      if ((target as HTMLInputElement).type === "date") return;

      const row = Number(target.dataset.row);
      const col = target.dataset.col;
      if (!col || Number.isNaN(row)) return;

      event.preventDefault();
      if (row < rowCount - 1) {
        focusCell(row + 1, col);
        return;
      }
      addRow();
      setPendingFocus({ row: rowCount, col });
    },
    [rowCount, addRow, focusCell],
  );

  return { gridRef, onKeyDown };
}
