export type RoomType = "loft-quad" | "bunk-quad" | "loft-double" | "bunk-six" | "grad-single";
export type Campus = "jilin" | "north" | "other";
export type Facing = "south" | "north" | "east" | "west";
export type StyleId = "warm-wood" | "cool-ink" | "poster";
export type RoomKind = "loft" | "bunk" | "single";
export type SleepLevel = "loft" | "lower" | "upper" | "floor";

export type Reference = {
  fileName?: string;
  /** Local swatches only. Never treated as a Lux3D result. */
  palette: string[];
  /** Public https URL the student already hosts. Optional img field for one asset. */
  publicUrl?: string;
};

export type Brief = {
  campus: Campus;
  roomType: RoomType;
  occupants: number;
  budgetCny: number;
  accessible: boolean;
  windowFacing: Facing;
  style: StyleId;
  notes: string;
  reference: Reference;
};

export type Selections = {
  linen: "colors" | "cream" | "dark";
  chair: "oak" | "cushion" | "fold";
  lamp: "clip" | "brass" | "off";
  curtain: "sheer" | "warm" | "off";
  plant: "pothos" | "off";
  rug: "runner" | "off";
  mirror: "on" | "off";
  crate: "on" | "off";
  /** How many occupied beds get a lamp, door-priority order. */
  lampBeds: number;
};

export type SolidRole =
  | "post"
  | "deck"
  | "mattress"
  | "pillow"
  | "rail"
  | "ladder"
  | "desk"
  | "chair"
  | "wardrobe"
  | "lamp"
  | "plant"
  | "rug"
  | "mirror"
  | "curtain"
  | "crate"
  | "radiator"
  | "sign"
  | "door"
  | "shelf";

export type Solid = {
  id: string;
  role: SolidRole;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  color: string;
  roughness: number;
  metalness: number;
  bedIndex?: number;
  label?: string;
  swapGroup?: keyof Selections;
};

export type Aabb = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type BedSlot = {
  index: number;
  frameId: string;
  level: SleepLevel;
  nameZh: string;
  nameEn: string;
  occupied: boolean;
  accessiblePriority: boolean;
};

export type Purchase = {
  id: string;
  nameZh: string;
  nameEn: string;
  cost: number;
  included: boolean;
  reasonZh: string;
  reasonEn: string;
};

export type Warning = {
  code: string;
  tone: "info" | "caution";
  zh: string;
  en: string;
};

export type LuxStyle =
  | "photorealistic"
  | "cartoon"
  | "anime"
  | "hand_painted"
  | "cyberpunk"
  | "fantasy"
  | "glass";

export type LuxAssetSpec = {
  id: string;
  nameZh: string;
  nameEn: string;
  prompt: string;
  style: LuxStyle;
  version: "G1" | "G1-Turbo";
  faceCount: number;
  outputFormat: Array<"zip" | "glb" | "ply">;
  enablePbr: boolean;
  aiPredictSize: boolean;
  /** Attached only when the student supplied a public https URL. */
  referenceUrl?: string;
};

export type Plan = {
  brief: Brief;
  selections: Selections;
  room: {
    type: RoomType;
    kind: RoomKind;
    nameZh: string;
    nameEn: string;
    width: number;
    depth: number;
    height: number;
    windowZone: number;
    doorClear: number;
    capacity: number;
  };
  corridor: { minX: number; maxX: number; minZ: number; maxZ: number; clearWidth: number };
  windowOpening: Aabb;
  solids: Solid[];
  beds: BedSlot[];
  purchases: Purchase[];
  spent: number;
  remaining: number;
  overBudget: boolean;
  warnings: Warning[];
  lighting: { afternoonDirect: boolean; taskKelvin: number };
  luxAssets: LuxAssetSpec[];
};

export type FieldError = { code: string; zh: string; en: string; detail?: string };

export type PlanResult = { ok: true; plan: Plan } | { ok: false; errors: FieldError[] };

export const BED_NAMES = [
  { zh: "甲", en: "A" },
  { zh: "乙", en: "B" },
  { zh: "丙", en: "C" },
  { zh: "丁", en: "D" },
  { zh: "戊", en: "E" },
  { zh: "己", en: "F" },
] as const;

export const PRODUCT_FACE_COUNT = 120_000;
export const PRODUCT_VERSION = "G1" as const;
