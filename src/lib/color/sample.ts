/** Average the strongest non-white buckets. Used only as a local swatch. */
export function dominantColors(pixels: Uint8ClampedArray, count = 3): string[] {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 0;
    if (alpha < 128) continue;
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    if (r > 245 && g > 245 && b > 245) continue;
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    const current = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    current.n += 1;
    current.r += r;
    current.g += g;
    current.b += b;
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.n);
      const g = Math.round(bucket.g / bucket.n);
      const b = Math.round(bucket.b / bucket.n);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    });
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}
