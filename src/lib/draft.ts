import type { Campus, Facing, RoomType, StyleId } from "./planner/types.ts";

export type Draft = {
  campus: Campus | null;
  roomType: RoomType | null;
  occupants: number | null;
  budgetCny: number | null;
  accessible: boolean;
  windowFacing: Facing | null;
  style: StyleId | null;
  notes: string;
  fileName?: string;
  palette: string[];
  publicUrl: string;
  photoError?: string;
};

export const EMPTY_DRAFT: Draft = {
  campus: null,
  roomType: null,
  occupants: null,
  budgetCny: null,
  accessible: false,
  windowFacing: null,
  style: null,
  notes: "",
  palette: [],
  publicUrl: "",
};
