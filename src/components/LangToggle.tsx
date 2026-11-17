import { useLang, type Lang } from "../i18n.tsx";

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex rounded-full border border-ink/15 bg-paper/80 p-1 ${className}`}>
      {(["zh", "en"] as const).map((code) => (
        <LangButton key={code} code={code} current={lang} onSelect={setLang} />
      ))}
    </div>
  );
}

function LangButton({ code, current, onSelect }: { code: Lang; current: Lang; onSelect: (lang: Lang) => void }) {
  return (
    <button type="button" className={`rounded-full px-3 py-1 text-sm ${current === code ? "bg-ink text-paper" : "text-ink"}`} aria-pressed={current === code} onClick={() => onSelect(code)}>
      {code === "zh" ? "中文" : "EN"}
    </button>
  );
}
