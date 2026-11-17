import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { demoPresentation, generateSequential, honestyCopy, type JobUpdate } from "../lib/lux3d/adapter.ts";
import { fetchHealth, fetchTask, postTextTo3d, taskFileUrl, type Health } from "../lib/lux3d/browser.ts";
import { OFFICIAL_EXAMPLES } from "../lib/lux3d/fixtures.ts";
import { applyVariant } from "../lib/planner/plan.ts";
import { roommateScript, shotList } from "../lib/planner/script.ts";
import type { Plan, Selections } from "../lib/planner/types.ts";
import { useLang } from "../i18n.tsx";
import { LangToggle } from "./LangToggle.tsx";
import { DormScene, type SceneHandle } from "./DormScene.tsx";
import { PlanSvg } from "./PlanSvg.tsx";
import { ViewerSample } from "./ViewerSample.tsx";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog.tsx";

type Panel = "plan" | "assets" | "export" | "about" | null;
type ModelRecord = Record<string, { url: string; source: "lux3d-task" | "pasted-url"; taskId?: number }>;

const SWAPS: Array<{ group: keyof Selections; options: string[] }> = [
  { group: "linen", options: ["colors", "cream", "dark"] },
  { group: "chair", options: ["oak", "cushion", "fold"] },
  { group: "lamp", options: ["clip", "brass", "off"] },
  { group: "curtain", options: ["sheer", "warm", "off"] },
  { group: "plant", options: ["pothos", "off"] },
  { group: "rug", options: ["runner", "off"] },
  { group: "mirror", options: ["on", "off"] },
  { group: "crate", options: ["on", "off"] },
];

export function RoomStage({ plan, onPlan, onBack }: { plan: Plan; onPlan: (plan: Plan) => void; onBack: () => void }) {
  const { t, lang } = useLang();
  const sceneRef = useRef<SceneHandle>(null);
  const [time, setTime] = useState(0.28);
  const [walk, setWalk] = useState(false);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [panel, setPanel] = useState<Panel>(() => (window.innerWidth >= 960 ? "plan" : null));
  const [models, setModels] = useState<ModelRecord>({});
  const [health, setHealth] = useState<Health | null>(null);
  const [jobs, setJobs] = useState<JobUpdate[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmLive, setConfirmLive] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pictures, setPictures] = useState<Array<{ id: string; caption: string; url: string }>>([]);
  const [composing, setComposing] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [webgl] = useState(() => {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
  });
  const [pastes, setPastes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!composing) return;
    const timer = window.setTimeout(() => setComposing(false), 700);
    return () => window.clearTimeout(timer);
  }, [composing, plan.room.type, plan.brief.occupants]);

  useEffect(() => {
    void fetchHealth().then((next) => {
      if (next) setHealth(next);
    });
  }, []);

  const counts = useMemo(() => {
    let live = 0;
    let pasted = 0;
    for (const asset of plan.luxAssets) {
      const model = models[asset.id];
      if (model?.source === "lux3d-task") live += 1;
      else if (model?.source === "pasted-url") pasted += 1;
    }
    return { live, pasted, standIn: plan.luxAssets.length - live - pasted };
  }, [models, plan.luxAssets]);
  const honesty = honestyCopy(counts, lang);
  const signText = lang === "en" ? `${honesty.shortEn}\nNOT A FAKE` : `${honesty.shortZh}\n不是生成结果`;
  const modelUrls = Object.fromEntries(Object.entries(models).map(([id, model]) => [id, model.url]));
  const script = roommateScript(plan, lang);

  function swap(group: keyof Selections, value: string) {
    const next = applyVariant(plan, group, value);
    if (!next.ok) {
      setNotice(next.errors.map((error) => (lang === "en" ? error.en : error.zh)).join(" "));
      return;
    }
    onPlan(next.plan);
    setNotice(null);
  }

  async function runLive() {
    if (health?.mode !== "live") {
      setNotice(t("现在是演示模式，不会编造 Lux3D 返回。配好密钥后，这个按钮才会真正提交。", "This is demo mode. It will not invent a Lux3D response. The button submits only after a key is configured."));
      setConfirmLive(false);
      return;
    }
    setConfirmLive(false);
    setRunning(true);
    setNotice(null);
    const presentation = demoPresentation(plan);
    try {
      await generateSequential({
        jobs: presentation.assets.map((asset) => ({ id: asset.id, request: asset.request })),
        transport: { createTextTo3d: postTextTo3d, getTask: fetchTask },
        sleep: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
        intervalMs: 12_000,
        timeoutMs: 8 * 60 * 1000,
        now: () => Date.now(),
        onUpdate: (update) => {
          setJobs((current) => [...current.filter((item) => item.id !== update.id), update]);
          if (update.phase === "succeeded" && update.taskId) {
            setModels((current) => ({ ...current, [update.id]: { url: taskFileUrl(update.taskId!), source: "lux3d-task", taskId: update.taskId } }));
          }
        },
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("生成中断了。", "Generation stopped."));
    } finally {
      setRunning(false);
    }
  }

  async function captureAll() {
    if (!sceneRef.current || !webgl) {
      setNotice(t("没有可用的三维画面，先看平面图。", "There is no 3D view to photograph. Use the floor plan."));
      return;
    }
    try {
      const shots = shotList(plan);
      const next: Array<{ id: string; caption: string; url: string }> = [];
      for (const shot of shots) {
        const raw = sceneRef.current.capture(shot);
        const caption = lang === "en" ? shot.captionEn : shot.captionZh;
        next.push({ id: shot.id, caption, url: await withCaption(raw, caption, honesty.long) });
      }
      setPictures(next);
      setPanel("export");
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("这套图没有拍下来。", "The photo set could not be taken."));
    }
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-night text-paper">
      <p className="sr-only">{script}</p>
      {webgl ? (
        <div className="absolute inset-0">
          <DormScene ref={sceneRef} plan={plan} time={time} walk={walk} stick={stick} models={modelUrls} signText={counts.live + counts.pasted === 0 ? (lang === "en" ? "STAND-IN\nNOT LUX3D" : "演示替身\n不是 Lux3D") : signText} shadows={!window.matchMedia("(pointer: coarse)").matches} />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-paper p-6 text-ink">
          <div className="max-w-md">
            <p role="alert" className="font-display text-3xl">{t("这台设备打不开 WebGL", "WebGL is unavailable")}</p>
            <p className="mt-2 text-sm text-soot">{t("三维走看暂时没有。下面仍是同一套平面方案。", "The walkthrough is unavailable. The same plan is still here as a floor plan.")}</p>
            <PlanSvg plan={plan} className="mt-4 w-full rounded-2xl" />
          </div>
        </div>
      )}
      {composing ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-paper/80 text-ink">
          <p className="paper-card max-w-sm rounded-2xl px-5 py-4 text-center">{t("正在铺床、把衣柜让开窗。这一步是本地替身，没有调用 Lux3D。", "Making the beds and clearing the window. This step is a local stand-in. Lux3D was not called.")}</p>
        </div>
      ) : null}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto min-w-0 max-w-[calc(100%-7.5rem)] rounded-2xl bg-paper/90 px-3 py-2 text-ink shadow">
          <button type="button" className="text-xs text-soot underline-offset-4 hover:underline" onClick={onBack}>{t("改约束", "Edit the brief")}</button>
          <h1 className="font-display text-2xl leading-none sm:text-3xl">{lang === "en" ? plan.room.nameEn : plan.room.nameZh}</h1>
          <p className="mt-1 text-xs text-soot">{honesty.long}</p>
        </div>
        <div className="pointer-events-auto">
          <LangToggle />
        </div>
      </header>
      {notice ? (
        <div role="alert" className="absolute left-1/2 top-24 z-20 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl bg-[#f6d7cc] px-3 py-2 text-sm text-persimmon-deep">
          {notice}
        </div>
      ) : null}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-2 p-3 sm:p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SWAPS.map((swapGroup) => (
            <label key={swapGroup.group} className="shrink-0 rounded-2xl bg-paper/92 px-2 py-2 text-ink">
              <span className="block px-1 text-[11px] tracking-wide text-soot uppercase">{swapLabel(swapGroup.group, lang)}</span>
              <select className="bg-transparent text-sm" value={String(plan.selections[swapGroup.group])} aria-label={swapLabel(swapGroup.group, lang)} onChange={(event) => swap(swapGroup.group, event.target.value)}>
                {swapGroup.options.map((option) => (
                  <option key={option} value={option}>{optionLabel(swapGroup.group, option, lang)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="paper" onClick={() => setPanel(panel === "plan" ? null : "plan")}>{t("方案", "Plan")}</Button>
          <Button variant="paper" onClick={() => setPanel(panel === "assets" ? null : "assets")}>{t("Lux3D", "Lux3D")}</Button>
          <Button variant="paper" onClick={() => setPanel(panel === "export" ? null : "export")}>{t("给室友", "For roommates")}</Button>
          <Button variant="ghost" className="text-paper hover:bg-paper/15" onClick={() => setPanel(panel === "about" ? null : "about")}>{t("说明", "About")}</Button>
          <Button variant="paper" onClick={() => setWalk((value) => !value)} aria-pressed={walk}>{walk ? t("退出走动", "Stop walking") : t("走进去", "Walk in")}</Button>
          <label className="flex items-center gap-2 rounded-2xl bg-paper/92 px-3 py-2 text-sm text-ink">
            <span>{time < 0.45 ? t("冬日下午", "Winter afternoon") : t("晚自习", "Night study")}</span>
            <input aria-label={t("时间", "Time of day")} type="range" min={0} max={1} step={0.01} value={time} onChange={(event) => setTime(Number(event.target.value))} />
          </label>
        </div>
        {walk ? (
          <div className="flex items-center justify-between gap-3 text-xs text-paper">
            <p>{t("WASD 移动，点画布锁定鼠标，Esc 退出。手机用左边的圆垫。", "WASD to move. Click the view to lock the mouse. Esc exits. On a phone, use the pad.")}</p>
            <button type="button" className="relative h-24 w-24 shrink-0 rounded-full border border-paper/40 bg-night/40" aria-label={t("移动圆垫", "Move pad")} onPointerDown={(event) => dragStick(event, setStick)} onPointerUp={() => setStick({ x: 0, y: 0 })} onPointerCancel={() => setStick({ x: 0, y: 0 })} />
          </div>
        ) : null}
      </div>
      {panel ? (
        <section className="absolute inset-x-0 bottom-36 z-20 max-h-[46dvh] overflow-auto rounded-t-3xl bg-paper p-4 text-ink shadow-2xl sm:inset-y-4 sm:right-4 sm:left-auto sm:bottom-auto sm:w-[380px] sm:rounded-3xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">{panelTitle(panel, lang)}</h2>
            <button type="button" className="text-sm text-soot" onClick={() => setPanel(null)}>{t("收起", "Close")}</button>
          </div>
          {panel === "plan" ? <PlanPanel plan={plan} /> : null}
          {panel === "assets" ? (
            <AssetsPanel
              plan={plan}
              health={health}
              jobs={jobs}
              running={running}
              pastes={pastes}
              models={models}
              onPasteChange={(id, value) => setPastes((current) => ({ ...current, [id]: value }))}
              onAttach={(id, value) => {
                if (!value.startsWith("https://")) {
                  setNotice(t("请贴 https 链接。来源不会被自动核验。", "Paste an https URL. The origin is not verified automatically."));
                  return;
                }
                setModels((current) => ({ ...current, [id]: { url: value, source: "pasted-url" } }));
                setNotice(t("已放入外部链接。它不是经过核验的 Lux3D 任务。", "External URL placed. It is not a verified Lux3D task."));
              }}
              onAskLive={() => setConfirmLive(true)}
              onViewer={() => setViewerOpen(true)}
            />
          ) : null}
          {panel === "export" ? <ExportPanel plan={plan} pictures={pictures} onCapture={() => void captureAll()} script={script} /> : null}
          {panel === "about" ? <AboutPanel health={health} /> : null}
        </section>
      ) : null}
      <Dialog open={confirmLive} onOpenChange={setConfirmLive}>
        <DialogContent>
          <DialogTitle>{t("这会消耗 Lux3D 积分", "This spends Lux3D credits")}</DialogTitle>
          <DialogDescription>
            {t("家具会按官方接口一单一单提交，因为同时只能有一个生成任务。演示模式不会走这条路。", "Pieces are submitted one at a time through the official API, because only one generation can run. Demo mode never takes this path.")}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="paper" onClick={() => setConfirmLive(false)}>{t("先不生成", "Not now")}</Button>
            <Button onClick={() => void runLive()}>{t("提交到 Lux3D", "Submit to Lux3D")}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ViewerSample open={viewerOpen} onOpenChange={setViewerOpen} />
    </main>
  );
}

export function EmptyRoom({ onBack }: { onBack: () => void }) {
  const { t } = useLang();
  return (
    <main className="grid min-h-dvh place-items-center bg-[#efe4d2] px-6 text-ink">
      <div className="paper-card max-w-md rounded-3xl p-6">
        <h1 className="font-display text-4xl">{t("还没有方案", "No plan yet")}</h1>
        <p className="mt-2 text-sm leading-6 text-soot">{t("房间是空的。先回到入住卡，把床位和预算说完。", "The room is empty. Go back to the housing card and finish the beds and the budget.")}</p>
        <Button className="mt-4" onClick={onBack}>{t("去填入住卡", "Open the housing card")}</Button>
      </div>
    </main>
  );
}

function PlanPanel({ plan }: { plan: Plan }) {
  const { t, lang } = useLang();
  return (
    <div className="space-y-3 text-sm leading-6">
      <PlanSvg plan={plan} className="w-full rounded-xl border border-ink/10" />
      <p>{lang === "en" ? plan.room.nameEn : plan.room.nameZh} · {plan.room.width} × {plan.room.depth} m · {t("过道", "aisle")} {plan.corridor.clearWidth} m</p>
      <ul>
        {plan.purchases.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 border-t border-ink/10 py-1">
            <span>{lang === "en" ? item.nameEn : item.nameZh}{item.included ? "" : t("（没买）", " (skipped)")}</span>
            <span>¥{item.cost}</span>
          </li>
        ))}
      </ul>
      <p className={plan.overBudget ? "text-persimmon-deep" : ""}>{t("合计", "Spent")} ¥{plan.spent} · {t("剩余", "Left")} ¥{plan.remaining}</p>
      <ul className="space-y-2">
        {plan.warnings.map((warning) => (
          <li key={warning.code} className={warning.tone === "caution" ? "text-persimmon-deep" : "text-soot"}>{lang === "en" ? warning.en : warning.zh}</li>
        ))}
      </ul>
    </div>
  );
}

function AssetsPanel({ plan, health, jobs, running, pastes, models, onPasteChange, onAttach, onAskLive, onViewer }: {
  plan: Plan;
  health: Health | null;
  jobs: JobUpdate[];
  running: boolean;
  pastes: Record<string, string>;
  models: ModelRecord;
  onPasteChange: (id: string, value: string) => void;
  onAttach: (id: string, value: string) => void;
  onAskLive: () => void;
  onViewer: () => void;
}) {
  const { t, lang } = useLang();
  const presentation = demoPresentation(plan);
  const live = health?.mode === "live";
  return (
    <div className="space-y-3 text-sm">
      <p className="rounded-xl bg-[#f8e3d6] px-3 py-2">{live ? t("密钥在本机代理里，页面看不到。提交会花积分。", "The key stays in the local proxy. Submitting spends credits.") : t("演示模式。请求体是真的，响应没有发送，也没有用文档示例冒充结果。", "Demo mode. The request body is real. It was not sent, and documentation samples are not pretending to be results.")}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!live || running} onClick={onAskLive}>{running ? t("正在排队…", "Queueing…") : t("用 Lux3D 生成这些件", "Generate these with Lux3D")}</Button>
        <Button variant="paper" onClick={onViewer}>{t("看 Viewer 官方示例", "Open the Viewer sample")}</Button>
      </div>
      {!live ? <p className="text-xs text-soot">{t("静态页面没有代理。把提示词复制到 Lux3D 网页，再把 GLB 链接贴回来。", "A static page has no proxy. Copy a prompt into the Lux3D site, then paste the GLB URL back.")}</p> : null}
      <ul className="space-y-3">
        {presentation.assets.map((asset) => {
          const job = jobs.find((item) => item.id === asset.id);
          const model = models[asset.id];
          return (
            <li key={asset.id} className="rounded-xl border border-ink/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{lang === "en" ? asset.nameEn : asset.nameZh}</p>
                <span className="text-xs text-soot">{model?.source === "lux3d-task" ? `Lux3D #${model.taskId}` : model?.source === "pasted-url" ? t("外部链接", "External URL") : t("演示替身", "Stand-in")}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-soot">{asset.request.prompt}</p>
              <button type="button" className="mt-1 text-xs underline" onClick={() => void navigator.clipboard.writeText(asset.request.prompt)}>{t("复制提示词", "Copy prompt")}</button>
              {job ? <p className="mt-1 text-xs">{job.phase}{job.message ? ` · ${job.message}` : ""}</p> : null}
              <div className="mt-2 flex gap-2">
                <Input aria-label={t("GLB 链接", "GLB URL")} value={pastes[asset.id] ?? ""} placeholder="https://…glb" onChange={(event) => onPasteChange(asset.id, event.target.value)} />
                <Button variant="ink" size="sm" onClick={() => onAttach(asset.id, pastes[asset.id] ?? "")}>{t("放入", "Place")}</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <details className="rounded-xl bg-paper-deep/60 p-3">
        <summary>{presentation.noticeZh && lang === "zh" ? presentation.noticeZh : presentation.noticeEn}</summary>
        <pre className="mt-2 overflow-auto text-[11px] leading-4">{JSON.stringify({ source: OFFICIAL_EXAMPLES.source, retrieved: OFFICIAL_EXAMPLES.retrieved, createSuccess: OFFICIAL_EXAMPLES.createSuccess, successG1Base: OFFICIAL_EXAMPLES.successG1Base, running: OFFICIAL_EXAMPLES.queryRunning }, null, 2)}</pre>
      </details>
    </div>
  );
}

function ExportPanel({ pictures, onCapture, script }: { plan: Plan; pictures: Array<{ id: string; caption: string; url: string }>; onCapture: () => void; script: string }) {
  const { t } = useLang();
  return (
    <div>
      <p className="text-sm text-soot">{pictures.length === 0 ? t("还没拍。按下之后会留下门口、窗边和床位，并写上替身说明。", "Nothing photographed yet. This keeps the door, the window, and the beds, with the stand-in note burned in.") : t("这些图可以发给室友。说明文字写在画面下面。", "Send these to your roommates. The note is burned under the picture.")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onCapture}>{t("拍一套", "Take the set")}</Button>
        <Button variant="paper" onClick={() => void navigator.clipboard.writeText(script)}>{t("复制讨论稿", "Copy the note")}</Button>
      </div>
      <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {pictures.map((picture) => (
          <li key={picture.id} className="w-44 shrink-0 rounded-xl bg-[#fffaf3] p-2 shadow">
            <img src={picture.url} alt={picture.caption} className="aspect-[4/5] w-full object-cover" />
            <p className="mt-2 text-xs">{picture.caption}</p>
            <a className="text-xs underline" download={`${picture.id}.png`} href={picture.url}>{t("下载", "Download")}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AboutPanel({ health }: { health: Health | null }) {
  const { t } = useLang();
  return (
    <div className="space-y-3 text-sm leading-6 text-soot">
      <p>{t("宿舍改造家把床位、预算、轮椅和北方冬天的窗收成一间能走的寝室。钢架和墙是布局程序，椅子、灯、床这类单体才交给 Aholo Lux3D。", "Dorm Remix turns beds, budget, a wheelchair, and a northern winter window into a room you can walk. Frames and walls are layout code. Chairs, lamps, and the bed are the objects meant for Aholo Lux3D.")}</p>
      <p>{t("没有密钥时，画面上的牌子会写“演示替身”。官方文档里的任务号只出现在折叠的示例里，不会被当成你的模型。", "Without a key, the sign in the room says stand-in. Task ids from the official docs stay inside the sample disclosure. They are not your models.")}</p>
      <p>{health?.mode === "live" ? t("本机代理已读到密钥，但页面不会显示它。", "The local proxy has a key. This page will not show it.") : t("当前没有密钥，停留在演示模式。", "No key is configured, so this stays in demo mode.")}</p>
      <p>{t("团队 宿舍改造家 · 3FO4K4W3AXYC · 王丽。选题和正式提交需要本人在官网完成。", "Team 宿舍改造家 · 3FO4K4W3AXYC · 王丽. Topic and final submission stay on the official site, done by the participant.")}</p>
    </div>
  );
}

function panelTitle(panel: Panel, lang: "zh" | "en"): string {
  if (panel === "plan") return lang === "en" ? "The plan" : "方案";
  if (panel === "assets") return lang === "en" ? "Lux3D pieces" : "Lux3D 这几件";
  if (panel === "export") return lang === "en" ? "Roommate board" : "室友讨论";
  if (panel === "about") return lang === "en" ? "How this uses Lux3D" : "Lux3D 用在哪";
  return "";
}

function swapLabel(group: keyof Selections, lang: "zh" | "en"): string {
  const map: Record<string, [string, string]> = {
    linen: ["床品", "Linen"],
    chair: ["椅子", "Chair"],
    lamp: ["灯", "Lamp"],
    curtain: ["窗帘", "Curtain"],
    plant: ["植物", "Plant"],
    rug: ["地毯", "Rug"],
    mirror: ["镜子", "Mirror"],
    crate: ["收纳", "Crate"],
  };
  const pair = map[group] ?? [group, group];
  return lang === "en" ? pair[1] : pair[0];
}

function optionLabel(group: keyof Selections, option: string, lang: "zh" | "en"): string {
  const map: Record<string, [string, string]> = {
    colors: ["各床不同", "Different beds"],
    cream: ["一色米白", "All cream"],
    dark: ["深色", "Dark"],
    oak: ["原木", "Oak"],
    cushion: ["加坐垫", "Pads"],
    fold: ["折叠", "Folding"],
    clip: ["夹子灯", "Clip"],
    brass: ["黄铜", "Brass"],
    off: ["不要", "None"],
    sheer: ["纱帘", "Sheer"],
    warm: ["暖帘", "Warm drape"],
    pothos: ["绿萝", "Pothos"],
    runner: ["窄毯", "Runner"],
    on: ["要", "Yes"],
  };
  const pair = map[option] ?? [option, option];
  void group;
  return lang === "en" ? pair[1] : pair[0];
}

function dragStick(event: ReactPointerEvent<HTMLButtonElement>, setStick: (value: { x: number; y: number }) => void) {
  const pad = event.currentTarget;
  const rect = pad.getBoundingClientRect();
  const point = (clientX: number, clientY: number) => {
    const x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));
    setStick({ x, y });
  };
  point(event.clientX, event.clientY);
  const move = (ev: PointerEvent) => point(ev.clientX, ev.clientY);
  const up = () => {
    setStick({ x: 0, y: 0 });
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

async function withCaption(dataUrl: string, caption: string, footer: string): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height + 120;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.fillStyle = "#f4efe4";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  context.fillStyle = "#241910";
  context.font = "600 28px serif";
  context.fillText(caption, 24, image.height + 42);
  context.font = "16px sans-serif";
  context.fillStyle = "#4d3b2e";
  wrapText(context, footer, 24, image.height + 74, canvas.width - 48, 22);
  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  });
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  let line = "";
  let cursor = y;
  for (const char of text) {
    const next = line + char;
    if (context.measureText(next).width > maxWidth) {
      context.fillText(line, x, cursor);
      line = char;
      cursor += lineHeight;
    } else line = next;
  }
  context.fillText(line, x, cursor);
}
