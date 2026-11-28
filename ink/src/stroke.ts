// The pen. A stroke is a dense polyline with pressure; the renderer turns it
// into a filled ribbon whose width follows the pressure.
import { type Pt, type Vec, arcLengths, clamp, dist, norm, perp, sub } from "./geom.ts";
import { rng, tremor } from "./rng.ts";
import { palette } from "./style.ts";

export type Stroke = {
  pts: Pt[];
  width: number;
  color: string;
  alpha: number;
  /** Optional depth per point for 3D strokes (camera space, larger = farther). */
  z?: number[];
};

export type PenOpts = {
  seed?: number;
  width?: number;
  color?: string;
  alpha?: number;
  /** Hand tremor amplitude in px. 0 = mechanical. */
  wobble?: number;
  /** Fraction of the length spent pressing in / lifting off. */
  taper?: [number, number];
  /** Extra pressure profile over t in 0..1 (e.g. dendrites thin out). */
  pressure?: (t: number) => number;
  /** Ink pooling where the nib lands. */
  blot?: number;
};

/** Resample a path to even spacing so pressure and tremor are smooth. */
export function resample(path: Vec[], step = 1.5): Vec[] {
  if (path.length < 2) return path.slice();
  const L = arcLengths(path);
  const total = L[L.length - 1];
  if (total < 1e-6) return [path[0], path[0]];
  const n = Math.max(2, Math.ceil(total / step));
  const out: Vec[] = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * total;
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const seg = L[j + 1] - L[j] || 1;
    const t = (s - L[j]) / seg;
    out.push({ x: path[j].x + (path[j + 1].x - path[j].x) * t, y: path[j].y + (path[j + 1].y - path[j].y) * t });
  }
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function pen(path: Vec[], o: PenOpts = {}): Stroke {
  const seed = o.seed ?? 1;
  const r = rng(seed);
  const pts = resample(path);
  const L = arcLengths(pts);
  const total = L[L.length - 1] || 1;
  const wob = o.wobble ?? 0.6;
  const tr = tremor(seed);
  const tw = tremor(seed + 7);
  const [tin, tout] = o.taper ?? [0.06, 0.18];
  // Taper lengths in px are capped so long strokes keep a crisp body.
  const inPx = Math.min(tin * total, 14);
  const outPx = Math.min(tout * total, 40);
  const phase = r() * 100;
  const out: Pt[] = pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const n = perp(norm(sub(next, prev)));
    const s = L[i];
    const t = s / total;
    const off = wob * tr(phase + s / 38);
    let pr = 1;
    if (inPx > 0) pr *= 0.35 + 0.65 * smooth(clamp(s / inPx));
    if (outPx > 0) pr *= 0.12 + 0.88 * smooth(clamp((total - s) / outPx));
    pr *= 1 + 0.14 * tw(phase + s / 22);
    if (o.pressure) pr *= o.pressure(t);
    const blot = o.blot ?? 0.25;
    if (blot > 0) pr *= 1 + blot * Math.exp(-s / 3);
    return { x: p.x + n.x * off, y: p.y + n.y * off, p: Math.max(0.05, pr) };
  });
  return { pts: out, width: o.width ?? 2.2, color: o.color ?? palette.ink, alpha: o.alpha ?? 0.94 };
}

export function strokeLength(s: Stroke) {
  let l = 0;
  for (let i = 1; i < s.pts.length; i++) l += dist(s.pts[i - 1], s.pts[i]);
  return l;
}

/** A 2D affine transform [a b c d e f] as in canvas setTransform. */
export type Mat = [number, number, number, number, number, number];
export const I: Mat = [1, 0, 0, 1, 0, 0];
export const matMul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
export const matScale = (m: Mat) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

type Ctx = {
  beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a: number, b: number): void; closePath(): void; fill(): void;
  fillStyle: unknown; globalAlpha: number;
};

/**
 * Draw `s` through matrix `m`, up to `progress` of its length.
 * `widthScale` lets the caller thin far-away 3D strokes.
 */
export function renderStroke(ctx: Ctx, s: Stroke, m: Mat, progress = 1, opacity = 1, widthScale = 1) {
  if (progress <= 0 || opacity <= 0 || s.pts.length < 2) return;
  const k = matScale(m) * widthScale;
  const P = s.pts;
  let end = P.length - 1;
  let tail: Pt | null = null;
  if (progress < 1) {
    const L = arcLengths(P);
    const target = L[L.length - 1] * progress;
    let i = 1;
    while (i < P.length && L[i] < target) i++;
    if (i >= P.length) i = P.length - 1;
    const t = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
    end = i - 1;
    tail = { x: P[i - 1].x + (P[i].x - P[i - 1].x) * t, y: P[i - 1].y + (P[i].y - P[i - 1].y) * t, p: P[i - 1].p };
  }
  const pts: { x: number; y: number; w: number }[] = [];
  const push = (p: Pt) => {
    const x = m[0] * p.x + m[2] * p.y + m[4];
    const y = m[1] * p.x + m[3] * p.y + m[5];
    pts.push({ x, y, w: Math.max(0.28, (s.width * p.p * k) / 2) });
  };
  for (let i = 0; i <= end; i++) push(P[i]);
  if (tail) push(tail);
  if (pts.length < 2) return;
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const w = pts[i].w;
    left.push({ x: pts[i].x - dy * w, y: pts[i].y + dx * w });
    right.push({ x: pts[i].x + dy * w, y: pts[i].y - dx * w });
  }
  ctx.globalAlpha = s.alpha * opacity;
  ctx.fillStyle = s.color;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
  // round caps
  for (const q of [pts[0], pts[pts.length - 1]]) {
    if (q.w < 0.6) continue;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.w, 0, Math.PI * 2);
    ctx.fill();
  }
}
