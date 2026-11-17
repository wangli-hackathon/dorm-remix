import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

type LangValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (zh: string, en: string) => string;
};

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (window.localStorage.getItem("dorm-remix-lang") === "en" ? "en" : "zh"));
  useEffect(() => {
    window.localStorage.setItem("dorm-remix-lang", lang);
    document.documentElement.lang = lang === "en" ? "en" : "zh";
  }, [lang]);
  const value = useMemo<LangValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: (zh, en) => (lang === "en" ? en : zh),
    }),
    [lang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang outside LangProvider");
  return value;
}

