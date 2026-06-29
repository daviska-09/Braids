import { createContext, useContext, useState } from "react";
import { translations } from "@/i18n/translations";

export type Lang = "en" | "fr" | "nl";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("rm_lang");
    return (stored === "fr" || stored === "nl") ? stored : "en";
  });

  const handleSet = (l: Lang) => {
    localStorage.setItem("rm_lang", l);
    setLang(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSet }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export const useT = () => {
  const { lang } = useLanguage();
  return translations[lang];
};
