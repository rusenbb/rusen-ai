export type Vec = { x: number; y: number };
export type Pt = { x: number; y: number; p: number }; // p = pen pressure 0..1

export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x });
export const rot = (a: Vec, ang: number): Vec => {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};
export const polar = (ang: number, r: number): Vec => ({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/** Catmull-Rom spline through control points, sampled every `step` px. */
export function spline(ctrl: Vec[], step = 2): Vec[] {
  if (ctrl.length < 2) return ctrl.slice();
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out: Vec[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    const n = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

export function quad(a: Vec, c: Vec, b: Vec, step = 2): Vec[] {
  const n = Math.max(2, Math.ceil((dist(a, c) + dist(c, b)) / step));
  const out: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return out;
}

export function arcLengths(ps: Vec[]): number[] {
  const out = [0];
  for (let i = 1; i < ps.length; i++) out.push(out[i - 1] + dist(ps[i - 1], ps[i]));
  return out;
}

export function polyLength(ps: Vec[]) {
  let l = 0;
  for (let i = 1; i < ps.length; i++) l += dist(ps[i - 1], ps[i]);
  return l;
}

/** Point-in-polygon (even-odd). */
export function inPoly(p: Vec, poly: Vec[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
