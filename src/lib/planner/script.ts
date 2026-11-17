import type { Plan } from "./types.ts";

export function roommateScript(plan: Plan, lang: "zh" | "en"): string {
  const facing = {
    south: ["南", "south"],
    north: ["北", "north"],
    east: ["东", "east"],
    west: ["西", "west"],
  }[plan.brief.windowFacing];
  const occupied = plan.beds.filter((bed) => bed.occupied).map((bed) => (lang === "zh" ? bed.nameZh : bed.nameEn));
  const vacant = plan.beds.filter((bed) => !bed.occupied).map((bed) => (lang === "zh" ? bed.nameZh : bed.nameEn));
  const bought = plan.purchases.filter((item) => item.included).map((item) => (lang === "zh" ? item.nameZh : item.nameEn));
  if (lang === "en") {
    return [
      `${plan.room.nameEn}, ${plan.room.width} m by ${plan.room.depth} m. The window faces ${facing[1]}.`,
      occupied.length ? `Occupied: ${occupied.join(", ")}.` : "Nobody is assigned yet.",
      vacant.length ? `Still empty, frames stay: ${vacant.join(", ")}.` : "Every bed is occupied.",
      `The clear aisle is ${plan.corridor.clearWidth} m. Wardrobes stay away from the window.`,
      `Budget ¥${plan.brief.budgetCny}, spent ¥${plan.spent}, left ¥${plan.remaining}.`,
      bought.length ? `Buying: ${bought.join(", ")}.` : "Buying nothing new.",
      plan.overBudget ? "This version is over budget." : "This version fits the budget.",
      "Furniture in the demo is a labeled stand-in, not a Lux3D model, until a real task result is loaded.",
      plan.brief.notes ? `Note: ${plan.brief.notes}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return [
    `这间是${plan.room.nameZh}，面宽 ${plan.room.width} 米，进深 ${plan.room.depth} 米，窗朝${facing[0]}。`,
    occupied.length ? `在住：${occupied.join("、")}。` : "还没排人。",
    vacant.length ? `空着但床架还在：${vacant.join("、")}。` : "床位都有人。",
    `过道净宽 ${plan.corridor.clearWidth} 米。衣柜不进窗区。`,
    `预算 ${plan.brief.budgetCny} 元，现在 ${plan.spent} 元，还剩 ${plan.remaining} 元。`,
    bought.length ? `要买：${bought.join("、")}。` : "不买新东西，只挪位置。",
    plan.overBudget ? "这一版超预算了。" : "这一版在预算里。",
    "演示房间里的家具是标好的本地替身，不是 Lux3D 生成结果。",
    plan.brief.notes ? `备注：${plan.brief.notes}` : "",
  ]
    .filter(Boolean)
    .join("");
}

export type Shot = {
  id: string;
  position: [number, number, number];
  target: [number, number, number];
  captionZh: string;
  captionEn: string;
};

export function shotList(plan: Plan): Shot[] {
  const { depth } = plan.room;
  const shots: Shot[] = [
    {
      id: "door",
      position: [0, 1.48, depth / 2 - 0.32],
      target: [0, 1.1, 0],
      captionZh: "从门口看全屋",
      captionEn: "From the door",
    },
    {
      id: "window",
      position: [0, 1.38, Math.min(plan.corridor.maxZ - 0.4, plan.corridor.minZ + 1.8)],
      target: [0, 1.15, -depth / 2 + 0.35],
      captionZh: "窗边还留着光",
      captionEn: "The window stays clear",
    },
    {
      id: "aisle",
      position: [0, 1.5, (plan.corridor.minZ + plan.corridor.maxZ) / 2],
      target: [0, 1.1, plan.corridor.minZ],
      captionZh: "过道中间",
      captionEn: "Down the aisle",
    },
  ];
  for (const bed of plan.beds.slice(0, 4)) {
    const mattress = plan.solids.find((solid) => solid.role === "mattress" && solid.bedIndex === bed.index);
    if (!mattress) continue;
    const towardAisle = mattress.position[0] === 0 ? 0.8 : Math.sign(mattress.position[0]) * -1;
    shots.push({
      id: `bed-${bed.index}`,
      position: [mattress.position[0] + towardAisle * 0.85, Math.min(1.55, mattress.position[1] + 0.15), mattress.position[2] + 0.15],
      target: mattress.position,
      captionZh: `${bed.nameZh}床`,
      captionEn: `Bed ${bed.nameEn}`,
    });
  }
  return shots;
}
