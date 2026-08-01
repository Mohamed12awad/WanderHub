import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

/**
 * Guards the WCAG 2.1 AA colour contrast of the design tokens in index.css.
 *
 * Audit 2026-08 found 17 of 34 token pairs below threshold — worst was white
 * text on the green accent at 1.99:1 in dark mode. Ratios are computed from the
 * real HSL values, so a future token edit that regresses contrast fails here
 * rather than shipping.
 */

const css = readFileSync(join(__dirname, "../../index.css"), "utf8");

/** Pulls a custom property's HSL triple from a given CSS block. */
function token(selector: string, name: string): [number, number, number] {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const m = block.match(new RegExp(`--${name}:\\s*([0-9.]+)\\s+([0-9.]+)%\\s+([0-9.]+)%`));
  if (!m) throw new Error(`token --${name} not found in ${selector}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

function contrast(a: [number, number, number], b: [number, number, number]) {
  const l1 = luminance(hslToRgb(a));
  const l2 = luminance(hslToRgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const WHITE: [number, number, number] = [0, 0, 100];

describe("design token contrast (WCAG 2.1 AA)", () => {
  describe("text on surfaces — 4.5:1", () => {
    const cases: Array<[string, [number, number, number], [number, number, number]]> = [
      ["light foreground on background", token(":root", "foreground"), token(":root", "background")],
      ["light foreground on card", token(":root", "foreground"), token(":root", "card")],
      ["light muted-foreground on background", token(":root", "muted-foreground"), token(":root", "background")],
      ["light muted-foreground on muted", token(":root", "muted-foreground"), token(":root", "muted")],
      ["dark foreground on background", token(".dark {", "foreground"), token(".dark {", "background")],
      ["dark muted-foreground on card", token(".dark {", "muted-foreground"), token(".dark {", "card")],
      ["dark muted-foreground on muted", token(".dark {", "muted-foreground"), token(".dark {", "muted")],
    ];
    it.each(cases)("%s", (_name, fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("white text on primary/destructive fills — 4.5:1", () => {
    const fills: Array<[string, [number, number, number]]> = [
      ["light primary", token(":root", "primary")],
      ["dark primary", token(".dark {", "primary")],
      ["light destructive", token(":root", "destructive")],
      ["accent-green light", token(".accent-green {", "primary")],
      ["accent-green dark", token(".dark.accent-green {", "primary")],
      ["accent-red light", token(".accent-red {", "primary")],
      ["accent-red dark", token(".dark.accent-red {", "primary")],
      ["accent-purple light", token(".accent-purple {", "primary")],
      ["accent-purple dark", token(".dark.accent-purple {", "primary")],
      ["accent-orange light", token(".accent-orange {", "primary")],
      ["accent-orange dark", token(".dark.accent-orange {", "primary")],
      ["accent-teal light", token(".accent-teal {", "primary")],
      ["accent-teal dark", token(".dark.accent-teal {", "primary")],
      ["accent-rose light", token(".accent-rose {", "primary")],
      ["accent-rose dark", token(".dark.accent-rose {", "primary")],
    ];
    it.each(fills)("%s", (_name, fill) => {
      expect(contrast(WHITE, fill)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("form-control boundaries — SC 1.4.11, 3:1", () => {
    it("light --input against card", () => {
      expect(contrast(token(":root", "input"), token(":root", "card"))).toBeGreaterThanOrEqual(3);
    });
    it("dark --input against card", () => {
      expect(contrast(token(".dark {", "input"), token(".dark {", "card"))).toBeGreaterThanOrEqual(3);
    });
  });

  // Decorative dividers are not held to 3:1 (SC 1.4.11 covers UI-component
  // boundaries), but they must stay clearly visible — at the pre-audit 1.18:1
  // table row separators were invisible.
  describe("decorative borders remain visible", () => {
    it("light --border against card", () => {
      expect(contrast(token(":root", "border"), token(":root", "card"))).toBeGreaterThanOrEqual(1.5);
    });
    it("dark --border against card", () => {
      expect(contrast(token(".dark {", "border"), token(".dark {", "card"))).toBeGreaterThanOrEqual(1.5);
    });
  });
});
