import { describe, expect, it } from "vitest";
import { dominantColors } from "../color/sample.ts";
import { moveWithCollision } from "./geometry.ts";
import { applyVariant, planDorm, publicImageUrl } from "./plan.ts";
import { PRESETS } from "./presets.ts";
import { ROOMS } from "./rooms.ts";
import { roommateScript, shotList } from "./script.ts";
import type { Brief, Facing, RoomType } from "./types.ts";

function brief(overrides: Partial<Brief> = {}): Brief {
  return {
    campus: "jilin",
    roomType: "loft-quad",
    occupants: 4,
    budgetCny: 800,
    accessible: false,
    windowFacing: "south",
    style: "warm-wood",
    notes: "",
    reference: { palette: [] },
    ...overrides,
  };
}

describe("planner", () => {
  it("keeps every supported room inside the aisle, the window, and the budget", () => {
    const facings: Facing[] = ["south", "north", "east", "west"];
    for (const roomType of Object.keys(ROOMS) as RoomType[]) {
      for (const budgetCny of [0, 300, 800, 1500]) {
        for (const accessible of [false, true]) {
          for (const windowFacing of facings) {
            const result = planDorm(brief({ roomType, occupants: ROOMS[roomType].capacity, budgetCny, accessible, windowFacing, campus: "north" }));
            expect(result.ok, JSON.stringify(result)).toBe(true);
            if (!result.ok) continue;
            expect(result.plan.spent).toBeLessThanOrEqual(budgetCny);
            expect(result.plan.corridor.clearWidth).toBe(0.9);
            expect(result.plan.beds).toHaveLength(ROOMS[roomType].capacity);
          }
        }
      }
    }
  });

  it("spends a tight six-person budget on lamps before a rug", () => {
    const preset = PRESETS.find((item) => item.id === "tight-six");
    expect(preset).toBeTruthy();
    const result = planDorm(preset!.brief);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const included = result.plan.purchases.filter((item) => item.included).map((item) => item.id);
    expect(included).toContain("lamp");
    expect(included).not.toContain("rug");
    expect(result.plan.spent).toBeLessThanOrEqual(300);
    expect(result.plan.warnings.some((warning) => warning.code === "afternoon-dim")).toBe(true);
  });

  it("does not pretend a loft is wheelchair sleeping space", () => {
    const result = planDorm(PRESETS.find((item) => item.id === "wheel")!.brief);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.warnings.some((warning) => warning.code === "loft-no-lower")).toBe(true);
    expect(result.plan.selections.rug).toBe("off");
    expect(result.plan.beds[0]?.accessiblePriority).toBe(true);
    expect(result.plan.beds[0]?.level).toBe("loft");
  });

  it("keeps an empty frame and gives it shared-storage copy", () => {
    const result = planDorm(PRESETS.find((item) => item.id === "one-empty")!.brief);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.beds.filter((bed) => !bed.occupied)).toHaveLength(1);
    expect(result.plan.warnings.some((warning) => warning.code === "vacant-bed")).toBe(true);
    const vacant = result.plan.beds.find((bed) => !bed.occupied);
    const mattress = result.plan.solids.find((solid) => solid.role === "mattress" && solid.bedIndex === vacant?.index);
    const occupiedMattress = result.plan.solids.find((solid) => solid.role === "mattress" && solid.bedIndex === 0);
    expect(mattress?.color).not.toBe(occupiedMattress?.color);
  });

  it("rejects impossible briefs without building a room", () => {
    const result = planDorm(brief({ occupants: 0, budgetCny: -5 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["occupants", "budget"]));
  });

  it("flags a brass upgrade that breaks a small budget", () => {
    const result = planDorm(brief({ budgetCny: 144, occupants: 4 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const upgraded = applyVariant(result.plan, "lamp", "brass");
    expect(upgraded.ok).toBe(true);
    if (!upgraded.ok) return;
    expect(upgraded.plan.overBudget).toBe(true);
    expect(upgraded.plan.warnings.some((warning) => warning.code === "over-budget")).toBe(true);
  });

  it("writes Lux3D prompts as single objects and only attaches a real https image", () => {
    const bad = planDorm(brief({ reference: { palette: ["#aa8866"], publicUrl: "data:image/png;base64,aaaa" } }));
    expect(bad.ok).toBe(true);
    if (!bad.ok) return;
    expect(bad.plan.luxAssets.every((asset) => asset.referenceUrl === undefined)).toBe(true);
    expect(bad.plan.warnings.some((warning) => warning.code === "reference-url")).toBe(true);
    for (const asset of bad.plan.luxAssets) {
      expect(asset.prompt).toContain("no people");
      expect(asset.prompt).toContain("single object");
      expect(asset.faceCount).toBeGreaterThanOrEqual(10_000);
      expect(asset.faceCount).toBeLessThanOrEqual(300_000);
      expect(asset.outputFormat).toContain("glb");
      expect(asset.version).toBe("G1");
    }
    const good = planDorm(brief({ reference: { palette: [], publicUrl: "https://cdn.example.com/chair.jpg" } }));
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    const chair = good.plan.luxAssets.find((asset) => asset.id === "chair");
    const bed = good.plan.luxAssets.find((asset) => asset.id === "bed");
    expect(chair?.referenceUrl).toBe("https://cdn.example.com/chair.jpg");
    expect(bed?.referenceUrl).toBeUndefined();
  });

  it("tells roommates the aisle width and that the demo is not Lux3D", () => {
    const result = planDorm(PRESETS[0]!.brief);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = roommateScript(result.plan, "zh");
    expect(text).toContain("0.9");
    expect(text).toContain("不是 Lux3D");
    expect(text).toContain("南");
    const shots = shotList(result.plan);
    expect(shots.map((shot) => shot.id)).toContain("door");
    for (const shot of shots) {
      expect(Math.abs(shot.position[0])).toBeLessThan(result.plan.room.width / 2);
      expect(Math.abs(shot.position[2])).toBeLessThan(result.plan.room.depth / 2);
    }
  });

  it("stops a walker at a wardrobe", () => {
    const result = planDorm(brief());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const wardrobe = result.plan.solids.find((solid) => solid.role === "wardrobe");
    expect(wardrobe).toBeTruthy();
    const next = moveWithCollision({ x: 0, z: 0 }, { x: 2, y: 0 } as never, 0.2, result.plan.room, []);
    expect(next.x).toBeLessThan(result.plan.room.width / 2);
    void wardrobe;
  });
});

describe("local photo colors", () => {
  it("picks the dominant bucket and ignores white", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255,
      200, 40, 40, 255,
      200, 40, 40, 255,
      200, 40, 40, 255,
      20, 40, 180, 255,
    ]);
    expect(dominantColors(pixels, 2)[0]).toBe("#c82828");
  });
});

describe("public image urls", () => {
  it("rejects data urls and accepts https", () => {
    expect(publicImageUrl("data:image/png;base64,aaaa")).toBeUndefined();
    expect(publicImageUrl("http://example.com/a.jpg")).toBeUndefined();
    expect(publicImageUrl("https://user:pass@example.com/a.jpg")).toBeUndefined();
    expect(publicImageUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
  });
});
