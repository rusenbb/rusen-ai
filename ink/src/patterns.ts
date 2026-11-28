// Layer 3, patterns: the storytelling moves that recur across videos, built
// from components. Each takes the scene and plays its steps.
import { type Anim, draw, ease, fadeIn, fadeOut, indicate, moveAlong, moveTo, recolor } from "./anim.ts";
import { type Vec, v } from "./geom.ts";
import type { Figure, Node } from "./node.ts";
import { arrow } from "./primitives.ts";
import type { Network } from "./figures.ts";
import type { Scene } from "./scene.ts";
import { signal, waves } from "./components.ts";
import { palette } from "./style.ts";
import { text } from "./text.ts";

/** The centre-line of an arrow (or any figure's first stroke), for travel(). */
export const shaft = (f: Figure): Vec[] => f.strokes[0].pts.map((p) => v(p.x, p.y));

/** Something senses towards `angle`: waves go out and fade, `times` times. */
export function sense(s: Scene, at: Vec, angle: number, o: { times?: number; radii?: number[]; seed?: number } = {}) {
  for (let i = 0; i < (o.times ?? 2); i++) {
    const w = waves(at, angle, { radii: o.radii, seed: (o.seed ?? 11) + i * 7 });
    s.play(draw(w, { duration: 0.45 }));
    s.play(fadeOut(w, { duration: 0.35 }));
  }
}

/** A dot travels along a path (an arrow's shaft), optionally turning a colour on the way. */
export function travel(s: Scene, dot: Node, path: Vec[], o: { duration?: number; color?: string | null; with?: Anim[] } = {}) {
  s.play(...(o.color !== undefined ? [recolor(dot, o.color, { duration: 0.15 })] : []), moveAlong(dot, path, { duration: o.duration ?? 1, ease: ease.inOut }), ...(o.with ?? []));
}

/**
 * The feedback loop between two things (agent ↔ world, model ↔ data):
 * an arrow out along the top, an arrow back along the bottom, optional labels,
 * then a signal circles `laps` times, a little faster each lap.
 */
export function loop(s: Scene, a: { at: Vec; r: number; node?: Node }, b: { at: Vec; r: number; node?: Node }, o: { top?: string; bottom?: string; laps?: number; seed?: number } = {}) {
  const seed = o.seed ?? 500;
  const top = arrow(v(b.at.x - b.r, b.at.y - 70), v(a.at.x + a.r + 15, a.at.y - 40), { seed, bend: 0.18, width: 2.4 });
  const bottom = arrow(v(a.at.x + a.r + 15, a.at.y + 40), v(b.at.x - b.r, b.at.y + 70), { seed: seed + 1, bend: 0.18, width: 2.4 });
  const mid = (a.at.x + b.at.x) / 2;
  const tl = o.top ? text(o.top, { size: 34, color: palette.faded }).at(mid, Math.min(a.at.y, b.at.y) - 140) : null;
  const bl = o.bottom ? text(o.bottom, { size: 34, color: palette.faded }).at(mid, Math.max(a.at.y, b.at.y) + 145) : null;
  s.play(draw(top, { duration: 0.9 }), ...(tl ? [draw(tl, { duration: 0.6 })] : []));
  s.play(draw(bottom, { duration: 0.9 }), ...(bl ? [draw(bl, { duration: 0.6 })] : []));
  const dot = signal(7, { seed: seed + 2 });
  const start = shaft(top)[0];
  dot.at(start.x, start.y);
  s.play(fadeIn(dot, { duration: 0.3 }));
  const laps = o.laps ?? 3;
  for (let i = 0; i < laps; i++) {
    const d = 1.4 * Math.pow(0.72, i);
    travel(s, dot, shaft(top), { duration: d, color: null });
    if (a.node) s.play(indicate(a.node, { duration: 0.3, amount: 0.08 }));
    travel(s, dot, shaft(bottom), { duration: d, color: palette.red });
    if (b.node) s.play(indicate(b.node, { duration: 0.3, amount: 0.03 }));
    if (i < laps - 1) s.play(moveTo(dot, start.x, start.y, { duration: 0.01 }));
  }
  return { top, bottom, labels: [tl, bl].filter(Boolean) as Node[], dot };
}

/** Lay out n things side by side: returns the left x of each slot. */
export function columns(s: Scene, n: number, slotWidth: number, gap = 80) {
  const total = n * slotWidth + (n - 1) * gap;
  const x0 = (s.width - total) / 2;
  return Array.from({ length: n }, (_, i) => x0 + i * (slotWidth + gap));
}

/** Emphasise the winner of a comparison: blend it to red and write a word under it. */
export function crown(s: Scene, nodes: Node[], word: string, at: Vec) {
  s.play(...nodes.map((n) => recolor(n, palette.red, { duration: 1 })));
  const w = text(word, { size: 52, color: palette.red }).at(at.x, at.y);
  s.play(draw(w, { duration: 1 }));
  return w;
}

// ---------------------------------------------------------------- networks

const wire = (e: Figure, reverse = false) => { const p = shaft(e); return reverse ? p.slice().reverse() : p; };

/** Activations flow left to right: dots run along every wire of a layer at once, then the next layer lights up. */
export function forward(s: Scene, net: Network, o: { duration?: number } = {}) {
  const d = o.duration ?? 0.9;
  s.play(...net.layers[0].map((n) => indicate(n, { duration: 0.4, amount: 0.12 })));
  for (let l = 0; l < net.edges.length; l++) {
    const dots: Node[] = [];
    const anims: Anim[] = [];
    net.edges[l].flat().forEach((e, k) => {
      const p = wire(e);
      const dot = signal(4.5, { seed: 7000 + l * 100 + k }).at(p[0].x, p[0].y);
      dots.push(dot);
      anims.push(fadeIn(dot, { duration: 0.15 }), moveAlong(dot, p, { duration: d, ease: ease.inOut }));
    });
    s.play(...anims);
    s.play(...dots.map((dt) => fadeOut(dt, { duration: 0.2 })), ...net.layers[l + 1].map((n) => indicate(n, { duration: 0.45, amount: 0.12 })));
  }
}

/**
 * Backpropagation: the error appears at the output in red, then flows right
 * to left; each layer's wires flush red as their gradient arrives, then
 * everything settles back to ink (the weights have been updated).
 */
export function backprop(s: Scene, net: Network, o: { duration?: number; seed?: number } = {}) {
  const d = o.duration ?? 0.9;
  const out = net.layers[net.layers.length - 1];
  s.play(...out.map((n) => recolor(n, palette.red, { duration: 0.5 })), ...out.map((n) => indicate(n, { duration: 0.6, amount: 0.15 })));
  for (let l = net.edges.length - 1; l >= 0; l--) {
    const es = net.edges[l].flat();
    const dots: Node[] = [];
    const anims: Anim[] = [];
    es.forEach((e, k) => {
      const p = wire(e, true);
      const dot = signal(4.5, { seed: (o.seed ?? 9000) + l * 100 + k, color: palette.red }).at(p[0].x, p[0].y);
      dots.push(dot);
      anims.push(fadeIn(dot, { duration: 0.15 }), moveAlong(dot, p, { duration: d, ease: ease.inOut }), recolor(e, palette.red, { duration: d }));
    });
    s.play(...anims);
    s.play(...dots.map((dt) => fadeOut(dt, { duration: 0.2 })), ...net.layers[l].map((n) => recolor(n, palette.red, { duration: 0.4 })));
  }
  // weights settle: wires return to ink, the gradient's mark fades from the nodes
  s.play(...net.edges.flat(2).map((e) => recolor(e, null, { duration: 1.2 })), ...net.layers.flat().map((n) => recolor(n, null, { duration: 1.2 })));
}
