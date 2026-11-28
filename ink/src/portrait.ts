// Layer 2 component: an engraved portrait traced from a reference photo.
//
//   const t = await loadTone("assets/people/turing-1951.jpg");
//   const p = portrait(t, { height: 760 }).at(960, 540);
//   s.play(draw(p.outline, { duration: 4 }), ...);   // parts: outline, shade
//
// Pipeline: photo -> darkness map (levels, vignette) -> two kinds of ink:
//   outline  iso-lines of the blurred darkness (where tone crosses a level)
//   shade    layers of hatching. Each layer starts at a darker tone, its lines
//            follow the form (structure-tensor flow) and swell where it is darker,
//            like a burin line. Lines are spaced evenly (Jobard-Lefer streamlines).
// Every step is seeded, so the same photo always gives the same drawing.
import { Image, createCanvas } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { type Vec, clamp, v } from "./geom.ts";
import { Figure, Group } from "./node.ts";
import { rng } from "./rng.ts";
import { type Stroke, pen } from "./stroke.ts";
import { palette } from "./style.ts";

/** A darkness map: d[y * w + x] in 0 (paper) .. 1 (black). */
export type Tone = { w: number; h: number; d: Float32Array };

const tones = new Map<string, Tone>();

/** Read an image file (jpg/png/webp) into a darkness map, at most `maxSize` px on its long side. */
export async function loadTone(path: string, o: { maxSize?: number; mode?: "luma" | "ink" } = {}): Promise<Tone> {
  const key = `${path}@${o.maxSize ?? 900}${o.mode === "ink" ? ":ink" : ""}`;
  const hit = tones.get(key);
  if (hit) return hit;
  const img = new Image();
  await new Promise<void>((ok, fail) => {
    img.onload = () => ok();
    img.onerror = (e) => fail(e);
    img.src = readFileSync(path);
  });
  const k = Math.min(1, (o.maxSize ?? 900) / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; // transparent pixels count as paper
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const d = new Float32Array(w * h);
  // "ink": any colour counts as ink (a yellow logo is as solid as a black one)
  if (o.mode === "ink") for (let i = 0; i < w * h; i++) d[i] = 1 - Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) / 255;
  else for (let i = 0; i < w * h; i++) d[i] = 1 - (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
  const t = { w, h, d };
  tones.set(key, t);
  return t;
}

/** A darkness map that `loadTone` already read (images decode asynchronously, so sync code needs this). */
export function cachedTone(path: string, o: { maxSize?: number; mode?: "luma" | "ink" } = {}): Tone {
  const t = tones.get(`${path}@${o.maxSize ?? 900}${o.mode === "ink" ? ":ink" : ""}`);
  if (!t) throw new Error(`image not loaded yet: ${path} (await loadTone() first)`);
  return t;
}

/** Box blur, three passes (close to a Gaussian of sigma ~ r). */
export function blurTone(t: Tone, r: number): Tone {
  if (r < 1) return { ...t, d: t.d.slice() };
  const { w, h } = t;
  let a = t.d.slice(), b = new Float32Array(w * h);
  const R = Math.round(r);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -R; x <= R; x++) s += a[y * w + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = s / (2 * R + 1);
        s += a[y * w + Math.min(w - 1, x + R + 1)] - a[y * w + Math.max(0, x - R)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -R; y <= R; y++) s += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = s / (2 * R + 1);
        s += b[Math.min(h - 1, y + R + 1) * w + x] - b[Math.max(0, y - R) * w + x];
      }
    }
  }
  return { w, h, d: a };
}

/** Bilinear sample at source pixel coordinates. */
export function sampleTone(t: Tone, x: number, y: number) {
  if (x < 0 || y < 0 || x > t.w - 1 || y > t.h - 1) return 0;
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(t.w - 1, x0 + 1), y1 = Math.min(t.h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0, d = t.d, w = t.w;
  return (d[y0 * w + x0] * (1 - fx) + d[y0 * w + x1] * fx) * (1 - fy) + (d[y1 * w + x0] * (1 - fx) + d[y1 * w + x1] * fx) * fy;
}

function percentile(d: Float32Array, q: number) {
  const s = Float32Array.from(d).sort();
  return s[Math.floor(clamp(q) * (s.length - 1))];
}

/** Cut out part of a darkness map; the box is in fractions of its size: [x, y, w, h]. */
export function cropTone(t: Tone, box: [number, number, number, number]): Tone {
  const x0 = Math.round(box[0] * t.w), y0 = Math.round(box[1] * t.h);
  const w = Math.max(1, Math.min(t.w - x0, Math.round(box[2] * t.w))), h = Math.max(1, Math.min(t.h - y0, Math.round(box[3] * t.h)));
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) d.set(t.d.subarray((y0 + y) * t.w + x0, (y0 + y) * t.w + x0 + w), y * w);
  return { w, h, d };
}

export type PortraitOpts = {
  seed?: number;
  /** Cut-out of the subject (white = keep), e.g. from tools/mask.py; same size as the photo. */
  mask?: Tone;
  /** Draw the mask's edge as a contour too. */
  silhouette?: boolean;
  /** Use only this part of the photo: [x, y, w, h] as fractions. */
  crop?: [number, number, number, number];
  /** Output height in px; width follows the photo. */
  height?: number;
  /** Tone levels as percentiles of the photo: [paper, black]. */
  levels?: [number, number];
  /** Local contrast (unsharp mask strength), brings out eyes and lips inside shadows. */
  detail?: number;
  /** Contrast curve, > 1 lightens the midtones. */
  gamma?: number;
  /** Oval vignette in photo fractions: centre x, y, radius x, y, softness. false = none. */
  vignette?: false | { cx?: number; cy?: number; rx?: number; ry?: number; soft?: number };
  /** Iso-levels of the outline (darkness 0..1). [] = no outline. */
  outline?: number[];
  /** Blur (source px) before tracing the outline. */
  outlineBlur?: number;
  /** Feature lines (lids, lips, nostrils): iso-level of a difference of blurs. 0 = none. */
  features?: number;
  /** Shortest outline kept, in output px. */
  minOutline?: number;
  /** Hatching layers: from tone `at`, rotated `angle` rad from the flow, `spacing` px apart. */
  layers?: { at: number; angle: number; spacing?: number }[];
  /** Line spacing of the hatching, px. */
  spacing?: number;
  /** 0 = straight hatching at `angle`, 1 = follows the form wherever it is clear. */
  flow?: number;
  /** Base angle of the hatching (rad) where the form gives no direction. */
  angle?: number;
  /** Longest single hatch line, px (a hand lifts the pen). */
  maxLine?: number;
  width?: number;
  color?: string;
};

export type Portrait = Group & { outline: Figure; shade: Group; layers: Figure[]; tone: (p: Vec) => number };

/** An engraved portrait of a darkness map; centred on its origin, so `.at(x, y)` places its middle. */
export function portrait(src: Tone, o: PortraitOpts = {}): Portrait {
  let mask = o.mask && o.mask.w === src.w && o.mask.h === src.h ? o.mask : undefined;
  if (o.mask && !mask) console.warn("ink: portrait mask size differs from the photo; ignored");
  if (o.crop) { src = cropTone(src, o.crop); if (mask) mask = cropTone(mask, o.crop); }
  // a mask is stored as an image: white (darkness 0) = subject
  const keep = mask ? blurTone({ w: mask.w, h: mask.h, d: mask.d.map((x) => 1 - x) }, 1.5) : null;
  const seed = o.seed ?? 7;
  const H = o.height ?? 760;
  const k = H / src.h; // output px per source px
  const W = src.w * k;
  // ---- tone: levels, gamma, vignette
  const [qlo, qhi] = o.levels ?? [0.15, 0.99];
  const subject = keep ? src.d.filter((_, i) => keep.d[i] > 0.5) : src.d;
  const lo = percentile(subject.length > 100 ? subject : src.d, qlo), hi = percentile(subject.length > 100 ? subject : src.d, qhi);
  const g = o.gamma ?? 1.5;
  const vg = o.vignette === false ? null : { cx: 0.5, cy: 0.46, rx: 0.5, ry: 0.52, soft: 0.16, ...(o.vignette ?? {}) };
  const noise = rng(seed + 3);
  const lobes = Array.from({ length: 7 }, () => [noise.range(0, 6.28), noise.range(0.02, 0.06)]);
  const vigAt = (x: number, y: number) => {
    if (!vg) return 1;
    const dx = (x / src.w - vg.cx) / vg.rx, dy = (y / src.h - vg.cy) / vg.ry;
    const a = Math.atan2(dy, dx);
    let wob = 0;
    for (let i = 0; i < lobes.length; i++) wob += lobes[i][1] * Math.sin((i + 2) * a + lobes[i][0]);
    return clamp((1 - Math.hypot(dx, dy) * (1 + wob)) / vg.soft);
  };
  const base: Tone = { w: src.w, h: src.h, d: new Float32Array(src.d.length) };
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    let t = clamp((src.d[y * src.w + x] - lo) / Math.max(1e-6, hi - lo));
    t = Math.pow(t, g);
    if (vg) t *= vigAt(x, y);
    if (keep) t *= clamp((keep.d[y * src.w + x] - 0.15) / 0.6);
    base.d[y * src.w + x] = t;
  }
  const det = o.detail ?? 0.8;
  if (det > 0) {
    const wide = blurTone(base, Math.max(4, 14 / k));
    for (let i = 0; i < base.d.length; i++) base.d[i] = clamp(base.d[i] + det * (base.d[i] - wide.d[i]));
  }
  const tone = blurTone(base, 1.2 / Math.min(1, k));
  const toneAt = (p: Vec) => sampleTone(tone, p.x / k + src.w / 2, p.y / k + src.h / 2);

  // ---- flow: structure tensor of the blurred tone, as doubled-angle vectors
  const fs = blurTone(base, Math.max(2, 5 / k));
  const gw = src.w, gh = src.h;
  const jxx = new Float32Array(gw * gh), jxy = new Float32Array(gw * gh), jyy = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
    const i = y * gw + x;
    const gx = fs.d[i + 1] - fs.d[i - 1], gy = fs.d[i + gw] - fs.d[i - gw];
    jxx[i] = gx * gx; jxy[i] = gx * gy; jyy[i] = gy * gy;
  }
  const sm = (a: Float32Array) => blurTone({ w: gw, h: gh, d: a }, Math.max(3, 9 / k));
  const Jxx = sm(jxx), Jxy = sm(jxy), Jyy = sm(jyy);
  const a0 = o.angle ?? -Math.PI * 0.3;
  const flowAmt = o.flow ?? 0.75;
  let jmax = 0;
  for (let i = 0; i < gw * gh; i++) jmax = Math.max(jmax, Jxx.d[i] + Jyy.d[i]);
  /** hatch direction at p (output coords), rotated by `rot` */
  const dirAt = (p: Vec, rot: number): Vec => {
    const sx = p.x / k + src.w / 2, sy = p.y / k + src.h / 2;
    const xx = sampleTone(Jxx, sx, sy), xy = sampleTone(Jxy, sx, sy), yy = sampleTone(Jyy, sx, sy);
    const tr = xx + yy;
    // doubled-angle of the gradient; the hatch runs along the isophotes (gradient + 90 deg)
    const ga = Math.atan2(2 * xy, xx - yy);
    const coh = tr > 1e-9 ? Math.sqrt((xx - yy) ** 2 + 4 * xy * xy) / tr : 0;
    const wgt = flowAmt * coh * clamp(tr / (jmax * 0.02));
    const ta = ga + Math.PI; // doubled tangent angle
    const cx = wgt * Math.cos(ta) + (1 - wgt) * Math.cos(2 * a0);
    const cy = wgt * Math.sin(ta) + (1 - wgt) * Math.sin(2 * a0);
    const ang = Math.atan2(cy, cx) / 2 + rot;
    return v(Math.cos(ang), Math.sin(ang));
  };

  const width = o.width ?? 0.85;
  const color = o.color ?? palette.ink;
  const R = rng(seed);

  // ---- outline: marching squares on a blurred copy
  const outlineLevels = o.outline ?? [0.6, 0.85];
  const ob = blurTone(base, o.outlineBlur ?? Math.max(1.5, 2.5 / k));
  const outlineStrokes: Stroke[] = [];
  for (const [li, lv] of outlineLevels.entries()) {
    for (const path of isolines(ob, lv, 2)) {
      const pts = smoothPath(path.map((q) => v((q.x - src.w / 2) * k, (q.y - src.h / 2) * k)), 3);
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 3;
      if (L < (o.minOutline ?? 26) * (closed ? 2.5 : 1)) continue;
      // long contours become a few strokes, as a hand would draw them
      for (const part of splitPath(pts, 160 + R() * 120)) {
        outlineStrokes.push(pen(part, { seed: seed + 100 + outlineStrokes.length * 7 + li, width: width * 1.5, wobble: 0.35, taper: [0.12, 0.3], blot: 0.15, alpha: 0.9, color }));
      }
    }
  }
  const fl = o.features ?? 0.07;
  if (fl > 0) {
    const a = blurTone(base, Math.max(1, 1.6 / k)), b = blurTone(base, Math.max(3, 5 / k));
    const dog: Tone = { w: src.w, h: src.h, d: a.d.map((x, i) => x - b.d[i]) };
    for (const path of isolines(dog, fl, 2)) {
      const pts = smoothPath(path.map((q) => v((q.x - src.w / 2) * k, (q.y - src.h / 2) * k)), 3);
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 3;
      // small closed loops are texture (tweed, skin), not features
      if (L < (o.minOutline ?? 26) * (closed ? 2 : 0.8)) continue;
      for (const part of splitPath(pts, 120 + R() * 80)) {
        outlineStrokes.push(pen(part, { seed: seed + 5000 + outlineStrokes.length * 7, width: width * 1.25, wobble: 0.3, taper: [0.15, 0.3], blot: 0.1, alpha: 0.9, color }));
      }
    }
  }
  if (keep && (o.silhouette ?? true)) {
    for (const path of isolines(blurTone(keep, Math.max(1.5, 2 / k)), 0.5, 2)) {
      const pts = smoothPath(path.map((q) => v((q.x - src.w / 2) * k, (q.y - src.h / 2) * k)), 4);
      // skip the parts that run along the photo's edge, and anything faded out by the vignette
      const runs: Vec[][] = [];
      let run: Vec[] = [];
      for (const q of pts) {
        const sx = q.x / k + src.w / 2, sy = q.y / k + src.h / 2;
        const edge = sx < 4 || sy < 4 || sx > src.w - 5 || sy > src.h - 5;
        const vis = !vg || vigAt(sx, sy) > 0.35;
        if (edge || !vis) { if (run.length > 6) runs.push(run); run = []; } else run.push(q);
      }
      if (run.length > 6) runs.push(run);
      for (const r of runs) for (const part of splitPath(r, 160 + R() * 100)) {
        outlineStrokes.push(pen(part, { seed: seed + 8000 + outlineStrokes.length * 7, width: width * 1.2, wobble: 0.35, taper: [0.2, 0.3], blot: 0.1, alpha: 0.75, color }));
      }
    }
  }
  const outline = new Figure(order(outlineStrokes));

  // ---- shade: evenly spaced streamlines per layer
  const sp = o.spacing ?? 4;
  const layerSpec = o.layers ?? [
    { at: 0.2, angle: 0 },
    { at: 0.42, angle: 1.3 },
    { at: 0.62, angle: -Math.PI / 4 },
    { at: 0.8, angle: 0.45, spacing: sp * 0.9 },
  ];
  const maxLine = o.maxLine ?? 140;
  const layers = layerSpec.map((L, li) => {
    const dsep = L.spacing ?? sp;
    const dtest = dsep * 0.55;
    const cell = dsep;
    const grid = new Map<number, Vec[]>();
    const key = (x: number, y: number) => (Math.floor(y / cell) + 4096) * 8192 + Math.floor(x / cell) + 4096;
    const free = (p: Vec, r: number) => {
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) {
        const b = grid.get((yy + 4096) * 8192 + xx + 4096);
        if (b) for (const q of b) if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 < r * r) return false;
      }
      return true;
    };
    const mark = (ps: Vec[]) => { for (const p of ps) { const kk = key(p.x, p.y); const b = grid.get(kk); if (b) b.push(p); else grid.set(kk, [p]); } };
    const inside = (p: Vec) => Math.abs(p.x) < W / 2 - 1 && Math.abs(p.y) < H / 2 - 1;
    const step = 1.6;
    const trace = (s: Vec, sign: number) => {
      const out: Vec[] = [];
      let p = s, prev = dirAt(s, L.angle);
      if (sign < 0) prev = v(-prev.x, -prev.y);
      let len = 0;
      while (len < maxLine / 2) {
        let d = dirAt(p, L.angle);
        if (d.x * prev.x + d.y * prev.y < 0) d = v(-d.x, -d.y);
        const q = v(p.x + d.x * step, p.y + d.y * step);
        if (!inside(q) || toneAt(q) < L.at || !free(q, dtest)) break;
        out.push(q); p = q; prev = d; len += step;
      }
      return out;
    };
    const seeds: Vec[] = [];
    for (let y = -H / 2; y < H / 2; y += dsep * 0.7) for (let x = -W / 2; x < W / 2; x += dsep * 0.7) seeds.push(v(x + R() * dsep * 0.7, y + R() * dsep * 0.7));
    for (let i = seeds.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [seeds[i], seeds[j]] = [seeds[j], seeds[i]]; }
    const strokes: Stroke[] = [];
    for (const s of seeds) {
      if (toneAt(s) < L.at + 0.02 || !free(s, dsep)) continue;
      const path = [...trace(s, -1).reverse(), s, ...trace(s, 1)];
      if (path.length * step < 5) continue;
      mark(path);
      // pressure follows how far into the layer the tone is: the line swells in shadow
      const prof = path.map((p) => clamp((toneAt(p) - L.at) / 0.3));
      strokes.push(pen(path, {
        seed: seed + 1000 * (li + 1) + strokes.length,
        width,
        wobble: 0.18,
        taper: [0.15, 0.3],
        blot: 0.05,
        alpha: 0.88,
        color,
        pressure: (t) => 0.45 + 0.85 * prof[Math.min(prof.length - 1, Math.round(t * (prof.length - 1)))],
      }));
    }
    return new Figure(order(strokes)).named(`layer${li + 1}`);
  });
  const shade = new Group(layers).named("shade");
  outline.named("outline");
  return Object.assign(new Group([outline, shade]), { outline, shade, layers, tone: toneAt }) as Portrait;
}

// ---------------------------------------------------------------- helpers

/** Order strokes as one moving hand would: each starts near where the last ended. */
function order(strokes: Stroke[]): Stroke[] {
  if (strokes.length < 3) return strokes;
  const left = strokes.slice();
  // start top-left
  left.sort((a, b) => a.pts[0].y + a.pts[0].x * 0.3 - (b.pts[0].y + b.pts[0].x * 0.3));
  const out: Stroke[] = [left.shift()!];
  while (left.length) {
    const e = out[out.length - 1].pts[out[out.length - 1].pts.length - 1];
    let best = 0, bd = Infinity, flip = false;
    for (let i = 0; i < left.length; i++) {
      const p = left[i].pts;
      const d0 = (p[0].x - e.x) ** 2 + (p[0].y - e.y) ** 2;
      const d1 = (p[p.length - 1].x - e.x) ** 2 + (p[p.length - 1].y - e.y) ** 2;
      if (d0 < bd) { bd = d0; best = i; flip = false; }
      if (d1 < bd) { bd = d1; best = i; flip = true; }
    }
    const s = left.splice(best, 1)[0];
    out.push(flip ? { ...s, pts: s.pts.slice().reverse() } : s);
  }
  return out;
}

function smoothPath(p: Vec[], n: number): Vec[] {
  let a = p;
  for (let it = 0; it < n; it++) {
    a = a.map((q, i) => (i === 0 || i === a.length - 1 ? q : v((a[i - 1].x + 2 * q.x + a[i + 1].x) / 4, (a[i - 1].y + 2 * q.y + a[i + 1].y) / 4)));
  }
  return a;
}

function splitPath(p: Vec[], maxLen: number): Vec[][] {
  const out: Vec[][] = [];
  let cur: Vec[] = [p[0]], L = 0;
  for (let i = 1; i < p.length; i++) {
    L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    cur.push(p[i]);
    if (L > maxLen && p.length - i > 8) { out.push(cur); cur = [p[i]]; L = 0; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/** Marching squares on a grid sampled every `step` source px; returns linked polylines. */
export function isolines(t: Tone, level: number, step = 2): Vec[][] {
  const nx = Math.floor((t.w - 1) / step), ny = Math.floor((t.h - 1) / step);
  const val = (i: number, j: number) => t.d[Math.min(t.h - 1, j * step) * t.w + Math.min(t.w - 1, i * step)];
  // edge ids: horizontal edge (i,j)-(i+1,j) = 2*(j*(nx+1)+i), vertical (i,j)-(i,j+1) = +1
  const eid = (i: number, j: number, vert: boolean) => 2 * (j * (nx + 1) + i) + (vert ? 1 : 0);
  const point = new Map<number, Vec>();
  const at = (i: number, j: number, vert: boolean) => {
    const id = eid(i, j, vert);
    if (!point.has(id)) {
      const a = val(i, j), b = vert ? val(i, j + 1) : val(i + 1, j);
      const f = clamp((level - a) / (b - a || 1e-6));
      point.set(id, vert ? v(i * step, (j + f) * step) : v((i + f) * step, j * step));
    }
    return id;
  };
  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c0 = val(i, j) > level ? 1 : 0, c1 = val(i + 1, j) > level ? 2 : 0;
    const c2 = val(i + 1, j + 1) > level ? 4 : 0, c3 = val(i, j + 1) > level ? 8 : 0;
    const c = c0 | c1 | c2 | c3;
    if (c === 0 || c === 15) continue;
    const T = () => at(i, j, false), B = () => at(i, j + 1, false), Lf = () => at(i, j, true), Rt = () => at(i + 1, j, true);
    switch (c) {
      case 1: case 14: link(Lf(), T()); break;
      case 2: case 13: link(T(), Rt()); break;
      case 3: case 12: link(Lf(), Rt()); break;
      case 4: case 11: link(Rt(), B()); break;
      case 6: case 9: link(T(), B()); break;
      case 7: case 8: link(Lf(), B()); break;
      case 5: link(Lf(), T()); link(Rt(), B()); break;
      case 10: link(T(), Rt()); link(Lf(), B()); break;
    }
  }
  const seen = new Set<number>();
  const paths: Vec[][] = [];
  const walk = (start: number) => {
    const ids = [start];
    seen.add(start);
    let cur = start;
    for (;;) {
      const nb = (adj.get(cur) ?? []).find((n) => !seen.has(n));
      if (nb === undefined) break;
      seen.add(nb); ids.push(nb); cur = nb;
    }
    return ids;
  };
  // open chains first (ends have one neighbour), then closed loops
  for (const [id, nb] of adj) if (nb.length === 1 && !seen.has(id)) paths.push(walk(id).map((i) => point.get(i)!));
  for (const id of adj.keys()) if (!seen.has(id)) {
    const ids = walk(id);
    ids.push(ids[0]);
    paths.push(ids.map((i) => point.get(i)!));
  }
  return paths;
}
