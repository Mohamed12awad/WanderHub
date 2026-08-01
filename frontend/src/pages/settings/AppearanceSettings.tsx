import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, AccentColor, ColorMode, Density, DENSITY_PAGE_SIZE, FontSize } from "@/contexts/ThemeProvider";
import { LANGUAGES, Lang } from "@/i18n/translations";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Check } from "lucide-react";

const FONT_SIZES: { value: FontSize; label: string; px: string }[] = [
  { value: "sm",   label: "Small",       px: "14px" },
  { value: "base", label: "Default",     px: "16px" },
  { value: "lg",   label: "Large",       px: "18px" },
  { value: "xl",   label: "Extra Large", px: "20px" },
];

const DENSITIES: { value: Density; label: string; rows: number; gap: string }[] = [
  { value: "comfortable", label: "Comfortable", rows: 4, gap: "0.375rem" },
  { value: "compact",     label: "Compact",     rows: 6, gap: "0.125rem" },
];

const THEMES: { value: ColorMode; icon: React.ElementType; label: string }[] = [
  { value: "light",  icon: Sun,     label: "Light"  },
  { value: "dark",   icon: Moon,    label: "Dark"   },
  { value: "system", icon: Monitor, label: "System" },
];

const ACCENTS: { value: AccentColor; label: string; color: string; dark: string }[] = [
  { value: "blue",   label: "Blue",   color: "#3b6fd4", dark: "#5b8fee" },
  { value: "green",  label: "Green",  color: "#1e8a4a", dark: "#27c26b" },
  { value: "red",    label: "Red",    color: "#e01e1e", dark: "#f05050" },
  { value: "purple", label: "Purple", color: "#7c3aed", dark: "#9f6ef5" },
  { value: "orange", label: "Orange", color: "#e06010", dark: "#f5853a" },
  { value: "teal",   label: "Teal",   color: "#0f8a78", dark: "#14c4ad" },
  { value: "rose",   label: "Rose",   color: "#d41645", dark: "#e84c7a" },
];

export default function AppearanceSettings() {
  const { tr, lang, setLang } = useLanguage();
  const { theme, accent, fontSize, density, setTheme, setAccent, setFontSize, setDensity } = useTheme();
  const s = tr.settings;

  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="page-w-narrow page-pad page-gap">
      <div>
        <h2 className="text-lg font-semibold">{s.appearance}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Customize the look and feel of your workspace.</p>
      </div>

      {/* Color mode */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{s.themeLabel}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{s.themeDesc}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all hover:bg-muted/50",
                theme === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              {theme === value && (
                <span className="absolute top-2 end-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </span>
              )}
              <div className={cn(
                "w-full h-16 rounded-lg border overflow-hidden",
                value === "light"  && "bg-white",
                value === "dark"   && "bg-zinc-900",
                value === "system" && "bg-gradient-to-br from-white to-zinc-900"
              )}>
                <div className={cn(
                  "h-4 border-b flex items-center px-2 gap-1",
                  value === "dark" ? "border-zinc-700 bg-zinc-800" : "border-border bg-muted"
                )}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={cn("h-1.5 rounded-full", value === "dark" ? "bg-zinc-600" : "bg-muted-foreground/30", i === 0 ? "w-8" : "w-4")} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="border-t" />

      {/* Accent color */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Accent Color</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Sets the brand color used for buttons, links, and highlights.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map(({ value, label, color, dark }) => {
            const bg = isDark ? dark : color;
            const active = accent === value;
            return (
              <button
                key={value}
                onClick={() => setAccent(value)}
                title={label}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-sm font-medium transition-all",
                  active ? "border-primary shadow-md" : "border-border hover:border-muted-foreground/40"
                )}
              >
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-black/10 shrink-0"
                  style={{ background: bg }}
                />
                <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                {active && (
                  <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ background: bg }}>
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="border-t" />

      {/* Font size */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Font Size</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Scales the text and spacing across the entire app.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FONT_SIZES.map(({ value, label, px }) => (
            <button
              key={value}
              onClick={() => setFontSize(value)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all hover:bg-muted/50",
                fontSize === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {fontSize === value && (
                <span className="absolute top-2 end-2"><Check className="h-3.5 w-3.5 text-primary" /></span>
              )}
              <span className="font-semibold leading-none" style={{ fontSize: px }}>Aa</span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="border-t" />

      {/* Row density */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Row Density</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sets row height and how many records each page of a list shows.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DENSITIES.map(({ value, label, rows, gap }) => (
            <button
              key={value}
              onClick={() => setDensity(value)}
              aria-pressed={density === value}
              className={cn(
                "relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all hover:bg-muted/50",
                density === value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {density === value && (
                <span className="absolute top-2 end-2"><Check className="h-3.5 w-3.5 text-primary" /></span>
              )}
              {/* Shows the actual trade-off — the same width, more rows, tighter. */}
              <span className="flex w-16 flex-col" style={{ gap }} aria-hidden="true">
                {Array.from({ length: rows }, (_, i) => (
                  <span key={i} className="h-1 rounded-full bg-current opacity-60" />
                ))}
              </span>
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px] tabular-nums opacity-70">
                {DENSITY_PAGE_SIZE[value]} per page
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="border-t" />

      {/* Language */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{s.languageLabel}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{s.languageDesc}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {(Object.entries(LANGUAGES) as [Lang, typeof LANGUAGES[Lang]][]).map(([code, meta]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-sm transition-all hover:bg-muted/50",
                lang === code
                  ? "border-primary bg-primary/5"
                  : "border-border text-muted-foreground"
              )}
            >
              {lang === code && (
                <span className="absolute top-1.5 end-1.5">
                  <Check className="h-3 w-3 text-primary" />
                </span>
              )}
              <span className="text-xl leading-none">{meta.flag}</span>
              <div className="text-start min-w-0">
                <p className={cn("text-xs font-semibold leading-none truncate", lang === code && "text-primary")}>
                  {meta.native}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{meta.name}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
