import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

// Smoke test that the RTL + jsdom harness renders components.
describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Low stock</Badge>);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("applies the destructive variant class", () => {
    render(<Badge variant="destructive">Rejected</Badge>);
    expect(screen.getByText("Rejected").className).toContain("destructive");
  });
});
