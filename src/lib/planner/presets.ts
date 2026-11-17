import type { Brief } from "./types.ts";

export type Preset = {
  id: string;
  titleZh: string;
  titleEn: string;
  blurbZh: string;
  blurbEn: string;
  brief: Brief;
};

export const PRESETS: Preset[] = [
  {
    id: "jilin-south",
    titleZh: "吉林，四人，南窗",
    titleEn: "Jilin, four lofts, south window",
    blurbZh: "十一月下午四点，靠窗的书桌还想留一点太阳。",
    blurbEn: "A November afternoon. Keep a little sun on the desks.",
    brief: {
      campus: "jilin",
      roomType: "loft-quad",
      occupants: 4,
      budgetCny: 800,
      accessible: false,
      windowFacing: "south",
      style: "warm-wood",
      notes: "晚自习别只靠一盏顶灯。衣柜不要挡窗。",
      reference: { palette: [] },
    },
  },
  {
    id: "tight-six",
    titleZh: "六人间，预算三百",
    titleEn: "Six bunks, ¥300",
    blurbZh: "人多，钱少。先解决灯，地毯以后再说。",
    blurbEn: "Too many people, not much money. Lamps first.",
    brief: {
      campus: "north",
      roomType: "bunk-six",
      occupants: 6,
      budgetCny: 300,
      accessible: false,
      windowFacing: "north",
      style: "cool-ink",
      notes: "",
      reference: { palette: [] },
    },
  },
  {
    id: "wheel",
    titleZh: "双人间，要过轮椅",
    titleEn: "Double room, wheelchair",
    blurbZh: "床还是学校的上床下桌。我们只保证过道、灯，和不加床帘。",
    blurbEn: "The school loft stays. We keep the aisle and the lamps, and skip bed curtains.",
    brief: {
      campus: "north",
      roomType: "loft-double",
      occupants: 2,
      budgetCny: 1200,
      accessible: true,
      windowFacing: "south",
      style: "warm-wood",
      notes: "甲床同学进出需要轮椅。",
      reference: { palette: [] },
    },
  },
  {
    id: "one-empty",
    titleZh: "四人间，空出一张",
    titleEn: "Quad with an empty bed",
    blurbZh: "丁床的人下学期才来。床架不动，桌面先当公共收纳。",
    blurbEn: "One roommate arrives next term. The frame stays; the desk becomes shared storage.",
    brief: {
      campus: "other",
      roomType: "loft-quad",
      occupants: 3,
      budgetCny: 500,
      accessible: false,
      windowFacing: "east",
      style: "poster",
      notes: "",
      reference: { palette: [] },
    },
  },
];
