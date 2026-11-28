// Primitive marks, all built from pen strokes so they animate as drawing.
import { type Vec, add, dist, inPoly, lerpV, mul, norm, perp, polar, quad, rot, spline, sub, v } from "./geom.ts";
import { Figure, Group, type Node } from "./node.ts";
import { rng } from "./rng.ts";
import { type PenOpts, type Stroke, pen } from "./stroke.ts";
import { palette } from "./style.ts";
import { text, type TextOpts } from "./text.ts";

export type Mark = PenOpts & { seed?: number };

let autoSeed = 1;
const seedOf = (o: { seed?: number }) => o.seed ?? (autoSeed = (autoSeed * 48271) % 2147483647);

/** A straight line as a hand draws it: a faint bow and tremor. */
export function lineStroke(a: Vec, b: Vec, o: Mark = {}): Stroke {
  const seed = seedOf(o);
  const r = rng(seed);
  const L = dist(a, b);
  const n = perp(norm(sub(b, a)));
  const bow = r.range(-1, 1) * Math.min(6, L * 0.012);
  const mid = add(lerpV(a, b, 0.5), mul(n, bow));
  return pen(quad(a, mid, b), { wobble: Math.min(1, 0.25 + L / 900), ...o, seed });
}

export const line = (a: Vec, b: Vec, o: Mark = {}) => new Figure([lineStroke(a, b, o)]);

export const curve = (pts: Vec[], o: Mark = {}) => new Figure([pen(spline(pts), { ...o, seed: seedOf(o) })]);

/** Circle drawn in one go, starting anywhere, ending with a small overlap. */
export function circleStroke(c: Vec, r: number, o: Mark & { overlap?: number; squash?: number } = {}): Stroke {
  const seed = seedOf(o);
  const R = rng(seed);
  const a0 = R.range(0, Math.PI * 2);
  const sweep = Math.PI * 2 + (o.overlap ?? R.range(0.08, 0.3));
  const sq = o.squash ?? R.range(0.97, 1.03);
  const tilt = R.range(0, Math.PI);
  const wob = R.range(0.01, 0.025);
  const k = R.range(1.5, 3);
  const pts: Vec[] = [];
  const n = Math.max(24, Math.ceil((r * sweep) / 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + sweep * t;
    const rr = r * (1 + wob * Math.sin(k * a + seed) + 0.012 * t);
    const p = rot(v(Math.cos(a) * rr, Math.sin(a) * rr * sq), tilt);
    pts.push(add(c, p));
  }
  return pen(pts, { wobble: 0.3, taper: [0.03, 0.08], ...o, seed });
}

export const circle = (c: Vec, r: number, o: Mark = {}) => new Figure([circleStroke(c, r, o)]);

/** A small filled ink dot (stipple, synapse bouton, data point). */
export function dotStrokes(c: Vec, r: number, o: Mark = {}): Stroke[] {
  const seed = seedOf(o);
  const R = rng(seed);
  const out: Stroke[] = [];
  // a tight spiral fills the dot like a nib pressed and turned
  const pts: Vec[] = [];
  const turns = Math.max(1.2, r / 1.4);
  const n = Math.ceil(turns * 18);
  const a0 = R.range(0, 6.28);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(add(c, polar(a0 + t * turns * Math.PI * 2, r * (1 - t) * 0.75)));
  }
  out.push(pen(pts, { width: Math.max(1.6, r * 0.9), wobble: 0.1, taper: [0, 0], blot: 0, ...o, seed }));
  return out;
}

export const dot = (c: Vec, r = 3, o: Mark = {}) => new Figure(dotStrokes(c, r, o));

/** Arrow with a curved shaft and two hand-flicked barbs. */
export function arrow(a: Vec, b: Vec, o: Mark & { bend?: number; head?: number; gap?: number } = {}) {
  const seed = seedOf(o);
  const R = rng(seed);
  const gap = o.gap ?? 0;
  const dir = norm(sub(b, a));
  const A = add(a, mul(dir, gap));
  const B = sub(b, mul(dir, gap));
  const L = dist(A, B);
  const bend = o.bend ?? R.range(-0.06, 0.06);
  const mid = add(lerpV(A, B, 0.5), mul(perp(dir), bend * L));
  const shaft = quad(A, mid, B);
  const end = shaft[shaft.length - 1];
  const tangent = norm(sub(end, shaft[Math.max(0, shaft.length - 6)]));
  const h = o.head ?? Math.min(22, 8 + L * 0.06);
  const spread = R.range(0.42, 0.52);
  const barb = (s: number) => {
    const d = rot(mul(tangent, -1), s * spread);
    const tip = add(end, mul(d, h));
    const ctrl = add(lerpV(end, tip, 0.5), mul(perp(d), s * h * 0.08));
    return pen(quad(end, ctrl, tip), { ...o, seed: seed + (s > 0 ? 11 : 13), taper: [0.02, 0.5], width: (o.width ?? 2.2) * 0.9 });
  };
  return new Figure([pen(shaft, { wobble: 0.5, ...o, seed }), barb(1), barb(-1)]);
}

/** Wavy brace, rectangle, frame. */
export function box(x: number, y: number, w: number, h: number, o: Mark = {}) {
  const seed = seedOf(o);
  const R = rng(seed);
  const j = () => R.range(-2, 2);
  const c = [v(x + j(), y + j()), v(x + w + j(), y + j()), v(x + w + j(), y + h + j()), v(x + j(), y + h + j())];
  // corners overshoot a little, as when ruling by hand
  const os = (p: Vec, q: Vec, k: number) => add(q, mul(norm(sub(q, p)), k));
  return new Figure(c.map((p, i) => lineStroke(os(c[(i + 1) % 4], p, R.range(0, 5)), os(p, c[(i + 1) % 4], R.range(2, 7)), { ...o, seed: seed + i })));
}

export type HatchOpts = Mark & {
  angle?: number;
  spacing?: number;
  /** Tone 0..1 at a point: more ink where darker. Default: solid. */
  tone?: (p: Vec) => number;
  /** Second, crossing layer for the darkest tones. */
  cross?: boolean;
  /** Curvature of each hatch line (Leonardo's are slightly curved). */
  curl?: number;
};

/**
 * Parallel hatching inside a region. `inside` can be a polygon or a predicate.
 * Lines run in Leonardo's direction (top-right to bottom-left) by default.
 */
export function hatch(inside: Vec[] | ((p: Vec) => boolean), bbox: { x: number; y: number; w: number; h: number }, o: HatchOpts = {}): Figure {
  const seed = seedOf(o);
  const R = rng(seed);
  const pred = Array.isArray(inside) ? (p: Vec) => inPoly(p, inside) : inside;
  const tone = o.tone ?? (() => 1);
  const strokes: Stroke[] = [];
  const layer = (angle: number, offset: number, layerSeed: number) => {
    const dir = polar(angle, 1);
    const nrm = perp(dir);
    const cx = bbox.x + bbox.w / 2, cy = bbox.y + bbox.h / 2;
    const half = Math.hypot(bbox.w, bbox.h) / 2 + 4;
    const sp = o.spacing ?? 6;
    let i = 0;
    for (let s = -half; s <= half; s += sp * R.range(0.85, 1.15), i++) {
      const thr = ((i * 0.6180339) % 1) * 0.92 + offset;
      const base = add(v(cx, cy), mul(nrm, s));
      let run: Vec[] = [];
      const flush = () => {
        if (run.length > 1 && dist(run[0], run[run.length - 1]) > 3) {
          const a = run[0], b = run[run.length - 1];
          const trim = R.range(0, 0.12);
          const A = lerpV(a, b, trim * R()), B = lerpV(b, a, trim * R());
          const mid = add(lerpV(A, B, 0.5), mul(nrm, (o.curl ?? 0.05) * dist(A, B)));
          strokes.push(pen(quad(A, mid, B), { width: 1.1, wobble: 0.25, taper: [0.1, 0.35], blot: 0.1, alpha: 0.85, ...o, seed: layerSeed + i * 31 }));
        }
        run = [];
      };
      for (let t = -half; t <= half; t += 2) {
        const p = add(base, mul(dir, t));
        if (pred(p) && tone(p) > thr) run.push(p);
        else flush();
      }
      flush();
    }
  };
  const ang = o.angle ?? -Math.PI * 0.32;
  layer(ang, 0, seed);
  if (o.cross) layer(ang + Math.PI / 2.6, 0.45, seed + 999);
  return new Figure(strokes);
}

/** Stippled tone: dots whose density follows `tone`. */
export function stipple(inside: (p: Vec) => boolean, bbox: { x: number; y: number; w: number; h: number }, o: Mark & { tone?: (p: Vec) => number; count?: number; size?: number } = {}) {
  const seed = seedOf(o);
  const R = rng(seed);
  const strokes: Stroke[] = [];
  const n = o.count ?? 400;
  for (let i = 0; i < n * 4 && strokes.length < n; i++) {
    const p = v(bbox.x + R() * bbox.w, bbox.y + R() * bbox.h);
    if (!inside(p) || R() > (o.tone ? o.tone(p) : 1)) continue;
    const a = R() * 6.28, l = R.range(0.6, 1.6);
    strokes.push(pen([p, add(p, polar(a, l))], { width: o.size ?? 2, wobble: 0, taper: [0, 0], blot: 0, ...o, seed: seed + i }));
  }
  return new Figure(strokes);
}

/** A circle with a label inside: the basic node of every diagram. */
export function node(c: Vec, r: number, label = "", o: Mark & { shade?: boolean; textOpts?: TextOpts } = {}): Group {
  const seed = seedOf(o);
  const parts: Node[] = [new Figure([circleStroke(v(0, 0), r, { ...o, seed })]).named("ring")];
  if (o.shade) {
    // crescent of hatching on the lower right, light from the upper left
    const inside = (p: Vec) => Math.hypot(p.x, p.y) < r - 3 && Math.hypot(p.x + r * 0.35, p.y + r * 0.35) > r * 0.95;
    parts.push(hatch(inside, { x: -r, y: -r, w: 2 * r, h: 2 * r }, { seed: seed + 5, spacing: Math.max(3, r / 11), width: 0.9, color: o.color }).named("shade"));
  }
  if (label) parts.push(text(label, { size: r * 0.8, ...o.textOpts }).named("label"));
  const g = new Group(parts);
  g.at(c.x, c.y);
  return g;
}

export { palette };
