import type { RoomKind, RoomType } from "./types.ts";

export type RoomSpec = {
  type: RoomType;
  kind: RoomKind;
  nameZh: string;
  nameEn: string;
  width: number;
  depth: number;
  height: number;
  /** Sleepers, not frames. A bunk frame counts as two. */
  capacity: number;
  windowZone: number;
  doorClear: number;
  /** Bed frames along -X (left) and +X (right) when looking from the door toward the window. */
  framesLeft: number;
  framesRight: number;
};

/**
 * Approximate Chinese university dorm shells, in meters.
 * They are planning assumptions for the remix, not a survey of one campus.
 */
export const ROOMS: Record<RoomType, RoomSpec> = {
  "loft-quad": {
    type: "loft-quad",
    kind: "loft",
    nameZh: "四人上床下桌",
    nameEn: "Four loft beds",
    width: 3.4,
    depth: 5.7,
    height: 2.8,
    capacity: 4,
    windowZone: 0.52,
    doorClear: 0.7,
    framesLeft: 2,
    framesRight: 2,
  },
  "loft-double": {
    type: "loft-double",
    kind: "loft",
    nameZh: "双人上床下桌",
    nameEn: "Two loft beds",
    width: 3.3,
    depth: 4.4,
    height: 2.8,
    capacity: 2,
    windowZone: 0.55,
    doorClear: 0.7,
    framesLeft: 1,
    framesRight: 1,
  },
  "bunk-quad": {
    type: "bunk-quad",
    kind: "bunk",
    nameZh: "四人上下铺",
    nameEn: "Two bunk frames, four sleepers",
    width: 3.4,
    depth: 5.2,
    height: 2.8,
    capacity: 4,
    windowZone: 1.22,
    doorClear: 0.62,
    framesLeft: 1,
    framesRight: 1,
  },
  "bunk-six": {
    type: "bunk-six",
    kind: "bunk",
    nameZh: "六人上下铺",
    nameEn: "Three bunk frames, six sleepers",
    width: 3.4,
    depth: 6.6,
    height: 2.8,
    capacity: 6,
    windowZone: 1.4,
    doorClear: 0.6,
    framesLeft: 2,
    framesRight: 1,
  },
  "grad-single": {
    type: "grad-single",
    kind: "single",
    nameZh: "单人间",
    nameEn: "Single room",
    width: 3.1,
    depth: 4.0,
    height: 2.8,
    capacity: 1,
    windowZone: 0.78,
    doorClear: 0.62,
    framesLeft: 1,
    framesRight: 0,
  },
};

export const CORRIDOR_WIDTH = 0.9;
