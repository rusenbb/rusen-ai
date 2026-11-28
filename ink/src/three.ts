// 3D drawn as ink. Geometry lives in 3D; every frame it is projected through
// the scene's orbit camera, hidden lines are removed against a depth buffer,
// and what's left is inked with the same pen as everything else.
// Far lines get thinner, so depth reads the way it does in an engraving.
import { type Vec, polar, rot, sub, norm, add, mul } from "./geom.ts";
import { Node, type RenderCtx } from "./node.ts";
import { type Mat, matMul, pen, renderStroke } from "./stroke.ts";
import type { Camera } from "./camera.ts";
import { palette } from "./style.ts";

export type V3 = [number, number, number];

export type Line3 = {
  pts: V3[];
  width?: number;
  color?: string;
  alpha?: number;
  seed?: number;
  /** Draw barbs at the end (axes, vectors). */
  arrow?: boolean;
  /** A single point drawn as a dot of this radius (px at unit depth). */
  dot?: number;
  /** Never hidden (labels, the path of a ball on the surface). */
  onTop?: boolean;
};

export type Tri = [V3, V3, V3];

type Proj = { x: number; y: number; d: number; f: number };

export class Figure3D extends Node {
  lines: Line3[] = [];
  occluders: Tri[] = [];
  /** px per scene unit. */
  unit: number;
  /** Hide this figure's lines behind another figure's surface (e.g. a path on a landscape). */
  occludedBy: Figure3D | null = null;
  constructor(unit = 120) { super(); this.unit = unit; }
  behind(f: Figure3D) { this.occludedBy = f; for (const l of this.lines) l.onTop = false; return this; }

  inkLength() { return this.lines.reduce((a, l) => a + approxLen(l.pts) * this.unit * 0.8 + (l.dot ? 8 : 0), 0); }
  strokeCount() { return this.lines.length; }

  render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: string | null) {
    const cam: Camera = (rc as RenderCtx & { scene: { camera: Camera } }).scene.camera;
    const st = this.state;
    const d = st.drawn * share;
    const op = opacity * st.opacity;
    const col = st.color ?? color;
    if (d <= 0 || op <= 0) return;
    const m = matMul(parent, this.localMatrix());
    const P = (p: V3): Proj => { const q = cam.project(p, { x: 0, y: 0 }, this.unit); return { x: q.x, y: q.y, d: q.depth, f: q.f }; };
    const occ = this.occludedBy ? this.occludedBy.occluders : this.occluders;
    const zb = occ.length ? depthBuffer(occ.map((t) => t.map(P) as [Proj, Proj, Proj])) : null;
    const f0 = cam.state.focal / cam.state.dist;
    const lens = this.lines.map((l) => approxLen(l.pts) * this.unit * f0 + (l.dot ? 8 : 0));
    const lift = rc.lift;
    const total = lens.reduce((a, b) => a + b + lift, 0);
    let budget = d * total;
    for (let i = 0; i < this.lines.length && budget > 0; i++) {
      const L = this.lines[i];
      const share = Math.min(1, budget / (lens[i] + lift));
      budget -= lens[i] + lift;
      const prog = d >= 1 ? 1 : Math.min(1, (share * (lens[i] + lift)) / Math.max(1e-6, lens[i]));
      const pp = L.pts.map(P);
      const c = col ?? L.color ?? palette.ink;
      const alpha = (L.alpha ?? 0.92);
      if (L.dot) {
        const q = pp[0];
        if (!L.onTop && zb && !zb.visible(q)) continue;
        const r = L.dot * (q.f / f0);
        const ctx = rc.ctx;
        const x = m[0] * q.x + m[2] * q.y + m[4], y = m[1] * q.x + m[3] * q.y + m[5];
        ctx.globalAlpha = alpha * op * Math.min(1, prog * 3);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      // cut to drawn length, then split into visible runs
      const upto = Math.max(1, Math.ceil(prog * (pp.length - 1)));
      const runs: Proj[][] = [];
      let run: Proj[] = [];
      for (let k = 0; k <= upto && k < pp.length; k++) {
        const vis = L.onTop || !zb || zb.visible(pp[k]);
        if (vis) run.push(pp[k]);
        else { if (run.length > 1) runs.push(run); run = []; }
      }
      if (run.length > 1) runs.push(run);
      for (const r of runs) {
        const fAvg = r.reduce((a, q) => a + q.f, 0) / r.length;
        const depthW = Math.pow(fAvg / f0, 1.4);
        const s = pen(r, { seed: (L.seed ?? i * 17 + 3), width: (L.width ?? 1.4) * depthW, color: c, alpha, wobble: 0.25, taper: [0.02, 0.06], blot: 0 });
        renderStroke(rc.ctx, s, m, 1, op);
      }
      if (L.arrow && prog >= 1 && pp.length > 1) {
        const end = pp[pp.length - 1], prev = pp[Math.max(0, pp.length - 4)];
        const t = norm(sub(end, prev) as Vec);
        const h = 14 * (end.f / f0);
        for (const sgn of [1, -1]) {
          const dd = rot(mul(t, -1), sgn * 0.45);
          const s = pen([end, add(end, mul(dd, h))], { seed: i * 31 + sgn, width: (L.width ?? 1.4) * 0.9, color: c, alpha, wobble: 0, taper: [0, 0.5], blot: 0 });
          renderStroke(rc.ctx, s, m, 1, op);
        }
      }
    }
  }
}

function approxLen(p: V3[]) {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]);
  return l;
}

/** Software z-buffer over projected triangles (2px cells). */
function depthBuffer(tris: [Proj, Proj, Proj][]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of tris) for (const p of t) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const cell = 2;
  const W = Math.ceil((x1 - x0) / cell) + 3, H = Math.ceil((y1 - y0) / cell) + 3;
  const buf = new Float32Array(W * H).fill(Infinity);
  for (const [a, b, c] of tris) {
    const ax = (a.x - x0) / cell, ay = (a.y - y0) / cell, bx = (b.x - x0) / cell, by = (b.y - y0) / cell, cx = (c.x - x0) / cell, cy = (c.y - y0) / cell;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den;
      const w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den;
      const w3 = 1 - w1 - w2;
      if (w1 < -0.02 || w2 < -0.02 || w3 < -0.02) continue;
      const z = w1 * a.d + w2 * b.d + w3 * c.d;
      const k = y * W + x;
      if (z < buf[k]) buf[k] = z;
    }
  }
  return {
    visible(p: Proj) {
      const x = Math.round((p.x - x0) / cell), y = Math.round((p.y - y0) / cell);
      if (x < 0 || y < 0 || x >= W || y >= H) return true;
      let m = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) m = Math.min(m, buf[yy * W + xx]);
      }
      return p.d <= m + 0.04 * p.d;
    },
  };
}

// ---------------------------------------------------------------- builders

export type SurfaceOpts = {
  /** Domain in x and z (scene units). */
  range?: [number, number];
  /** Grid lines per side. */
  grid?: number;
  /** Contour levels (heights) to ink, or a count. */
  contours?: number[] | number;
  /** Hatch the shadowed side, following the form. */
  shade?: boolean;
  /** Light direction for shading. */
  light?: V3;
  width?: number;
  color?: string;
  seed?: number;
};

/** A height field y = f(x, z): a loss landscape, a potential, a likelihood. */
export function surface(f: (x: number, z: number) => number, o: SurfaceOpts = {}, unit = 120): Figure3D {
  const fig = new Figure3D(unit);
  const [a, b] = o.range ?? [-3, 3];
  const G = o.grid ?? 18;
  const fine = 6; // samples per grid cell
  const N = G * fine;
  const at = (i: number, j: number): V3 => { const x = a + ((b - a) * i) / N, z = a + ((b - a) * j) / N; return [x, f(x, z), z]; };
  const col = o.color;
  // occluders from a coarser mesh
  const M = G * 2;
  const am = (i: number, j: number): V3 => { const x = a + ((b - a) * i) / M, z = a + ((b - a) * j) / M; return [x, f(x, z) - 0.015, z]; };
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
    fig.occluders.push([am(i, j), am(i + 1, j), am(i + 1, j + 1)], [am(i, j), am(i + 1, j + 1), am(i, j + 1)]);
  }
  let seed = o.seed ?? 1;
  // grid lines, alternating direction so the drawing sweeps across
  for (let g = 0; g <= G; g++) {
    const i = g * fine;
    fig.lines.push({ pts: Array.from({ length: N + 1 }, (_, j) => at(i, j)), width: o.width ?? 1.3, color: col, seed: seed++ });
  }
  for (let g = 0; g <= G; g++) {
    const j = g * fine;
    fig.lines.push({ pts: Array.from({ length: N + 1 }, (_, i) => at(i, j)), width: o.width ?? 1.3, color: col, seed: seed++ });
  }
  if (o.shade) {
    const L = normalize(o.light ?? [-0.5, 0.8, -0.4]);
    const eps = 1e-3;
    const tone = (x: number, z: number) => {
      const dx = (f(x + eps, z) - f(x - eps, z)) / (2 * eps), dz = (f(x, z + eps) - f(x, z - eps)) / (2 * eps);
      const n = normalize([-dx, 1, -dz]);
      return 1 - Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    };
    // fine hatch along x between grid lines; a line is inked where tone beats its threshold
    const H = G * 4;
    for (let h = 0; h < H; h++) {
      if (h % 4 === 0) continue;
      const z = a + ((b - a) * h) / H;
      const thr = 0.18 + ((h * 0.618) % 1) * 0.5;
      let run: V3[] = [];
      const flush = () => { if (run.length > 3) fig.lines.push({ pts: run, width: 0.8, alpha: 0.8, color: col, seed: seed++ }); run = []; };
      for (let s = 0; s <= N; s++) {
        const x = a + ((b - a) * s) / N;
        if (tone(x, z) > thr) run.push([x, f(x, z), z]); else flush();
      }
      flush();
    }
  }
  if (o.contours) {
    const levels = Array.isArray(o.contours) ? o.contours : autoLevels(f, a, b, o.contours);
    for (const lv of levels) for (const c of contour(f, a, b, 80, lv)) fig.lines.push({ pts: c.map(([x, z]) => [x, lv, z] as V3), width: 1.2, color: col, seed: seed++ });
  }
  return fig;
}

function normalize(v: V3): V3 { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

function autoLevels(f: (x: number, z: number) => number, a: number, b: number, n: number) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) { const y = f(a + ((b - a) * i) / 40, a + ((b - a) * j) / 40); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  return Array.from({ length: n }, (_, k) => lo + ((hi - lo) * (k + 0.5)) / n);
}

/** Marching squares, chained into polylines. Returns [x, z] lists. */
export function contour(f: (x: number, z: number) => number, a: number, b: number, n: number, level: number): [number, number][][] {
  const h = (b - a) / n;
  const val = (i: number, j: number) => f(a + i * h, a + j * h) - level;
  const segs: [[number, number], [number, number]][] = [];
  const interp = (i0: number, j0: number, i1: number, j1: number): [number, number] => {
    const v0 = val(i0, j0), v1 = val(i1, j1);
    const t = v0 / (v0 - v1);
    return [a + (i0 + (i1 - i0) * t) * h, a + (j0 + (j1 - j0) * t) * h];
  };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const pts: [number, number][] = [];
    const corners: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    for (let k = 0; k < 4; k++) {
      const [i0, j0] = corners[k], [i1, j1] = corners[(k + 1) % 4];
      if ((val(i0, j0) > 0) !== (val(i1, j1) > 0)) pts.push(interp(i0, j0, i1, j1));
    }
    if (pts.length === 2) segs.push([pts[0], pts[1]]);
    else if (pts.length === 4) { segs.push([pts[0], pts[1]], [pts[2], pts[3]]); }
  }
  // chain
  const key = (p: [number, number]) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  const ends = new Map<string, number[]>();
  segs.forEach((s, idx) => { for (const p of s) { const k = key(p); (ends.get(k) ?? ends.set(k, []).get(k)!).push(idx); } });
  const used = new Set<number>();
  const out: [number, number][][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used.has(s)) continue;
    used.add(s);
    const line: [number, number][] = [segs[s][0], segs[s][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) ?? []).find((q) => !used.has(q));
        if (next === undefined) break;
        used.add(next);
        const [p, q] = segs[next];
        const other = key(p) === key(tip) ? q : p;
        if (dir) line.push(other); else line.unshift(other);
      }
    }
    out.push(line);
  }
  return out;
}

/** Three axes with arrowheads, from the origin. */
export function axes3d(size = 3, unit = 120, o: { color?: string; width?: number } = {}): Figure3D {
  const fig = new Figure3D(unit);
  const seg = (to: V3): V3[] => Array.from({ length: 30 }, (_, i) => [to[0] * i / 29, to[1] * i / 29, to[2] * i / 29] as V3);
  for (const [k, to] of ([[1, [size, 0, 0]], [2, [0, size, 0]], [3, [0, 0, size]]] as [number, V3][])) {
    fig.lines.push({ pts: seg(to), arrow: true, width: o.width ?? 1.4, color: o.color, seed: 900 + k, onTop: true });
  }
  return fig;
}

/** A cloud of points (an embedding space). Each point is a dot; size follows depth. */
export function points3d(pts: V3[], o: { r?: number; color?: string; colors?: (string | undefined)[] } = {}, unit = 120): Figure3D {
  const fig = new Figure3D(unit);
  pts.forEach((p, i) => fig.lines.push({ pts: [p], dot: o.r ?? 3.2, color: o.colors?.[i] ?? o.color, onTop: true }));
  return fig;
}

/** A polyline in 3D (a vector, a trajectory of gradient descent). */
export function path3d(pts: V3[], o: { width?: number; color?: string; arrow?: boolean; onTop?: boolean; seed?: number } = {}, unit = 120): Figure3D {
  const fig = new Figure3D(unit);
  fig.lines.push({ pts, width: o.width ?? 1.8, color: o.color, arrow: o.arrow, onTop: o.onTop ?? true, seed: o.seed ?? 77 });
  return fig;
}

export { polar };

/** Keep a 2D node (a label) attached to a 3D point of a 3D figure as the camera moves. */
export class Pinned extends Node {
  child: Node;
  fig: Figure3D;
  point: V3;
  offset: { x: number; y: number };
  constructor(child: Node, fig: Figure3D, point: V3, offset = { x: 0, y: 0 }) {
    super();
    this.child = child; this.fig = fig; this.point = point; this.offset = offset;
    child.parent = this;
  }
  children() { return [this.child]; }
  inkLength() { return this.child.inkLength(); }
  strokeCount() { return this.child.strokeCount(); }
  render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: string | null) {
    const cam: Camera = (rc as RenderCtx & { scene: { camera: Camera } }).scene.camera;
    const q = cam.project(this.point, { x: this.fig.state.x, y: this.fig.state.y }, this.fig.unit);
    const st = this.state;
    const m: Mat = [1, 0, 0, 1, q.x + this.offset.x, q.y + this.offset.y];
    this.child.render(rc, matMul(parent, m), st.drawn * share, opacity * st.opacity, st.color ?? color);
  }
}
export const pin = (child: Node, fig: Figure3D, point: V3, offset = { x: 0, y: 0 }) => new Pinned(child, fig, point, offset);
