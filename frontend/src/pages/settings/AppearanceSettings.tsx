import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { LANGUAGES, Lang } from "@/i18n/translations";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor, Check } from "lucide-react";

type Theme = "light" | "dark" | "system";

const THEMES: { value: Theme; icon: React.ElementType; label: (s: any) => string }[] = [
  { value: "light", icon: Sun, label: (s) => s.light },
  { value: "dark", icon: Moon, label: (s) => s.dark },
  { value: "system", icon: Monitor, label: (s) => s.system },
];

export default function AppearanceSettings() {
  const { tr, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const s = tr.settings;

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">{s.appearance}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Customize the look and feel of your workspace.</p>
      </div>

      {/* Theme */}
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
              {/* Mini preview */}
              <div className={cn(
                "w-full h-16 rounded-lg border overflow-hidden",
                value === "light" && "bg-white",
                value === "dark" && "bg-zinc-900",
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
                {label(s)}
              </div>
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
