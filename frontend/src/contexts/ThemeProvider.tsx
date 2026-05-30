import { createContext, useContext, useEffect, useState } from "react";

export type ColorMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "green" | "red" | "purple" | "orange" | "teal" | "rose";

const ACCENT_CLASSES: AccentColor[] = ["blue", "green", "red", "purple", "orange", "teal", "rose"];

type ThemeProviderState = {
  theme: ColorMode;
  accent: AccentColor;
  setTheme: (t: ColorMode) => void;
  setAccent: (a: AccentColor) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  accent: "blue",
  setTheme: () => null,
  setAccent: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorMode>(
    () => (localStorage.getItem("ui-theme") as ColorMode) || "system"
  );
  const [accent, setAccentState] = useState<AccentColor>(
    () => (localStorage.getItem("ui-accent") as AccentColor) || "blue"
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

  const setTheme = (t: ColorMode) => {
    localStorage.setItem("ui-theme", t);
    setThemeState(t);
  };

  const setAccent = (a: AccentColor) => {
    localStorage.setItem("ui-accent", a);
    setAccentState(a);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
