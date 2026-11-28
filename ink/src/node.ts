// Scene graph. A Node has a transform and two animatable channels:
// `drawn` (how much of its ink is on the page, 0..1) and `opacity`.
import { type Mat, type Stroke, I, matMul, renderStroke, strokeLength } from "./stroke.ts";

export type State = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  drawn: number;
  /** Override ink colour (e.g. turn a part red). null = keep. */
  color: string | null;
  /** How far ink is blended towards `color` (0..1), for smooth recolouring. */
  tint: number;
};

export const defaultState = (): State => ({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, drawn: 1, color: null, tint: 1 });

/** A colour a parent hands down: blend each stroke `a` of the way to `c`. */
export type Tint = { c: string; a: number } | null;
export const tintOf = (st: State, parent: Tint): Tint => (st.color ? { c: st.color, a: st.tint } : parent);
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export function mixColor(base: string, t: Tint): string {
  if (!t || t.a <= 0) return base;
  if (t.a >= 1 || !base.startsWith("#") || !t.c.startsWith("#")) return t.c;
  const a = rgb(base), b = rgb(t.c);
  const m = a.map((x, i) => Math.round(x + (b[i] - x) * t.a));
  return `#${m.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

let ids = 0;

export type RenderCtx = {
  ctx: any;
  /** Pen lift between strokes, in px of "virtual" length. */
  lift: number;
  /** Scene visibility test; groups skip children that haven't appeared yet. */
  visible?: (n: Node) => boolean;
};

export abstract class Node {
  id = ++ids;
  name = "";
  base: State = defaultState();
  state: State = defaultState();
  parent: Node | null = null;

  at(x: number, y: number) { this.base.x = x; this.base.y = y; return this; }
  scaled(s: number) { this.base.scale = s; return this; }
  rotated(r: number) { this.base.rotation = r; return this; }
  named(n: string) { this.name = n; return this; }

  reset() { this.state = { ...this.base }; for (const c of this.children()) c.reset(); }
  children(): Node[] { return []; }
  /** Ink length in local px; used to pace drawing. */
  abstract inkLength(): number;
  /** Number of pen lifts, also used to pace drawing. */
  abstract strokeCount(): number;

  localMatrix(): Mat {
    const s = this.state;
    const c = Math.cos(s.rotation) * s.scale, si = Math.sin(s.rotation) * s.scale;
    return [c, si, -si, c, s.x, s.y];
  }

  /** Render with a share of ink `share` (0..1) handed down from the parent. */
  abstract render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: Tint): void;

  /** Bake the current transform into a matrix (for export/inspection). */
  world(): Mat {
    let m = this.localMatrix();
    let p = this.parent;
    while (p) { m = matMul(p.localMatrix(), m); p = p.parent; }
    return m;
  }
}

/** Leaf: a bundle of ink strokes drawn in order. */
export class Figure extends Node {
  strokes: Stroke[];
  private _len: number[] | null = null;
  constructor(strokes: Stroke[] = []) { super(); this.strokes = strokes; }

  lengths() { return (this._len ??= this.strokes.map(strokeLength)); }
  inkLength() { return this.lengths().reduce((a, b) => a + b, 0); }
  strokeCount() { return this.strokes.length; }

  render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: Tint) {
    const st = this.state;
    const m = matMul(parent, this.localMatrix());
    const d = st.drawn * share;
    const op = opacity * st.opacity;
    const col = tintOf(st, color);
    if (d <= 0 || op <= 0) return;
    const lens = this.lengths();
    const total = lens.reduce((a, b) => a + b, 0) + rc.lift * this.strokes.length;
    let budget = d * total;
    for (let i = 0; i < this.strokes.length && budget > 0; i++) {
      const s = this.strokes[i];
      const L = lens[i] + rc.lift;
      const p = Math.min(1, budget / L);
      budget -= L;
      const drawP = Math.min(1, (p * L) / Math.max(lens[i], 1e-6));
      renderStroke(rc.ctx, col ? { ...s, color: mixColor(s.color, col) } : s, m, d >= 1 ? 1 : drawP, op);
    }
  }
}

/** Children drawn one after another; `lag` < 1 overlaps them (Manim's lag_ratio). */
export class Group extends Node {
  items: Node[];
  lag = 1;
  constructor(items: Node[] = []) {
    super();
    this.items = items;
    for (const i of items) {
      // A node lives in exactly one group. Re-grouping silently breaks when it appears;
      // to act on nodes that are already placed, use each(nodes, anim) or pass arrays.
      if (i.parent && process.env.INK_STRICT !== "0") console.warn(`ink: node${i.name ? ` "${i.name}"` : ""} moved into a second group; use each() or an array instead`);
      i.parent = this;
    }
  }
  add(...n: Node[]) { for (const i of n) { i.parent = this; this.items.push(i); } return this; }
  children() { return this.items; }
  inkLength() { return this.items.reduce((a, n) => a + n.inkLength(), 0); }
  strokeCount() { return this.items.reduce((a, n) => a + n.strokeCount(), 0); }
  withLag(l: number) { this.lag = l; return this; }

  render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: Tint) {
    const st = this.state;
    const m = matMul(parent, this.localMatrix());
    const d = st.drawn * share;
    const op = opacity * st.opacity;
    const col = tintOf(st, color);
    if (d <= 0 || op <= 0) return;
    const ws = this.items.map((n) => n.inkLength() + rc.lift * n.strokeCount());
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    // With lag < 1 every child starts earlier, so the timeline is compressed.
    const span = ws.map((w) => w / total);
    let start = 0;
    const starts = span.map((s) => { const v = start; start += s * this.lag; return v; });
    const end = Math.max(...starts.map((s, i) => s + span[i]));
    for (let i = 0; i < this.items.length; i++) {
      const t = d * end;
      const p = span[i] > 0 ? Math.max(0, Math.min(1, (t - starts[i]) / span[i])) : 1;
      if (rc.visible && !rc.visible(this.items[i])) continue;
      this.items[i].render(rc, m, d >= 1 ? 1 : p, op, col);
    }
  }
}

export const group = (...items: Node[]) => new Group(items);

export { I };
