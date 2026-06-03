import { describe, it, expect } from "vitest";
import { computeTotals, LineItemRow } from "../LineItemsTable";

const row = (r: Partial<LineItemRow>): LineItemRow => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  ...r,
});

describe("computeTotals", () => {
  it("returns zeros for no items", () => {
    expect(computeTotals([], 14)).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it("applies the document-level tax rate when no line carries its own", () => {
    const items = [row({ quantity: 2, unitPrice: 100 })]; // no taxRate
    expect(computeTotals(items, 14)).toEqual({ subtotal: 200, tax: 28, total: 228 });
  });

  it("uses per-line tax (and ignores the doc rate) when any line sets taxRate", () => {
    const items = [
      row({ quantity: 1, unitPrice: 100, taxRate: 10 }),
      row({ quantity: 1, unitPrice: 100, taxRate: 0 }),
    ];
    // tax = 100*0.10 + 100*0 = 10; doc rate 14 is ignored
    expect(computeTotals(items, 14)).toEqual({ subtotal: 200, tax: 10, total: 210 });
  });

  it("applies discount to the line net before tax", () => {
    const items = [row({ quantity: 2, unitPrice: 100, discount: 50, taxRate: 10 })];
    // net = 2*100*0.5 = 100; tax = 10
    expect(computeTotals(items, 0)).toEqual({ subtotal: 100, tax: 10, total: 110 });
  });

  it("rounds subtotal/tax/total to 2 decimals", () => {
    const items = [row({ quantity: 1, unitPrice: 33.333, taxRate: 0 })];
    const { subtotal } = computeTotals(items, 0);
    expect(subtotal).toBe(33.33);
  });
});
