import { aabbOf, blocksWalk, intersects } from "./geometry.ts";
import { PALETTES, styleLux, styleWords } from "./palette.ts";
import { CORRIDOR_WIDTH, ROOMS } from "./rooms.ts";
import {
  BED_NAMES,
  PRODUCT_FACE_COUNT,
  PRODUCT_VERSION,
  type Aabb,
  type BedSlot,
  type Brief,
  type FieldError,
  type LuxAssetSpec,
  type Plan,
  type PlanResult,
  type Purchase,
  type Selections,
  type SleepLevel,
  type Solid,
  type Warning,
} from "./types.ts";

const LOFT_W = 1.02;
const LOFT_LEN = 2.08;
const BUNK_W = 0.9;
const BUNK_LEN = 1.9;

type DeskRec = { id: string; bedIndex: number; x: number; y: number; z: number; w: number; d: number };
type FrameDraft = { id: string; side: 1 | -1; z: number; kind: "loft" | "bunk" | "floor" };
type SlotDraft = FrameDraft & { level: SleepLevel };

const SWAP_VALUES: Record<string, readonly string[]> = {
  linen: ["colors", "cream", "dark"],
  chair: ["oak", "cushion", "fold"],
  lamp: ["clip", "brass", "off"],
  curtain: ["sheer", "warm", "off"],
  plant: ["pothos", "off"],
  rug: ["runner", "off"],
  mirror: ["on", "off"],
  crate: ["on", "off"],
};

export function publicImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function validateBrief(brief: Brief): FieldError[] {
  const errors: FieldError[] = [];
  const room = ROOMS[brief.roomType];
  if (!room) errors.push({ code: "room", zh: "先选一种房型。", en: "Choose a room type." });
  if (!room || !Number.isFinite(brief.occupants) || brief.occupants < 1 || brief.occupants > room.capacity) {
    errors.push({
      code: "occupants",
      zh: room ? `在住人数要在 1 到 ${room.capacity} 之间。` : "在住人数不对。",
      en: room ? `Occupants must be from 1 to ${room.capacity}.` : "Occupant count is invalid.",
    });
  }
  if (!Number.isFinite(brief.budgetCny) || brief.budgetCny < 0 || brief.budgetCny > 20000) {
    errors.push({ code: "budget", zh: "预算要在 0 到 20000 元之间。", en: "Budget must be between ¥0 and ¥20,000." });
  }
  if (!["south", "north", "east", "west"].includes(brief.windowFacing)) {
    errors.push({ code: "facing", zh: "选一下窗户朝向。", en: "Choose which way the window faces." });
  }
  if (!["jilin", "north", "other"].includes(brief.campus)) {
    errors.push({ code: "campus", zh: "选一个校园气候。", en: "Choose a campus climate." });
  }
  if (!["warm-wood", "cool-ink", "poster"].includes(brief.style)) {
    errors.push({ code: "style", zh: "选一个材料气质。", en: "Choose a material mood." });
  }
  if (brief.notes.length > 400) {
    errors.push({ code: "notes", zh: "备注请收在 400 字以内。", en: "Keep the note under 400 characters." });
  }
  return errors;
}

export function chooseSelections(brief: Brief): Selections {
  let money = brief.budgetCny;
  const lampBeds = Math.min(brief.occupants, Math.floor(money / 36));
  money -= lampBeds * 36;
  const curtain: Selections["curtain"] = money >= 46 ? "sheer" : "off";
  if (curtain === "sheer") money -= 46;
  const wantMirror = brief.windowFacing === "north" || brief.windowFacing === "east" || brief.campus === "jilin";
  const mirror: Selections["mirror"] = wantMirror && money >= 49 ? "on" : "off";
  if (mirror === "on") money -= 49;
  const plant: Selections["plant"] = money >= 18 ? "pothos" : "off";
  if (plant === "pothos") money -= 18;
  const crate: Selections["crate"] = money >= 22 ? "on" : "off";
  if (crate === "on") money -= 22;
  const rug: Selections["rug"] = !brief.accessible && money >= 79 ? "runner" : "off";
  return {
    linen: "colors",
    chair: "oak",
    lamp: lampBeds > 0 ? "clip" : "off",
    curtain,
    plant,
    rug,
    mirror,
    crate,
    lampBeds,
  };
}

export function planDorm(brief: Brief, selections?: Selections): PlanResult {
  const errors = validateBrief(brief);
  if (errors.length > 0) return { ok: false, errors };
  const plan = buildPlan(brief, normalize(selections ?? chooseSelections(brief), brief.occupants));
  const layoutErrors = audit(plan);
  if (layoutErrors.length > 0) return { ok: false, errors: layoutErrors };
  return { ok: true, plan };
}

export function applyVariant(plan: Plan, group: keyof Selections, value: string): PlanResult {
  if (group === "lampBeds") {
    return { ok: false, errors: [{ code: "variant", zh: "灯的数量跟着开关走。", en: "Lamp count follows the lamp choice." }] };
  }
  const options = SWAP_VALUES[group];
  if (!options?.includes(value)) {
    return { ok: false, errors: [{ code: "variant", zh: "没有这个替换。", en: "That swap is not available." }] };
  }
  const next: Selections = { ...plan.selections, [group]: value } as Selections;
  if (group === "lamp") {
    next.lamp = value as Selections["lamp"];
    next.lampBeds = value === "off" ? 0 : plan.brief.occupants;
  }
  return planDorm(plan.brief, next);
}

function normalize(selections: Selections, occupants: number): Selections {
  const lampBeds = selections.lamp === "off" ? 0 : Math.max(0, Math.min(occupants, Math.floor(selections.lampBeds)));
  return { ...selections, lampBeds, lamp: lampBeds === 0 ? "off" : selections.lamp };
}

function buildPlan(brief: Brief, selections: Selections): Plan {
  const spec = ROOMS[brief.roomType];
  const palette = PALETTES[brief.style];
  const halfW = spec.width / 2;
  const halfD = spec.depth / 2;
  const zStart = -halfD + spec.windowZone;
  const zEnd = halfD - spec.doorClear;
  const corridor = { minX: -CORRIDOR_WIDTH / 2, maxX: CORRIDOR_WIDTH / 2, minZ: zStart, maxZ: zEnd, clearWidth: CORRIDOR_WIDTH };
  const windowOpening: Aabb = {
    minX: -0.34,
    maxX: 0.34,
    minY: 0.95,
    maxY: 2.25,
    minZ: -halfD - 0.02,
    maxZ: -halfD + 0.18,
  };
  const solids: Solid[] = [];
  const desks: DeskRec[] = [];
  const frames = framesFor(spec, zEnd);

  solids.push(
    piece("door", "door", [0.58, 1.02, halfD - 0.03], [0.64, 2.02, 0.04], palette.woodDark, 0.55, 0.05),
    piece("sign", "sign", [1.02, 1.22, -halfD + 0.18], [0.46, 0.28, 0.02], palette.paper, 0.85, 0),
    piece("radiator", "radiator", [0, 0.26, -halfD + 0.06], [0.86, 0.4, 0.06], palette.metal, 0.4, 0.55),
  );

  const slots = numberSlots(frames);
  const emitted = new Set<string>();
  for (const slot of slots) {
    const occupied = slot.index < brief.occupants;
    if (!emitted.has(slot.id)) {
      emitFrame(slot, spec, palette, selections, solids, desks);
      emitted.add(slot.id);
    }
    emitBedding(slot, spec, palette, selections, occupied, solids);
  }

  if (spec.kind === "bunk") emitWindowDesks(halfD, spec.windowZone, slots.length, palette, selections, desks, solids);
  if (spec.kind === "single") {
    /* desk is emitted with the frame */
  }

  for (const desk of desks) {
    if (desk.bedIndex >= selections.lampBeds) continue;
    emitLamp(desk, selections, palette, solids);
  }

  if (selections.crate === "on" && desks.length > 0) {
    const host = desks.find((desk) => desk.bedIndex >= brief.occupants) ?? desks[desks.length - 1];
    if (host) {
      solids.push(piece("crate", "crate", [host.x, host.y + 0.12, host.z], [0.26, 0.16, 0.22], palette.crate, 0.72, 0.04, host.bedIndex, "crate"));
    }
  }
  if (selections.curtain !== "off") {
    const cloth = selections.curtain === "warm" ? palette.wool : "#f7f4ee";
    for (const side of [-1, 1] as const) {
      solids.push(piece(`curtain-${side}`, "curtain", [side * 0.82, 1.52, -halfD + 0.045], [0.4, 1.62, 0.035], cloth, 0.9, 0, undefined, "curtain"));
    }
  }
  if (selections.mirror === "on") {
    solids.push(piece("mirror", "mirror", [-halfW + 0.3, 1.18, halfD - 0.03], [0.34, 1.05, 0.025], "#d5e4ef", 0.15, 0.25, undefined, "mirror"));
  }
  if (selections.plant === "pothos") {
    solids.push(
      piece("plant-pot", "plant", [0.78, 0.1, -halfD + 0.16], [0.16, 0.16, 0.16], palette.crate, 0.7, 0.05, undefined, "plant"),
      piece("plant-leaf", "plant", [0.78, 0.28, -halfD + 0.16], [0.22, 0.2, 0.22], palette.leaf, 0.8, 0, undefined, "plant"),
    );
  }
  if (selections.rug === "runner") {
    const length = Math.min(1.7, Math.max(0.8, (corridor.maxZ - corridor.minZ) * 0.42));
    solids.push(piece("rug", "rug", [0, 0.012, (corridor.minZ + corridor.maxZ) / 2], [0.7, 0.02, length], palette.wool, 0.95, 0, undefined, "rug"));
  }

  const beds: BedSlot[] = slots.map((slot) => ({
    index: slot.index,
    frameId: slot.id,
    level: slot.level,
    nameZh: BED_NAMES[slot.index]?.zh ?? String(slot.index + 1),
    nameEn: BED_NAMES[slot.index]?.en ?? String(slot.index + 1),
    occupied: slot.index < brief.occupants,
    accessiblePriority: brief.accessible && slot.index === 0,
  }));

  const purchases = buildPurchases(brief, selections);
  const spent = purchases.filter((item) => item.included).reduce((sum, item) => sum + item.cost, 0);
  const reference = publicImageUrl(brief.reference.publicUrl);
  const warnings = buildWarnings(brief, selections, spec.kind, spec.capacity, spent, reference);
  const luxAssets = buildAssets(brief, selections, spec.kind, reference);

  return {
    brief,
    selections,
    room: {
      type: spec.type,
      kind: spec.kind,
      nameZh: spec.nameZh,
      nameEn: spec.nameEn,
      width: spec.width,
      depth: spec.depth,
      height: spec.height,
      windowZone: spec.windowZone,
      doorClear: spec.doorClear,
      capacity: spec.capacity,
    },
    corridor,
    windowOpening,
    solids,
    beds,
    purchases,
    spent,
    remaining: roundMoney(brief.budgetCny - spent),
    overBudget: spent > brief.budgetCny + 0.001,
    warnings,
    lighting: { afternoonDirect: brief.windowFacing === "south" || brief.windowFacing === "west", taskKelvin: 2700 },
    luxAssets,
  };
}

function framesFor(spec: (typeof ROOMS)[Brief["roomType"]], zEnd: number): FrameDraft[] {
  if (spec.kind === "single") {
    const halfD = spec.depth / 2;
    const z = -halfD + spec.windowZone + 1.95 / 2;
    return [{ id: "bed-0", side: -1, z, kind: "floor" }];
  }
  const length = spec.kind === "loft" ? LOFT_LEN : BUNK_LEN;
  const gap = spec.kind === "loft" ? 0.12 : 0.16;
  const frames: FrameDraft[] = [];
  const rows = Math.max(spec.framesLeft, spec.framesRight);
  for (let row = 0; row < rows; row += 1) {
    const z = zEnd - length / 2 - row * (length + gap);
    if (row < spec.framesLeft) frames.push({ id: `L${row}`, side: -1, z, kind: spec.kind === "loft" ? "loft" : "bunk" });
    if (row < spec.framesRight) frames.push({ id: `R${row}`, side: 1, z, kind: spec.kind === "loft" ? "loft" : "bunk" });
  }
  return frames;
}

function numberSlots(frames: FrameDraft[]): Array<SlotDraft & { index: number }> {
  const primary: SlotDraft[] = [];
  const uppers: SlotDraft[] = [];
  for (const frame of frames) {
    if (frame.kind === "bunk") primary.push({ ...frame, level: "lower" });
    else if (frame.kind === "loft") primary.push({ ...frame, level: "loft" });
    else primary.push({ ...frame, level: "floor" });
  }
  for (const frame of frames) {
    if (frame.kind === "bunk") uppers.push({ ...frame, level: "upper" });
  }
  return [...primary, ...uppers].map((slot, index) => ({ ...slot, index }));
}

function emitFrame(
  slot: SlotDraft & { index: number },
  spec: (typeof ROOMS)[Brief["roomType"]],
  palette: (typeof PALETTES)[Brief["style"]],
  selections: Selections,
  solids: Solid[],
  desks: DeskRec[],
) {
  if (slot.kind === "floor") {
    emitSingle(slot, spec, palette, selections, solids, desks);
    return;
  }
  if (slot.kind === "loft") emitLoft(slot, spec.width, palette, selections, solids, desks);
  if (slot.kind === "bunk" && slot.level === "lower") emitBunkFrame(slot, spec.width, palette, solids);
}

function emitLoft(
  slot: SlotDraft & { index: number },
  roomWidth: number,
  palette: (typeof PALETTES)[Brief["style"]],
  selections: Selections,
  solids: Solid[],
  desks: DeskRec[],
) {
  const side = slot.side;
  const xCenter = side * (roomWidth / 2 - LOFT_W / 2);
  const z0 = slot.z - LOFT_LEN / 2;
  const z1 = slot.z + LOFT_LEN / 2;
  const id = slot.id;
  const deskLen = 1.2;
  const wardrobeLen = 0.54;
  const deskZ = z0 + deskLen / 2 + 0.04;
  const wardrobeZ = z1 - wardrobeLen / 2 - 0.02;
  const innerX = xCenter - side * (LOFT_W / 2);

  for (const [cx, cz] of [
    [xCenter - LOFT_W / 2 + 0.04, z0 + 0.04],
    [xCenter + LOFT_W / 2 - 0.04, z0 + 0.04],
    [xCenter - LOFT_W / 2 + 0.04, z1 - 0.04],
    [xCenter + LOFT_W / 2 - 0.04, z1 - 0.04],
  ] as const) {
    solids.push(piece(`${id}-post-${cx}-${cz}`, "post", [cx, 0.78, cz], [0.045, 1.56, 0.045], palette.metal, 0.38, 0.62));
  }
  solids.push(
    piece(`${id}-deck`, "deck", [xCenter, 1.58, slot.z], [LOFT_W - 0.02, 0.05, LOFT_LEN - 0.04], palette.woodDark, 0.6, 0.08),
    piece(`${id}-desk`, "desk", [xCenter, 0.74, deskZ], [LOFT_W - 0.12, 0.045, deskLen], palette.wood, 0.62, 0.08, slot.index),
    piece(`${id}-wardrobe`, "wardrobe", [xCenter, 0.7, wardrobeZ], [LOFT_W - 0.14, 1.36, wardrobeLen], palette.woodDark, 0.7, 0.04, slot.index),
    piece(`${id}-rail`, "rail", [innerX + side * 0.08, 1.78, slot.z - 0.1], [0.04, 0.08, 1.5], palette.metal, 0.4, 0.5),
  );
  emitLadder(`${id}-ladder`, innerX + side * 0.16, z1 - 0.24, palette.metal, solids);
  const chairX = innerX + side * 0.24;
  solids.push(chairPiece(`${id}-chair`, chairX, deskZ, selections, palette, slot.index));
  desks.push({ id: `${id}-desk`, bedIndex: slot.index, x: xCenter, y: 0.76, z: deskZ, w: LOFT_W - 0.12, d: deskLen });
}

function emitBunkFrame(slot: SlotDraft & { index: number }, roomWidth: number, palette: (typeof PALETTES)[Brief["style"]], solids: Solid[]) {
  const side = slot.side;
  const xCenter = side * (roomWidth / 2 - BUNK_W / 2);
  const z0 = slot.z - BUNK_LEN / 2;
  const z1 = slot.z + BUNK_LEN / 2;
  const id = slot.id;
  const innerX = xCenter - side * (BUNK_W / 2);
  for (const [cx, cz] of [
    [xCenter - BUNK_W / 2 + 0.04, z0 + 0.04],
    [xCenter + BUNK_W / 2 - 0.04, z0 + 0.04],
    [xCenter - BUNK_W / 2 + 0.04, z1 - 0.04],
    [xCenter + BUNK_W / 2 - 0.04, z1 - 0.04],
  ] as const) {
    solids.push(piece(`${id}-post-${cx}-${cz}`, "post", [cx, 0.9, cz], [0.04, 1.8, 0.04], palette.metal, 0.38, 0.62));
  }
  solids.push(
    piece(`${id}-deck-lower`, "deck", [xCenter, 0.34, slot.z], [BUNK_W - 0.04, 0.04, BUNK_LEN - 0.06], palette.woodDark, 0.6, 0.08),
    piece(`${id}-deck-upper`, "deck", [xCenter, 1.38, slot.z], [BUNK_W - 0.04, 0.04, BUNK_LEN - 0.06], palette.woodDark, 0.6, 0.08),
    piece(`${id}-rail`, "rail", [innerX + side * 0.06, 1.62, slot.z], [0.035, 0.06, BUNK_LEN - 0.3], palette.metal, 0.4, 0.5),
  );
  emitLadder(`${id}-ladder`, innerX + side * 0.14, z1 - 0.2, palette.metal, solids);
}

function emitSingle(
  slot: SlotDraft & { index: number },
  spec: (typeof ROOMS)[Brief["roomType"]],
  palette: (typeof PALETTES)[Brief["style"]],
  selections: Selections,
  solids: Solid[],
  desks: DeskRec[],
) {
  const place = singlePlacement(spec);
  solids.push(
    piece("single-deck", "deck", [place.bedX, 0.28, place.bedZ], [place.bedW, 0.08, place.bedL], palette.woodDark, 0.6, 0.08, slot.index),
    piece("single-wardrobe", "wardrobe", [place.wardrobeX, 0.85, place.wardrobeZ], [0.5, 1.6, 0.46], palette.wood, 0.68, 0.04, slot.index),
  );
  const desk = { id: "single-desk", bedIndex: slot.index, x: place.deskX, y: 0.74, z: place.deskZ, w: place.deskW, d: place.deskD };
  solids.push(piece(desk.id, "desk", [desk.x, desk.y, desk.z], [desk.w, 0.045, desk.d], palette.wood, 0.62, 0.08, slot.index));
  solids.push(chairPiece("single-chair", desk.x, desk.z, selections, palette, slot.index));
  desks.push(desk);
}

function singlePlacement(spec: (typeof ROOMS)[Brief["roomType"]]) {
  const halfW = spec.width / 2;
  const halfD = spec.depth / 2;
  const bedW = 0.9;
  const bedL = 1.95;
  return {
    bedX: -halfW + 0.1 + bedW / 2,
    bedZ: -halfD + spec.windowZone + bedL / 2,
    bedW,
    bedL,
    deskX: 0.88,
    deskZ: -halfD + 0.36,
    deskW: 0.82,
    deskD: 0.46,
    wardrobeX: halfW - 0.34,
    wardrobeZ: halfD - 0.4,
  };
}

function emitBedding(
  slot: SlotDraft & { index: number },
  spec: (typeof ROOMS)[Brief["roomType"]],
  palette: (typeof PALETTES)[Brief["style"]],
  selections: Selections,
  occupied: boolean,
  solids: Solid[],
) {
  const name = BED_NAMES[slot.index]?.zh ?? "";
  const cloth = occupied ? linenColor(palette, selections.linen, slot.index) : palette.paper;
  if (slot.kind === "floor") {
    const place = singlePlacement(spec);
    solids.push(
      piece(`mattress-${slot.index}`, "mattress", [place.bedX, 0.42, place.bedZ], [place.bedW - 0.06, 0.12, place.bedL - 0.08], cloth, 0.86, 0, slot.index, undefined, `${name}床`),
      piece(`pillow-${slot.index}`, "pillow", [place.bedX, 0.5, place.bedZ - place.bedL / 2 + 0.24], [0.42, 0.08, 0.28], palette.paper, 0.9, 0, slot.index),
    );
    return;
  }
  const roomWidth = spec.width;
  const span = slot.kind === "loft" ? LOFT_W : BUNK_W;
  const length = slot.kind === "loft" ? 1.9 : BUNK_LEN - 0.12;
  const xCenter = slot.side * (roomWidth / 2 - span / 2);
  const y = slot.level === "upper" ? 1.5 : slot.level === "lower" ? 0.46 : 1.68;
  const z = slot.kind === "loft" ? slot.z - LOFT_LEN / 2 + 1.02 : slot.z;
  solids.push(
    piece(`mattress-${slot.index}`, "mattress", [xCenter, y, z], [span - 0.12, 0.1, length], cloth, 0.86, 0, slot.index, undefined, `${name}床`),
    piece(`pillow-${slot.index}`, "pillow", [xCenter, y + 0.08, z - length / 2 + 0.22], [0.4, 0.07, 0.26], palette.paper, 0.9, 0, slot.index),
  );
}

function emitWindowDesks(
  halfD: number,
  windowZone: number,
  count: number,
  palette: (typeof PALETTES)[Brief["style"]],
  selections: Selections,
  desks: DeskRec[],
  solids: Solid[],
) {
  const cols = 2;
  const rows = Math.ceil(count / cols);
  const gapZ = 0.06;
  const available = windowZone - 0.12;
  const deskD = Math.min(0.42, (available - gapZ * (rows - 1)) / rows);
  const deskW = 0.74;
  const gapX = 0.72;
  let z = -halfD + windowZone - 0.04 - deskD / 2;
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (const side of [-1, 1] as const) {
      if (index >= count) return;
      const x = side * (gapX / 2 + deskW / 2);
      const id = `window-desk-${index}`;
      solids.push(piece(id, "desk", [x, 0.74, z], [deskW, 0.045, deskD], palette.wood, 0.62, 0.08, index));
      solids.push(chairPiece(`window-chair-${index}`, x, z, selections, palette, index));
      desks.push({ id, bedIndex: index, x, y: 0.76, z, w: deskW, d: deskD });
      index += 1;
    }
    z -= deskD + gapZ;
  }
}

function emitLamp(desk: DeskRec, selections: Selections, palette: (typeof PALETTES)[Brief["style"]], solids: Solid[]) {
  const shade = selections.lamp === "brass" ? "#e0b15a" : palette.lamp;
  const stem = selections.lamp === "brass" ? "#b8883d" : palette.metal;
  solids.push(
    piece(`lamp-stem-${desk.bedIndex}`, "lamp", [desk.x, desk.y + 0.16, desk.z], [0.05, 0.22, 0.05], stem, 0.35, 0.7, desk.bedIndex, "lamp"),
    piece(`lamp-shade-${desk.bedIndex}`, "lamp", [desk.x, desk.y + 0.3, desk.z], [0.14, 0.1, 0.14], shade, 0.45, 0.2, desk.bedIndex, "lamp"),
  );
}

function emitLadder(id: string, x: number, z: number, color: string, solids: Solid[]) {
  solids.push(
    piece(`${id}-a`, "ladder", [x - 0.09, 0.75, z], [0.035, 1.5, 0.035], color, 0.4, 0.55),
    piece(`${id}-b`, "ladder", [x + 0.09, 0.75, z], [0.035, 1.5, 0.035], color, 0.4, 0.55),
  );
  for (let step = 0; step < 4; step += 1) {
    solids.push(piece(`${id}-r${step}`, "ladder", [x, 0.28 + step * 0.32, z], [0.2, 0.025, 0.03], color, 0.4, 0.55));
  }
}

function chairPiece(
  id: string,
  x: number,
  z: number,
  selections: Selections,
  palette: (typeof PALETTES)[Brief["style"]],
  bedIndex: number,
): Solid {
  const color = selections.chair === "cushion" ? palette.linen[1] ?? palette.wool : selections.chair === "fold" ? palette.metal : palette.wood;
  const metalness = selections.chair === "fold" ? 0.55 : 0.05;
  return piece(id, "chair", [x, 0.24, z], [0.34, 0.46, 0.32], color, 0.7, metalness, bedIndex, "chair");
}

function piece(
  id: string,
  role: Solid["role"],
  position: [number, number, number],
  size: [number, number, number],
  color: string,
  roughness: number,
  metalness: number,
  bedIndex?: number,
  swapGroup?: Solid["swapGroup"],
  label?: string,
): Solid {
  return { id, role, position, size, rotationY: 0, color, roughness, metalness, bedIndex, swapGroup, label };
}

function linenColor(palette: (typeof PALETTES)[Brief["style"]], mode: Selections["linen"], index: number): string {
  if (mode === "cream") return palette.linen[0] ?? "#f0d7c4";
  if (mode === "dark") return palette.linenDark[index % palette.linenDark.length] ?? "#444";
  return palette.linen[index % palette.linen.length] ?? "#f0d7c4";
}

function buildPurchases(brief: Brief, selections: Selections): Purchase[] {
  const lampUnit = selections.lamp === "brass" ? 68 : 36;
  const curtainCost = selections.curtain === "warm" ? 69 : 46;
  return [
    line("lamp", selections.lamp === "brass" ? "黄铜台灯" : "夹子灯", selections.lamp === "brass" ? "Brass lamps" : "Clip lamps", lampUnit * selections.lampBeds, selections.lampBeds > 0, "晚上每个人先有一盏自己的灯。", "Each person gets a lamp before any decoration."),
    line("curtain", selections.curtain === "warm" ? "暖色窗帘" : "纱帘", selections.curtain === "warm" ? "Warm curtains" : "Sheer curtains", selections.curtain === "off" ? 0 : curtainCost, selections.curtain !== "off", "挡住眩光，但不把白天吃掉。", "Cut glare without eating the daylight."),
    line("mirror", "穿衣镜", "Mirror", selections.mirror === "on" ? 49 : 0, selections.mirror === "on", "北向或吉林的冬天，用一面镜子把仅有的光折回书桌。", "Bounce the little winter light back toward the desks."),
    line("plant", "绿萝", "Pothos", selections.plant === "pothos" ? 18 : 0, selections.plant === "pothos", "窗台一盆，不占地。", "One pot on the sill."),
    line("crate", "收纳箱", "Crate", selections.crate === "on" ? 22 : 0, selections.crate === "on", "空床或桌角的收纳，不进过道。", "Storage on a desk, not in the aisle."),
    line("rug", "窄地毯", "Runner", selections.rug === "runner" ? 79 : 0, selections.rug === "runner", "只在不需要轮椅的时候铺。", "Only when nobody needs a wheelchair."),
    line("cushion", "坐垫", "Seat pads", selections.chair === "cushion" ? 25 * brief.occupants : 0, selections.chair === "cushion", "椅子是学校的，坐垫才要花钱。", "The chairs stay; only the pads cost money."),
  ];
}

function line(id: string, nameZh: string, nameEn: string, cost: number, included: boolean, reasonZh: string, reasonEn: string): Purchase {
  return { id, nameZh, nameEn, cost, included, reasonZh, reasonEn };
}

function buildWarnings(
  brief: Brief,
  selections: Selections,
  kind: Plan["room"]["kind"],
  capacity: number,
  spent: number,
  reference: string | undefined,
): Warning[] {
  const warnings: Warning[] = [];
  if (brief.windowFacing === "north" || brief.windowFacing === "east") {
    warnings.push({
      code: "afternoon-dim",
      tone: "caution",
      zh: brief.windowFacing === "north" ? "北向下午几乎没有直射。衣柜让开窗，灯比地毯优先。" : "东向到了下午直射就没了，按北向来补灯。",
      en: brief.windowFacing === "north" ? "A north window gets almost no direct afternoon sun. Lamps come before rugs." : "An east window is already dim by afternoon, so it is lit like a north window.",
    });
  }
  if (brief.campus === "jilin") {
    warnings.push({
      code: "jilin-dusk",
      tone: "info",
      zh: "吉林一带十一月下午四点天就暗下来。方案按这个钟点来留窗、加台灯。",
      en: "Around Jilin in November it is dark by four. The plan keeps the window clear and puts lamps on the desks.",
    });
  }
  if (brief.windowFacing === "south" || brief.windowFacing === "west") {
    warnings.push({
      code: "glare",
      tone: "info",
      zh: "下午有直射，纱帘只挡眩光，窗洞中间不放柜子。",
      en: "Afternoon sun can glare. Sheers cut it; the middle of the window stays empty.",
    });
  }
  if (brief.accessible && kind === "loft") {
    warnings.push({
      code: "loft-no-lower",
      tone: "caution",
      zh: "上床下桌没有下铺，人还是得爬上去睡。这里只保证过道净宽、灯和桌下不堆东西，不能把它说成无障碍验收。",
      en: "A loft bed still means climbing. This plan keeps a clear aisle and the desks; it is not an accessibility certification.",
    });
  }
  if (brief.accessible && kind === "bunk") {
    warnings.push({
      code: "bunk-lower",
      tone: "info",
      zh: "需要进出方便的同学排在靠门的下铺。上铺没有改成平床。",
      en: "The person who needs easier access is assigned the lower bunk nearest the door.",
    });
  }
  if (brief.accessible) {
    warnings.push({
      code: "aisle-note",
      tone: "info",
      zh: "保留了 0.9 米过道，不铺地毯，也不加床帘。单间若不够 1.5 米回转，是房型限制。",
      en: "The aisle is kept at 0.9 m, without a rug or bed curtains. A full 1.5 m turning circle may not fit the shell.",
    });
  }
  if (brief.occupants < capacity) {
    warnings.push({
      code: "vacant-bed",
      tone: "info",
      zh: "空床的架子不动，桌面当公共收纳。学校的家具通常不能拆走。",
      en: "Empty frames stay. Their desks become shared storage; campus furniture usually cannot be removed.",
    });
  }
  if (spent === 0) {
    warnings.push({ code: "no-buy", tone: "info", zh: "预算是 0，所以只挪位置，不买新东西。", en: "The budget is zero, so this only moves what is already there." });
  }
  if (spent > brief.budgetCny + 0.001) {
    warnings.push({ code: "over-budget", tone: "caution", zh: "这个替换超出了预算，收据上会标红，方便跟室友争论。", en: "This swap is over budget. The receipt marks it so roommates can argue with the number." });
  }
  if (selections.linen === "dark") {
    warnings.push({ code: "dark-linen", tone: "caution", zh: "深色床品在冬天会把不多的光再吃掉一层。", en: "Dark bedding swallows what little winter light there is." });
  }
  if (selections.lamp !== "off" && selections.lampBeds < brief.occupants) {
    warnings.push({ code: "partial-lamps", tone: "info", zh: "灯的钱不够每人一盏，先给靠门、优先的床位。", en: "There is not enough money for every lamp, so the door-side beds come first." });
  }
  if (brief.reference.publicUrl && !reference) {
    warnings.push({ code: "reference-url", tone: "caution", zh: "参考图地址不是可用的 https 链接，没有写进 Lux3D 请求。", en: "The reference URL is not a usable https link, so it was left out of the Lux3D request." });
  }
  if (brief.reference.palette.length > 0) {
    warnings.push({ code: "palette-local", tone: "info", zh: "上传的照片只在这台设备上取了颜色，没有被当成生成结果。", en: "The uploaded photo was only sampled for color on this device. It is not a generated model." });
  }
  return warnings;
}

function buildAssets(brief: Brief, selections: Selections, kind: Plan["room"]["kind"], reference: string | undefined): LuxAssetSpec[] {
  const tail = `${styleWords(brief.style)}, no people, no room, single object`;
  const assets: LuxAssetSpec[] = [
    specAsset(
      "bed",
      "床架",
      "Bed frame",
      kind === "loft"
        ? `Generate a high-quality 3D university dorm loft bed module with a metal frame, wooden desktop, small wardrobe and ladder, ${tail}`
        : kind === "bunk"
          ? `Generate a high-quality 3D metal university dorm bunk bed with two mattresses and a ladder, ${tail}`
          : `Generate a high-quality 3D simple wooden single bed for a small dorm room, ${tail}`,
      brief,
    ),
    specAsset(
      "chair",
      "椅子",
      "Chair",
      `Generate a high-quality 3D compact dorm chair without wheels, ${selections.chair} seat, ${tail}`,
      brief,
      reference,
    ),
  ];
  if (selections.lampBeds > 0) {
    assets.push(specAsset("lamp", "台灯", "Desk lamp", `Generate a high-quality 3D small dorm desk lamp, ${selections.lamp === "brass" ? "brass" : "clip-on"}, ${tail}`, brief));
  }
  if (selections.plant === "pothos") {
    assets.push(specAsset("plant", "绿萝", "Pothos", `Generate a high-quality 3D pothos in a small ceramic pot, ${tail}`, brief));
  }
  if (selections.crate === "on") {
    assets.push(specAsset("crate", "收纳箱", "Crate", `Generate a high-quality 3D small wooden storage crate with a lid, ${tail}`, brief));
  }
  if (selections.curtain !== "off") {
    assets.push(specAsset("curtain", "窗帘", "Curtain", `Generate a high-quality 3D single dorm curtain panel, ${selections.curtain === "warm" ? "warm woven cloth" : "sheer off-white cloth"}, ${tail}`, brief));
  }
  return assets;
}

function specAsset(id: string, nameZh: string, nameEn: string, prompt: string, brief: Brief, referenceUrl?: string): LuxAssetSpec {
  return {
    id,
    nameZh,
    nameEn,
    prompt,
    style: styleLux(brief.style),
    version: PRODUCT_VERSION,
    faceCount: PRODUCT_FACE_COUNT,
    outputFormat: ["zip", "glb"],
    enablePbr: true,
    aiPredictSize: true,
    referenceUrl,
  };
}

function audit(plan: Plan): FieldError[] {
  const errors: FieldError[] = [];
  const corridorBox: Aabb = { minX: plan.corridor.minX, maxX: plan.corridor.maxX, minZ: plan.corridor.minZ, maxZ: plan.corridor.maxZ, minY: 0, maxY: 1.35 };
  for (const solid of plan.solids) {
    if (blocksWalk(solid) && intersects(aabbOf(solid), corridorBox)) {
      errors.push({ code: "aisle", zh: "过道被家具挡住了。", en: "Furniture blocks the aisle.", detail: solid.id });
    }
    if (intersects(aabbOf(solid), plan.windowOpening)) {
      errors.push({ code: "window", zh: "有东西挡在窗洞上。", en: "Something covers the window opening.", detail: solid.id });
    }
    if (solid.role === "wardrobe" && aabbOf(solid).minZ < plan.corridor.minZ - 0.02) {
      errors.push({ code: "wardrobe-window", zh: "衣柜伸进了窗区。", en: "A wardrobe reaches into the window zone.", detail: solid.id });
    }
    const box = aabbOf(solid);
    const limitX = plan.room.width / 2 + 0.03;
    const limitZ = plan.room.depth / 2 + 0.04;
    if (box.minX < -limitX || box.maxX > limitX || box.minZ < -limitZ || box.maxZ > limitZ || box.minY < -0.02 || box.maxY > plan.room.height + 0.08) {
      errors.push({ code: "bounds", zh: "有家具伸到房间外面。", en: "A piece sticks out of the room.", detail: solid.id });
    }
  }
  if (plan.beds.length !== plan.room.capacity) {
    errors.push({ code: "capacity", zh: "床位数量和房型对不上。", en: "Bed count does not match the room type." });
  }
  return errors;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
