import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { translations, LANGUAGES, Lang, Tr } from "@/i18n/translations";

// BCP-47 locale per language, used by the Intl formatters below so numbers,
// currency and dates render in the conventions of the active language.
const LOCALES: Record<Lang, string> = {
  en: "en-US",
  ar: "ar-EG",
};

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Tr;
  isRTL: boolean;
  /** Locale-aware number formatting (grouping, numerals). */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Locale-aware currency formatting. `currency` is an ISO code (e.g. "EGP"). */
  formatCurrency: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string;
  /** Locale-aware date formatting. */
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

const isValidLang = (v: string): v is Lang => v in LANGUAGES;

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang");
    return stored && isValidLang(stored) ? stored : "en";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  };

  const isRTL = LANGUAGES[lang].dir === "rtl";

  useEffect(() => {
    document.documentElement.dir = LANGUAGES[lang].dir;
    document.documentElement.lang = lang;
  }, [lang]);

  // Rebuilt only when the language changes so consumers get correctly-localized
  // formatters without reallocating on every render.
  const formatters = useMemo(() => {
    const locale = LOCALES[lang];
    return {
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, options).format(value),
      formatCurrency: (value: number, currency: string, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(value),
      formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat(locale, options ?? { year: "numeric", month: "short", day: "numeric" }).format(
          value instanceof Date ? value : new Date(value),
        ),
    };
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, tr: translations[lang], isRTL, ...formatters }),
    [lang, isRTL, formatters],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
