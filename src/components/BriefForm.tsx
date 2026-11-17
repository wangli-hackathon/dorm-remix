import { useState } from "react";
import { dominantColors } from "../lib/color/sample.ts";
import { planDorm, publicImageUrl } from "../lib/planner/plan.ts";
import { PRESETS } from "../lib/planner/presets.ts";
import { ROOMS } from "../lib/planner/rooms.ts";
import type { Draft } from "../lib/draft.ts";
import type { Brief, Campus, Facing, RoomType, StyleId } from "../lib/planner/types.ts";
import { useLang } from "../i18n.tsx";
import { LangToggle } from "./LangToggle.tsx";
import { Button } from "./ui/button.tsx";
import { Input, Textarea } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { Switch } from "./ui/switch.tsx";

const FACINGS: Facing[] = ["south", "north", "east", "west"];
const CAMPUSES: Campus[] = ["jilin", "north", "other"];
const STYLES: StyleId[] = ["warm-wood", "cool-ink", "poster"];

export function BriefForm({ draft, onChange, onBack, onPlan }: { draft: Draft; onChange: (draft: Draft) => void; onBack: () => void; onPlan: (brief: Brief) => void }) {
  const { t, lang } = useLang();
  const [errors, setErrors] = useState<string[]>([]);
  const room = draft.roomType ? ROOMS[draft.roomType] : null;

  function patch(partial: Partial<Draft>) {
    onChange({ ...draft, ...partial });
  }

  function submit() {
    const missing = [
      !draft.roomType ? t("房型", "room") : "",
      draft.occupants === null ? t("在住人数", "people") : "",
      draft.budgetCny === null ? t("预算", "budget") : "",
      !draft.windowFacing ? t("朝向", "window") : "",
      !draft.campus ? t("气候", "climate") : "",
      !draft.style ? t("气质", "mood") : "",
    ].filter(Boolean);
    if (!draft.campus || !draft.roomType || draft.occupants === null || draft.budgetCny === null || !draft.windowFacing || !draft.style) {
      setErrors([t(`还缺：${missing.join("、")}。`, `Still missing: ${missing.join(", ")}.`)]);
      return;
    }
    const brief: Brief = {
      campus: draft.campus,
      roomType: draft.roomType,
      occupants: draft.occupants,
      budgetCny: draft.budgetCny,
      accessible: draft.accessible,
      windowFacing: draft.windowFacing,
      style: draft.style,
      notes: draft.notes,
      reference: { fileName: draft.fileName, palette: draft.palette, publicUrl: draft.publicUrl.trim() || undefined },
    };
    const result = planDorm(brief);
    if (!result.ok) {
      setErrors(result.errors.map((error) => (lang === "en" ? error.en : error.zh)));
      return;
    }
    setErrors([]);
    onPlan(brief);
  }

  return (
    <main id="brief-form" className="min-h-dvh bg-[#efe4d2]">
      <div className="grain min-h-dvh">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <button type="button" className="text-sm text-soot underline-offset-4 hover:underline" onClick={onBack}>
            {t("回门厅", "Back to the door")}
          </button>
          <LangToggle />
        </header>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <p className="text-xs tracking-[0.22em] text-soot uppercase">{t("入住卡", "Housing card")}</p>
            <h1 className="mt-2 font-display text-5xl text-ink">{t("先把约束说清楚", "Say the constraints first")}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-soot">{t("还没选房型的时候，这里就是空的。可以点一张预设，也可以自己填。照片只在本地取色。", "Until you pick a room, this card stays empty. Use a preset or fill it yourself. A photo is only sampled for color on this device.")}</p>
            <div className="mt-6 grid gap-3">
              {PRESETS.map((preset) => (
                <button key={preset.id} type="button" className="paper-card rounded-2xl border border-white/80 p-4 text-left" onClick={() => { onChange(draftFromBrief(preset.brief)); setErrors([]); }}>
                  <p className="font-display text-2xl">{lang === "en" ? preset.titleEn : preset.titleZh}</p>
                  <p className="mt-1 text-sm text-soot">{lang === "en" ? preset.blurbEn : preset.blurbZh}</p>
                </button>
              ))}
            </div>
          </section>
          <form
            className="paper-card rounded-[1.6rem] border border-white/80 p-5 sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {draft.roomType === null ? (
              <p className="mb-4 rounded-xl border border-dashed border-ink/20 bg-paper/60 px-3 py-3 text-sm text-soot">{t("空卡。选一种房型，或用左边的预设填上。", "Empty card. Choose a room type, or fill it from a preset.")}</p>
            ) : null}
            {errors.length > 0 ? (
              <div role="alert" className="mb-4 rounded-xl bg-[#f6d7cc] px-3 py-3 text-sm text-persimmon-deep">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
            <fieldset>
              <legend className="text-sm font-medium text-soot">{t("房型", "Room")}</legend>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(ROOMS) as RoomType[]).map((type) => (
                  <button key={type} type="button" aria-pressed={draft.roomType === type} className={`rounded-xl border px-3 py-3 text-left ${draft.roomType === type ? "border-persimmon bg-[#f8e3d6]" : "border-ink/10 bg-paper"}`} onClick={() => patch({ roomType: type, occupants: Math.min(draft.occupants ?? ROOMS[type].capacity, ROOMS[type].capacity) })}>
                    <span className="block font-medium">{lang === "en" ? ROOMS[type].nameEn : ROOMS[type].nameZh}</span>
                    <span className="text-xs text-soot">{ROOMS[type].width} × {ROOMS[type].depth} m · {ROOMS[type].capacity} {t("个床位", "beds")}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="occupants">{t("在住人数", "People living here")}</Label>
                <Input id="occupants" className="mt-1" inputMode="numeric" min={1} max={room?.capacity ?? 6} value={draft.occupants ?? ""} placeholder={room ? `1–${room.capacity}` : t("先选房型", "Choose a room")} onChange={(event) => patch({ occupants: event.target.value === "" ? null : Number(event.target.value) })} />
              </div>
              <div>
                <Label htmlFor="budget">{t("预算（元）", "Budget (CNY)")}</Label>
                <Input id="budget" className="mt-1" inputMode="decimal" value={draft.budgetCny ?? ""} placeholder="800" onChange={(event) => patch({ budgetCny: event.target.value === "" ? null : Number(event.target.value) })} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[0, 300, 800, 1500].map((amount) => (
                    <button key={amount} type="button" className="rounded-full border border-ink/15 px-3 py-1 text-xs" onClick={() => patch({ budgetCny: amount })}>
                      ¥{amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-soot">{t("窗朝向", "Window")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FACINGS.map((facing) => (
                  <Choice key={facing} pressed={draft.windowFacing === facing} onClick={() => patch({ windowFacing: facing })}>
                    {facingLabel(facing, lang)}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-soot">{t("校园气候", "Campus climate")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CAMPUSES.map((campus) => (
                  <Choice key={campus} pressed={draft.campus === campus} onClick={() => patch({ campus })}>
                    {campusLabel(campus, lang)}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-soot">{t("材料气质", "Materials")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {STYLES.map((style) => (
                  <Choice key={style} pressed={draft.style === style} onClick={() => patch({ style })}>
                    {styleLabel(style, lang)}
                  </Choice>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-paper px-3 py-3">
              <Label htmlFor="access">{t("有人需要轮椅进出", "Someone uses a wheelchair")}</Label>
              <Switch id="access" checked={draft.accessible} onCheckedChange={(checked) => patch({ accessible: checked })} />
            </div>
            <div className="mt-4">
              <Label htmlFor="notes">{t("想跟室友说的话", "Note for your roommates")}</Label>
              <Textarea id="notes" className="mt-1" maxLength={400} value={draft.notes} placeholder={t("例如：晚自习不要挡窗。", "For example: don’t block the window during night study.")} onChange={(event) => patch({ notes: event.target.value })} />
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-3">
              <Label htmlFor="photo">{t("参考照片（可选）", "Reference photo (optional)")}</Label>
              <Input id="photo" className="mt-2" type="file" accept="image/*" onChange={(event) => void readPhoto(event.target.files?.[0], patch, t)} />
              {draft.photoError ? <p role="alert" className="mt-2 text-sm text-persimmon-deep">{draft.photoError}</p> : null}
              {draft.palette.length === 0 && !draft.photoError ? <p className="mt-2 text-sm text-soot">{t("不传也可以。演示模式不会把照片说成三维模型。", "You can skip it. Demo mode will not pretend the photo became a 3D model.")}</p> : null}
              {draft.palette.length > 0 ? (
                <p className="mt-2 flex items-center gap-2 text-sm">
                  {draft.palette.map((color) => (
                    <span key={color} className="inline-block h-6 w-6 rounded-full border border-ink/10" style={{ background: color }} title={color} />
                  ))}
                  <span className="text-soot">{draft.fileName} · {t("仅本地取色", "local colors only")}</span>
                </p>
              ) : null}
              <Label htmlFor="public-url" className="mt-3 block">{t("若图片已有公网 https 地址，直播模式可挂到椅子的文生三维", "A public https URL can be attached to the chair prompt in live mode")}</Label>
              <Input id="public-url" className="mt-1" value={draft.publicUrl} placeholder="https://" onChange={(event) => patch({ publicUrl: event.target.value })} />
              {draft.publicUrl && !publicImageUrl(draft.publicUrl) ? <p className="mt-1 text-xs text-persimmon-deep">{t("需要不带账号密码的 https 链接。", "Use an https URL without a username or password.")}</p> : null}
            </div>
            <Button className="mt-6 w-full" size="lg" type="submit">
              {t("生成方案并走进去", "Plan it and walk in")}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Choice({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={pressed} className={`rounded-full border px-3 py-2 text-sm ${pressed ? "border-persimmon bg-[#f8e3d6]" : "border-ink/15 bg-paper"}`} onClick={onClick}>
      {children}
    </button>
  );
}

function draftFromBrief(brief: Brief): Draft {
  return {
    campus: brief.campus,
    roomType: brief.roomType,
    occupants: brief.occupants,
    budgetCny: brief.budgetCny,
    accessible: brief.accessible,
    windowFacing: brief.windowFacing,
    style: brief.style,
    notes: brief.notes,
    fileName: brief.reference.fileName,
    palette: brief.reference.palette,
    publicUrl: brief.reference.publicUrl ?? "",
  };
}

async function readPhoto(file: File | undefined, patch: (partial: Partial<Draft>) => void, t: (zh: string, en: string) => string) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    patch({ photoError: t("请选一张图片。", "Choose an image file."), palette: [], fileName: undefined });
    return;
  }
  if (file.size > 8_000_000) {
    patch({ photoError: t("图片请小于 8 MB。", "Keep the image under 8 MB."), palette: [], fileName: undefined });
    return;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas");
    context.drawImage(bitmap, 0, 0, 48, 48);
    const palette = dominantColors(context.getImageData(0, 0, 48, 48).data, 3);
    bitmap.close();
    patch({ palette, fileName: file.name, photoError: undefined });
  } catch {
    patch({ photoError: t("这张图没有读出来。", "That image could not be read."), palette: [], fileName: undefined });
  }
}

function facingLabel(facing: Facing, lang: "zh" | "en"): string {
  const map = { south: ["南向", "South"], north: ["北向", "North"], east: ["东向", "East"], west: ["西向", "West"] };
  return lang === "en" ? map[facing][1] : map[facing][0];
}

function campusLabel(campus: Campus, lang: "zh" | "en"): string {
  const map = { jilin: ["吉林一带", "Around Jilin"], north: ["其他北方", "Other northern campus"], other: ["其他", "Somewhere else"] };
  return lang === "en" ? map[campus][1] : map[campus][0];
}

function styleLabel(style: StyleId, lang: "zh" | "en"): string {
  const map = { "warm-wood": ["暖木夜读", "Warm wood"], "cool-ink": ["冷静蓝", "Cool ink"], poster: ["旧海报", "Old posters"] };
  return lang === "en" ? map[style][1] : map[style][0];
}
