import { createContext, useContext, useEffect, useState } from "react";

export type ColorMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "green" | "red" | "purple" | "orange" | "teal" | "rose";
export type FontSize = "sm" | "base" | "lg" | "xl";

const ACCENT_CLASSES: AccentColor[] = ["blue", "green", "red", "purple", "orange", "teal", "rose"];

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
  setTheme: (t: ColorMode) => void;
  setAccent: (a: AccentColor) => void;
  setFontSize: (f: FontSize) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  accent: "blue",
  fontSize: "base",
  setTheme: () => null,
  setAccent: () => null,
  setFontSize: () => null,
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

  return (
    <ThemeProviderContext.Provider value={{ theme, accent, fontSize, setTheme, setAccent, setFontSize }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
