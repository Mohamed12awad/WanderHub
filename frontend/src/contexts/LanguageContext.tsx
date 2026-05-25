import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, LANGUAGES, Lang, Tr } from "@/i18n/translations";

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Tr;
  isRTL: boolean;
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

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: translations[lang], isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
