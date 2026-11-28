// Cream laid paper: soft mottling, fine grain, a few fibres, gentle vignette.
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { noise2, rng } from "./rng.ts";
import { palette } from "./style.ts";

const cache = new Map<string, Canvas>();

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function paper(w: number, h: number, seed = 3, color: string = palette.paper): Canvas {
  const key = `${w}x${h}:${seed}:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const [R, G, B] = hex(color);
  const r = rng(seed);
  const n1 = noise2(seed), n2 = noise2(seed + 1);
  const s = w / 1920;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const mott = n1(x / (260 * s), y / (260 * s)) * 0.65 + n2(x / (70 * s), y / (70 * s)) * 0.35;
      const grain = (r() - 0.5) * 7;
      const dx = x / w - 0.5, dy = y / h - 0.5;
      const vig = 1 - (dx * dx + dy * dy) * 0.22;
      const k = vig * (1 + mott * 0.018);
      img.data[i] = Math.min(255, R * k + grain);
      img.data[i + 1] = Math.min(255, G * k + grain);
      img.data[i + 2] = Math.min(255, B * k * 0.995 + grain);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // faint fibres
  ctx.strokeStyle = "rgba(120,100,70,0.05)";
  ctx.lineWidth = 0.7 * s;
  for (let i = 0; i < 140; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI, l = (8 + r() * 26) * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 4, y + Math.sin(a) * l * 0.5 + r() * 4, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  cache.set(key, c);
  return c;
}

/** Speckle mask that eats a little ink, so lines look absorbed, not printed. */
export function inkTooth(w: number, h: number, seed = 5): Canvas {
  const key = `tooth:${w}x${h}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const r = rng(seed);
  for (let i = 0; i < w * h; i++) {
    const v = r();
    img.data[i * 4 + 3] = v > 0.86 ? Math.floor((v - 0.86) * 900) : 0;
  }
  ctx.putImageData(img, 0, 0);
  cache.set(key, c);
  return c;
}
