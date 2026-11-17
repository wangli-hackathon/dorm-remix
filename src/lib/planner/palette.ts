import type { StyleId } from "./types.ts";

export type RoomPalette = {
  wall: string;
  floor: string;
  metal: string;
  wood: string;
  woodDark: string;
  linen: string[];
  linenDark: string[];
  lamp: string;
  leaf: string;
  wool: string;
  paper: string;
  glass: string;
  crate: string;
};

export const PALETTES: Record<StyleId, RoomPalette> = {
  "warm-wood": {
    wall: "#f4efe4",
    floor: "#c4a078",
    metal: "#8d949b",
    wood: "#b5814a",
    woodDark: "#8a5a30",
    linen: ["#f0d7c4", "#e4c3b4", "#d7c4a4", "#eddcc8"],
    linenDark: ["#6e5344", "#5c4a42", "#4e4038", "#7a624f"],
    lamp: "#e2a04a",
    leaf: "#6d8a5c",
    wool: "#a85a3e",
    paper: "#f7f1e6",
    glass: "#c5d5e4",
    crate: "#c9894e",
  },
  "cool-ink": {
    wall: "#f2f3f4",
    floor: "#b7b1a6",
    metal: "#6e757c",
    wood: "#c3beb4",
    woodDark: "#8e8a84",
    linen: ["#d5dde6", "#c9d3df", "#e4e7ea", "#b7c6d4"],
    linenDark: ["#3e4a57", "#4d5966", "#2f3842", "#596674"],
    lamp: "#d7dee6",
    leaf: "#5f7d72",
    wool: "#6d7c8a",
    paper: "#f4f6f7",
    glass: "#d5e2ee",
    crate: "#9aa3ab",
  },
  poster: {
    wall: "#f6f0e4",
    floor: "#d2b48a",
    metal: "#3f4a55",
    wood: "#e0b15a",
    woodDark: "#c46a4a",
    linen: ["#f2d0c2", "#c9d7ee", "#f3e2a6", "#d7e3cf"],
    linenDark: ["#6a3b32", "#31445f", "#6d5a2e", "#3d5344"],
    lamp: "#ee8b4a",
    leaf: "#3f8f62",
    wool: "#d4523e",
    paper: "#fff8ea",
    glass: "#d5e4f2",
    crate: "#ef9a4a",
  },
};

export function styleLux(style: StyleId): "photorealistic" | "hand_painted" {
  return style === "poster" ? "hand_painted" : "photorealistic";
}

export function styleWords(style: StyleId): string {
  if (style === "warm-wood") return "oak and warm cotton, small brass details";
  if (style === "cool-ink") return "pale ash wood, blue-gray linen, matte black metal";
  return "playful hand-painted surfaces, simple bold shapes, paper-poster colors";
}
