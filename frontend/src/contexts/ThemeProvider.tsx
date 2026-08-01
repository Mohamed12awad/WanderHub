import { createContext, useContext, useEffect, useState } from "react";

export type ColorMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "green" | "red" | "purple" | "orange" | "teal" | "rose";
export type FontSize = "sm" | "base" | "lg" | "xl";
export type Density = "comfortable" | "compact";

const ACCENT_CLASSES: AccentColor[] = ["blue", "green", "red", "purple", "orange", "teal", "rose"];

/**
 * Rows per page per density. The old default of 10 meant an accountant
 * reviewing a month of invoices paged constantly on a screen with room for far
 * more; 25 fills a laptop viewport without a fetch large enough to feel slow.
 * The server caps `limit` at 100, so compact stays well inside it.
 */
export const DENSITY_PAGE_SIZE: Record<Density, number> = {
  comfortable: 25,
  compact: 50,
};

// Root font-size drives every rem-based size in the app, so changing it scales
// the whole UI proportionally. "base" matches the stylesheet default (16px).
export const FONT_SIZE_PX: Record<FontSize, string> = {
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
};

type ThemeProviderState = {
  theme: ColorMode;
  accent: AccentColor;
  fontSize: FontSize;
  density: Density;
  setTheme: (t: ColorMode) => void;
  setAccent: (a: AccentColor) => void;
  setFontSize: (f: FontSize) => void;
  setDensity: (d: Density) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  accent: "blue",
  fontSize: "base",
  density: "comfortable",
  setTheme: () => null,
  setAccent: () => null,
  setFontSize: () => null,
  setDensity: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorMode>(
    () => (localStorage.getItem("ui-theme") as ColorMode) || "system"
  );
  const [accent, setAccentState] = useState<AccentColor>(
    () => (localStorage.getItem("ui-accent") as AccentColor) || "blue"
  );
  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => (localStorage.getItem("ui-font-size") as FontSize) || "base"
  );
  const [density, setDensityState] = useState<Density>(
    () => (localStorage.getItem("ui-density") as Density) || "comfortable"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    const effective =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : theme;

    root.classList.add(effective);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    ACCENT_CLASSES.forEach((c) => root.classList.remove(`accent-${c}`));
    if (accent !== "blue") root.classList.add(`accent-${accent}`);
  }, [accent]);

  useEffect(() => {
    window.document.documentElement.style.fontSize = FONT_SIZE_PX[fontSize] ?? FONT_SIZE_PX.base;
  }, [fontSize]);

  // Exposed as an attribute on <html> so cell padding is a pure CSS concern —
  // table primitives read it through a variant selector rather than every table
  // threading a density prop down to its cells.
  useEffect(() => {
    window.document.documentElement.dataset.density = density;
  }, [density]);

  const setTheme = (t: ColorMode) => {
    localStorage.setItem("ui-theme", t);
    setThemeState(t);
  };

  const setAccent = (a: AccentColor) => {
    localStorage.setItem("ui-accent", a);
    setAccentState(a);
  };

  const setFontSize = (f: FontSize) => {
    localStorage.setItem("ui-font-size", f);
    setFontSizeState(f);
  };

  const setDensity = (d: Density) => {
    localStorage.setItem("ui-density", d);
    setDensityState(d);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, accent, fontSize, density, setTheme, setAccent, setFontSize, setDensity }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
