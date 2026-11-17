import { useLang } from "../i18n.tsx";
import { LangToggle } from "./LangToggle.tsx";
import { Button } from "./ui/button.tsx";

export function Hall({ onStart }: { onStart: () => void }) {
  const { t } = useLang();
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="hall-sky absolute inset-0" />
      <div className="grain absolute inset-0" />
      <a href="#brief-form" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:bg-paper focus:px-3 focus:py-2" onClick={(event) => { event.preventDefault(); onStart(); }}>
        {t("跳到约束", "Skip to the brief")}
      </a>
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <p className="text-xs tracking-[0.28em] text-soot uppercase">Dorm Remix</p>
        <LangToggle />
      </header>
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-6xl items-center gap-10 px-4 pb-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-4 inline-block rounded-full bg-persimmon/10 px-3 py-1 text-sm text-persimmon-deep">{t("给室友开会之前", "Before the roommate meeting")}</p>
          <h1 className="font-display text-[18vw] leading-[0.86] text-ink sm:text-8xl">
            {t("宿舍", "Dorm")}
            <br />
            {t("改造家", "Remix")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-soot">{t("六平米，也要有自己的光。把床位、预算、轮椅和北方冬天的窗说清楚，再走进改好的那一间。", "Six square meters still deserve their own light. Say the beds, the budget, the wheelchair, and the winter window — then walk through the room.")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onStart}>
              {t("从这间寝室开始", "Start with this dorm")}
            </Button>
            <p className="text-sm text-soot">{t("没有密钥也能走完。家具会标明是演示替身。", "It runs without a key. Furniture is labeled as a stand-in.")}</p>
          </div>
        </div>
        <WindowCard />
      </div>
    </main>
  );
}

function WindowCard() {
  const { t } = useLang();
  return (
    <figure className="paper-card relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem_1.2rem_2rem_1.2rem] border border-white/70">
      <div className="absolute inset-0 bg-gradient-to-b from-[#8eabc4] via-[#d7c3a4] to-[#1d2733]" />
      <div className="absolute left-[18%] right-[18%] top-[10%] bottom-[28%] rounded-sm border-[10px] border-[#f7f1e6] shadow-inner">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#9eb6cc,#e7c89a_55%,#243041)]" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute bottom-6 left-6 h-16 w-10 rounded-sm bg-[#c6532d]/80" />
        <div className="absolute right-8 bottom-10 h-24 w-14 rounded-t-md border-4 border-[#8d949b] bg-[#f0d7c4]" />
      </div>
      <figcaption className="absolute inset-x-0 bottom-0 bg-paper/90 px-5 py-4">
        <p className="font-display text-2xl">{t("窗还在，灯先亮。", "The window stays. The lamp comes first.")}</p>
        <p className="mt-1 text-sm text-soot">{t("吉林，下午四点。", "Jilin, four in the afternoon.")}</p>
      </figcaption>
    </figure>
  );
}
