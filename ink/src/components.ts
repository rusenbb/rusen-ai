// Layer 2, composite graphics. Built only from primitives (layer 1), so they
// look and animate like everything else. Each returns a Group whose parts are
// named, so a scene can draw, recolour or move one part on its own.
// The signature drawings (neuron, loss surface, embedding space) live in
// neuron.ts and three.ts and belong to this layer too.
import { type Vec, add, polar, v } from "./geom.ts";
import { Figure, Group, type Node } from "./node.ts";
import { rng } from "./rng.ts";
import { pen } from "./stroke.ts";
import { palette } from "./style.ts";
import { arc, arrow, box, circleStroke, curve, dotStrokes, hatch, line, type Mark } from "./primitives.ts";
import { tex, text, type TextOpts } from "./text.ts";

type Named = Record<string, Node>;
/** A Group that also exposes its parts as properties: g.ring, g.fill ... */
function parts<T extends Named>(p: T, order: (keyof T)[] = Object.keys(p)): Group & T {
  for (const [k, n] of Object.entries(p)) n.named(k);
  return Object.assign(new Group(order.map((k) => p[k])), p);
}

let auto = 7;
const sd = (o: { seed?: number }) => o.seed ?? (auto = (auto * 48271) % 2147483647);

// ---------------------------------------------------------------- diagrams

/** A circle with a label inside: the basic node of every diagram. */
export function node(c: Vec, r: number, label = "", o: Mark & { shade?: boolean; textOpts?: TextOpts } = {}) {
  const seed = sd(o);
  const ring = new Figure([circleStroke(v(0, 0), r, { ...o, seed })]);
  const p: Named = { ring };
  if (o.shade) {
    // crescent of hatching on the lower right, light from the upper left
    const inside = (q: Vec) => Math.hypot(q.x, q.y) < r - 3 && Math.hypot(q.x + r * 0.35, q.y + r * 0.35) > r * 0.95;
    p.shade = hatch(inside, { x: -r, y: -r, w: 2 * r, h: 2 * r }, { seed: seed + 5, spacing: Math.max(3, r / 11), width: 0.9, color: o.color });
  }
  if (label) p.label = text(label, { size: r * 0.8, ...o.textOpts });
  const g = parts(p);
  g.at(c.x, c.y);
  return g as unknown as Group & { ring: Figure; shade?: Figure; label?: Node };
}

/** A curly brace from a to b, bulging to the left of a→b, with an optional label. */
export function brace(a: Vec, b: Vec, label = "", o: Mark & { depth?: number; textOpts?: TextOpts } = {}) {
  const seed = sd(o);
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const d = o.depth ?? Math.min(22, L * 0.08);
  const at = (t: number, k: number) => v(a.x + ux * L * t + nx * d * k, a.y + uy * L * t + ny * d * k);
  // two halves meeting at a point in the middle, like a hand-drawn brace
  const half1 = [at(0, 0), at(0.03, 0.55), at(0.12, 0.62), at(0.4, 0.62), at(0.47, 0.75), at(0.5, 1.25)];
  const half2 = [at(0.5, 1.25), at(0.53, 0.75), at(0.6, 0.62), at(0.88, 0.62), at(0.97, 0.55), at(1, 0)];
  const shape = new Figure([pen(half1.length ? curvePts(half1) : [], { ...o, seed, taper: [0.1, 0.05] }), pen(curvePts(half2), { ...o, seed: seed + 1, taper: [0.05, 0.1] })]);
  const p: Named = { shape };
  if (label) p.label = text(label, { size: 30, ...o.textOpts }).at(at(0.5, 2.6).x, at(0.5, 2.6).y);
  return parts(p);
}
const curvePts = (ps: Vec[]) => (curve(ps).strokes[0].pts as Vec[]);

/** Thought bubble rising from `from` to a cloud of radius r at `at`. Put contents at the same point. */
export function bubble(from: Vec, at: Vec, r = 70, o: Mark = {}) {
  const seed = sd(o);
  const dx = at.x - from.x, dy = at.y - from.y;
  const trail = new Figure([circleStroke(v(from.x + dx * 0.25, from.y + dy * 0.25), r * 0.08, { seed, width: 1.6 }), circleStroke(v(from.x + dx * 0.5, from.y + dy * 0.5), r * 0.14, { seed: seed + 1, width: 1.8 })]);
  const cloud = new Figure([circleStroke(at, r, { ...o, seed: seed + 2, width: o.width ?? 2 })]);
  return parts({ trail, cloud });
}

/** A vertical gauge: a frame and a hatched fill that grows bottom-up. Use drawTo(bar.fill, 0.4). */
export function bar(x: number, y: number, w: number, h: number, o: Mark = {}) {
  const seed = sd(o);
  const frame = box(x, y, w, h, { ...o, seed, width: o.width ?? 2 });
  const fill = hatch((p) => p.x > x + 4 && p.x < x + w - 4 && p.y > y + 4 && p.y < y + h - 4, { x, y, w, h }, { seed: seed + 1, angle: Math.PI, spacing: 4.5, width: 1.6, curl: 0.02, color: o.color });
  return parts({ frame, fill }) as Group & { frame: Figure; fill: Figure };
}

/** Arcs fanning out from `at` towards `angle`: sensing, sound, a signal sent. */
export function waves(at: Vec, angle: number, o: Mark & { radii?: number[]; spread?: number } = {}) {
  const seed = sd(o);
  const sp = o.spread ?? 0.5;
  const g = new Group((o.radii ?? [62, 82, 102]).map((r, i) => arc(at, r, angle - sp, angle + sp, { width: 1.6, color: palette.faded, ...o, seed: seed + i })));
  return g.withLag(0.5);
}

/** A small ink dot to send along arrows (pattern: travel). */
export function signal(r = 7, o: Mark = {}) {
  return new Figure(dotStrokes(v(0, 0), r, { ...o, seed: sd(o) }));
}

/** A robot vacuum seen from above: shaded body and a front bumper. */
export function robot(c: Vec, r = 44, o: Mark = {}) {
  const seed = sd(o);
  const body = node(v(0, 0), r, "", { seed, shade: true, width: (o.width ?? 2.6) });
  const bumper = arc(v(0, 0), r * 0.75, Math.PI * 1.15, Math.PI * 1.85, { seed: seed + 1, width: (o.width ?? 2.6) * 0.92 });
  body.add(bumper.named("bumper"));
  body.at(c.x, c.y);
  return body;
}

/** Specks of dirt in an ellipse; if `path` is given they are ordered so undraw() lifts them where the path passes first. */
export function dirt(c: Vec, w: number, h: number, o: Mark & { path?: Vec[]; count?: number; size?: number } = {}) {
  const seed = sd(o);
  const R = rng(seed);
  const path = o.path ?? [v(c.x - w / 2, c.y), v(c.x + w / 2, c.y)];
  const L = [0];
  for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const pts: { p: Vec; t: number }[] = [];
  while (pts.length < (o.count ?? 170)) {
    const p = v(c.x + (R() - 0.5) * w, c.y + (R() - 0.5) * h);
    if (Math.hypot((p.x - c.x) / (w / 2), (p.y - c.y) / (h / 2)) > 1) continue;
    let best = 0, bd = Infinity;
    for (let i = 0; i < path.length; i++) { const d = Math.hypot(path[i].x - p.x, path[i].y - p.y); if (d < bd) { bd = d; best = i; } }
    pts.push({ p, t: L[best] });
  }
  pts.sort((a, b) => b.t - a.t);
  return new Figure(pts.map(({ p }, i) => { const a = R() * 6.28, l = R.range(0.8, 2.2); return pen([p, add(p, polar(a, l))], { width: o.size ?? 2.6, wobble: 0, taper: [0, 0], blot: 0, color: o.color ?? palette.sepia, seed: seed + i }); }));
}

// ---------------------------------------------------------------- maths

export type Axes = Group & {
  axisX: Figure; axisY: Figure; ticks: Figure;
  /** data → scene coordinates */
  toScene(x: number, y: number): Vec;
  /** y = f(x) as an ink curve on these axes */
  plot(f: (x: number) => number, o?: Mark & { from?: number; to?: number; samples?: number }): Figure;
  /** an arrow from the origin to (x, y) */
  vec(x: number, y: number, o?: Mark): Figure;
  /** ink dots at data points */
  scatter(pts: [number, number][], o?: Mark & { r?: number }): Figure;
};

/** 2D axes with arrowheads and ticks. Plots, vectors and scatters are drawn through it. */
export function axes(x: number, y: number, w: number, h: number, o: Mark & { x?: [number, number]; y?: [number, number]; ticks?: number } = {}): Axes {
  const seed = sd(o);
  const [x0, x1] = o.x ?? [-1, 1], [y0, y1] = o.y ?? [-1, 1];
  const toScene = (dx: number, dy: number) => v(x + ((dx - x0) / (x1 - x0)) * w, y + h - ((dy - y0) / (y1 - y0)) * h);
  const ox = Math.min(Math.max(0, x0), x1), oy = Math.min(Math.max(0, y0), y1);
  const axisX = arrow(toScene(x0, oy), add(toScene(x1, oy), v(18, 0)), { seed, bend: 0, head: 12, width: 1.8 });
  const axisY = arrow(toScene(ox, y0), add(toScene(ox, y1), v(0, -18)), { seed: seed + 1, bend: 0, head: 12, width: 1.8 });
  const n = o.ticks ?? 4;
  const tk: ReturnType<typeof pen>[] = [];
  for (let i = 0; i <= n; i++) {
    const tx = x0 + ((x1 - x0) * i) / n, ty = y0 + ((y1 - y0) * i) / n;
    if (Math.abs(tx - ox) > 1e-9) { const p = toScene(tx, oy); tk.push(pen([v(p.x, p.y - 5), v(p.x, p.y + 5)], { seed: seed + 10 + i, width: 1.2, wobble: 0, taper: [0, 0], blot: 0 })); }
    if (Math.abs(ty - oy) > 1e-9) { const p = toScene(ox, ty); tk.push(pen([v(p.x - 5, p.y), v(p.x + 5, p.y)], { seed: seed + 30 + i, width: 1.2, wobble: 0, taper: [0, 0], blot: 0 })); }
  }
  const ticks = new Figure(tk);
  const g = parts({ axisX, axisY, ticks }) as Axes;
  g.toScene = toScene;
  g.plot = (f, po = {}) => {
    const a = po.from ?? x0, b = po.to ?? x1, k = po.samples ?? 160;
    const pts: Vec[] = [];
    for (let i = 0; i <= k; i++) { const xx = a + ((b - a) * i) / k, yy = f(xx); if (yy >= y0 && yy <= y1) pts.push(toScene(xx, yy)); }
    return new Figure([pen(pts, { width: 2.4, wobble: 0.4, ...po, seed: po.seed ?? seed + 50 })]);
  };
  g.vec = (vx, vy, vo = {}) => arrow(toScene(ox, oy), toScene(vx, vy), { bend: 0, width: 2.2, ...vo, seed: vo.seed ?? seed + 60 });
  g.scatter = (pts, so = {}) => new Figure(pts.flatMap(([px, py], i) => dotStrokes(toScene(px, py), so.r ?? 3.5, { ...so, seed: (so.seed ?? seed + 70) + i })));
  return g;
}

/** A matrix in square brackets; entries use tex markup ("w_{11}"). */
export function matrix(at: Vec, rows: string[][], o: Mark & { cell?: [number, number]; size?: number } = {}) {
  const seed = sd(o);
  const [cw, ch] = o.cell ?? [74, 54];
  const R = rows.length, C = Math.max(...rows.map((r) => r.length));
  const W = C * cw, H = R * ch;
  const x0 = at.x - W / 2, y0 = at.y - H / 2;
  const br = (x: number, dir: number, s: number) => new Figure([pen([v(x + dir * 12, y0 - 6), v(x, y0 - 6), v(x, y0 + H + 6), v(x + dir * 12, y0 + H + 6)], { ...o, seed: s, width: o.width ?? 2.2, wobble: 0.3, taper: [0.02, 0.04] })]);
  const entries = new Group(rows.flatMap((r, i) => r.map((e, j) => tex(e, { size: o.size ?? 32 }).at(x0 + (j + 0.5) * cw, y0 + (i + 0.5) * ch)))).withLag(0.6);
  return parts({ left: br(x0 - 8, 1, seed), right: br(x0 + W + 8, -1, seed + 1), entries });
}

/** A ruled table: header row, a rule under it, column rules. Cells are plain text. */
export function table(at: Vec, rows: string[][], o: Mark & { widths?: number[]; rowH?: number; size?: number; header?: boolean } = {}) {
  const seed = sd(o);
  const C = Math.max(...rows.map((r) => r.length));
  const widths = o.widths ?? Array(C).fill(180);
  const rh = o.rowH ?? 56;
  const W = widths.reduce((a, b) => a + b, 0), H = rows.length * rh;
  const x0 = at.x - W / 2, y0 = at.y - H / 2;
  const colX = widths.map((_, j) => x0 + widths.slice(0, j).reduce((a, b) => a + b, 0));
  const ruling: Node[] = [];
  if (o.header !== false) ruling.push(line(v(x0 - 8, y0 + rh), v(x0 + W + 8, y0 + rh), { seed, width: 1.6 }));
  for (let j = 1; j < C; j++) ruling.push(line(v(colX[j], y0 - 6), v(colX[j], y0 + H + 6), { seed: seed + j, width: 1.4 }));
  const cells = new Group(rows.flatMap((r, i) => r.map((c, j) => text(c, { size: o.size ?? 30, color: i === 0 && o.header !== false ? palette.faded : palette.ink }).at(colX[j] + widths[j] / 2, y0 + (i + 0.5) * rh)))).withLag(0.7);
  return parts({ rules: new Group(ruling), cells });
}

export { box, line };
