import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Table, TableBody, TableCell, TableRow } from "../table";

describe("TableRow", () => {
  it("activates the click handler with click, Enter, and Space", () => {
    const onActivate = vi.fn();
    render(
      <Table>
        <TableBody>
          <TableRow onClick={onActivate}>
            <TableCell>Invoice for Birthday</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Queried as a row, not a link: TableRow deliberately keeps its implicit
    // `row` role so the table's row/column context survives for assistive tech.
    // It is made focusable and key-activatable instead.
    const row = screen.getByRole("row");
    expect(row).toHaveAttribute("tabindex", "0");

    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });

    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it("does not activate the row when an inner action is used", () => {
    const onActivate = vi.fn();
    const onEdit = vi.fn();
    render(
      <Table>
        <TableBody>
          <TableRow onClick={onActivate}>
            <TableCell>Invoice for Birthday</TableCell>
            <TableCell><button type="button" onClick={onEdit}>Edit</button></TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onActivate).not.toHaveBeenCalled();
  });
});
