import type { Aabb, Solid } from "./types.ts";

export function aabbOf(solid: Solid): Aabb {
  const [x, y, z] = solid.position;
  const [w, h, d] = solid.size;
  return {
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y - h / 2,
    maxY: y + h / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  };
}

export function intersects(a: Aabb, b: Aabb): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function intersectsXZ(a: Aabb, b: Pick<Aabb, "minX" | "maxX" | "minZ" | "maxZ">): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Furniture a walking person cannot pass through. High bunks stay walkable underneath. */
export function blocksWalk(solid: Solid): boolean {
  if (solid.role === "rug" || solid.role === "sign" || solid.role === "curtain" || solid.role === "mirror" || solid.role === "radiator" || solid.role === "lamp" || solid.role === "plant" || solid.role === "door") {
    return false;
  }
  const box = aabbOf(solid);
  return box.minY < 1.32 && box.maxY > 0.2;
}

export function moveWithCollision(
  pos: { x: number; z: number },
  delta: { x: number; z: number },
  radius: number,
  room: { width: number; depth: number },
  boxes: Aabb[],
): { x: number; z: number } {
  let x = pos.x + delta.x;
  let z = pos.z;
  if (circleHits(x, z, radius, boxes)) x = pos.x;
  z = pos.z + delta.z;
  if (circleHits(x, z, radius, boxes)) z = pos.z;
  const limitX = room.width / 2 - radius;
  const limitZ = room.depth / 2 - radius;
  x = Math.min(limitX, Math.max(-limitX, x));
  z = Math.min(limitZ, Math.max(-limitZ, z));
  return { x, z };
}

function circleHits(x: number, z: number, radius: number, boxes: Aabb[]): boolean {
  return boxes.some((box) => x > box.minX - radius && x < box.maxX + radius && z > box.minZ - radius && z < box.maxZ + radius);
}

export function roundMeter(value: number): number {
  return Math.round(value * 1000) / 1000;
}
