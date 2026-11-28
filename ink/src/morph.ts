// Transform one drawing into another, stroke by stroke (Manim's Transform).
// Both sides are flattened to scene-space strokes, resampled, and blended.
import { type Anim, ease } from "./anim.ts";
import { Figure, Group, Node, type RenderCtx, type Tint, mixColor, tintOf } from "./node.ts";
import { type Mat, type Stroke, I, matMul, matScale, renderStroke, resample } from "./stroke.ts";
import type { Pt } from "./geom.ts";

const N = 64;

function baseMatrix(n: Node): Mat {
  const s = n.base;
  const c = Math.cos(s.rotation) * s.scale, si = Math.sin(s.rotation) * s.scale;
  return [c, si, -si, c, s.x, s.y];
}

/** All strokes of a node in scene coordinates (using base transforms). */
export function bake(n: Node, m: Mat = I): Stroke[] {
  let p = n.parent, pm: Mat = I;
  if (m === I) { while (p) { pm = matMul(baseMatrix(p), pm); p = p.parent; } }
  const mm = matMul(m === I ? pm : m, baseMatrix(n));
  if (n instanceof Figure) {
    const k = matScale(mm);
    return n.strokes.map((s) => {
      const pts = resample(s.pts, Math.max(0.5, strokeLen(s) / (N - 1))).slice(0, N);
      while (pts.length < N) pts.push(pts[pts.length - 1]);
      // carry pressure across by nearest index
      const out: Pt[] = pts.map((q, i) => {
        const src = s.pts[Math.min(s.pts.length - 1, Math.round((i / (N - 1)) * (s.pts.length - 1)))];
        return { x: mm[0] * q.x + mm[2] * q.y + mm[4], y: mm[1] * q.x + mm[3] * q.y + mm[5], p: src.p };
      });
      return { ...s, pts: out, width: s.width * k };
    });
  }
  if (n instanceof Group) return n.items.flatMap((c) => bake(c, mm));
  return [];
}

function strokeLen(s: Stroke) {
  let l = 0;
  for (let i = 1; i < s.pts.length; i++) l += Math.hypot(s.pts[i].x - s.pts[i - 1].x, s.pts[i].y - s.pts[i - 1].y);
  return l;
}

/** Split the longest strokes in half until there are n (so one circle can become four sides). */
function splitTo(xs: Stroke[], n: number): Stroke[] {
  const out = xs.slice();
  if (!out.length) return out;
  while (out.length < n) {
    let k = 0;
    for (let i = 1; i < out.length; i++) if (strokeLen(out[i]) > strokeLen(out[k])) k = i;
    const s = out[k], h = Math.floor(s.pts.length / 2);
    const half = (pts: Pt[]) => { const r = resample(pts, Math.max(0.5, polyLen(pts) / (N - 1))).slice(0, N).map((q, i) => ({ ...q, p: pts[Math.min(pts.length - 1, Math.round((i / (N - 1)) * (pts.length - 1)))].p })); while (r.length < N) r.push(r[r.length - 1]); return r; };
    out.splice(k, 1, { ...s, pts: half(s.pts.slice(0, h + 1)) }, { ...s, pts: half(s.pts.slice(h)) });
  }
  return out;
}
/** Pair each stroke of b with the most similar stroke of a (shapes centred), flipping direction where that fits better. */
function match(a: Stroke[], b: Stroke[]): Stroke[] {
  const cen = (xs: Stroke[]) => { let x = 0, y = 0, k = 0; for (const s of xs) for (const p of s.pts) { x += p.x; y += p.y; k++; } return { x: x / k, y: y / k }; };
  const ca = cen(a), cb = cen(b);
  const idx = [0, 8, 16, 24, 32, 40, 48, 56, 63];
  const cost = (sa: Stroke, sb: Stroke, rev: boolean) => {
    let c = 0;
    for (const i of idx) { const pa = sa.pts[i], pb = sb.pts[rev ? 63 - i : i]; c += Math.hypot(pa.x - ca.x - (pb.x - cb.x), pa.y - ca.y - (pb.y - cb.y)); }
    return c;
  };
  const pairs: { i: number; j: number; c: number; rev: boolean }[] = [];
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const f = cost(a[i], b[j], false), r = cost(a[i], b[j], true);
    pairs.push({ i, j, c: Math.min(f, r), rev: r < f });
  }
  pairs.sort((x, y) => x.c - y.c);
  const out: Stroke[] = new Array(a.length);
  const usedA = new Set<number>(), usedB = new Set<number>();
  for (const p of pairs) {
    if (usedA.has(p.i) || usedB.has(p.j)) continue;
    usedA.add(p.i); usedB.add(p.j);
    out[p.i] = p.rev ? { ...b[p.j], pts: b[p.j].pts.slice().reverse() } : b[p.j];
  }
  return out;
}
const polyLen = (pts: Pt[]) => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return l; };

export class Morph extends Node {
  A: Stroke[];
  B: Stroke[];
  t = 0;
  constructor(a: Node | Node[], b: Node | Node[]) {
    super();
    const A = [a].flat().flatMap((n) => bake(n)), B = [b].flat().flatMap((n) => bake(n));
    const n = Math.max(A.length, B.length, 1);
    this.A = splitTo(A, n);
    this.B = match(this.A, splitTo(B, n));
  }
  inkLength() { return this.A.reduce((a, s) => a + strokeLen(s), 0); }
  strokeCount() { return this.A.length; }
  render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: Tint) {
    const st = this.state;
    const op = opacity * st.opacity;
    if (op <= 0 || share * st.drawn <= 0) return;
    const m = matMul(parent, this.localMatrix());
    const t = this.t, col = tintOf(st, color);
    for (let i = 0; i < this.A.length; i++) {
      const a = this.A[i], b = this.B[i];
      if (!a || !b) continue;
      const pts: Pt[] = a.pts.map((p, j) => ({ x: p.x + (b.pts[j].x - p.x) * t, y: p.y + (b.pts[j].y - p.y) * t, p: p.p + (b.pts[j].p - p.p) * t }));
      const c = mixColor(a.color, { c: b.color, a: t });
      renderStroke(rc.ctx, { pts, width: a.width + (b.width - a.width) * t, color: mixColor(c, col), alpha: a.alpha + (b.alpha - a.alpha) * t }, m, 1, op);
    }
  }
}

/** a becomes b. a leaves the page as the morph starts; b is on the page when it ends. */
export function morph(a: Node | Node[], b: Node | Node[], o: { duration?: number; ease?: (t: number) => number } = {}): Anim {
  const m = new Morph(a, b);
  return {
    kind: "morph", targets: [m], duration: o.duration ?? 1.4, ease: o.ease ?? ease.inOut,
    introduces: true, removes: true, hideAtStart: [a].flat(), showAtEnd: [b].flat(),
    apply: (p) => { m.t = p; },
  };
}
