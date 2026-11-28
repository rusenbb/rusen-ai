// A neuron in the manner of Cajal's Golgi-stain drawings: a dense black soma,
// tapering dendrites that fork and bristle with spines, and one long thin
// axon ending in a spray of boutons.
import { type Vec, add, lerp, mul, polar, rot, spline, v } from "./geom.ts";
import { Figure, Group } from "./node.ts";
import { rng, type Rng } from "./rng.ts";
import { type Stroke, pen } from "./stroke.ts";
import { hatch, dotStrokes } from "./primitives.ts";
import { palette } from "./style.ts";

export type NeuronOpts = {
  seed?: number;
  /** Soma radius in px. */
  size?: number;
  kind?: "pyramidal" | "stellate";
  dendrites?: number;
  /** How far the dendritic tree reaches, in soma radii. */
  reach?: number;
  /** Direction the axon leaves, radians (0 = right, PI/2 = down). */
  axonAngle?: number;
  axonLength?: number;
  spines?: boolean;
  color?: string;
};

type Branch = { strokes: Stroke[] };

function grow(R: Rng, start: Vec, angle: number, length: number, width: number, depth: number, o: { spines: boolean; color: string }, out: Stroke[]) {
  // one segment until the next fork, as a gently wandering curve
  const n = 4 + Math.floor(R() * 3);
  const ctrl: Vec[] = [start];
  let a = angle, p = start;
  for (let i = 0; i < n; i++) {
    a += R.normal(0.16);
    p = add(p, polar(a, length / n));
    ctrl.push(p);
  }
  const path = spline(ctrl, 2);
  const w0 = width, w1 = width * 0.62;
  const s = pen(path, { seed: Math.floor(R() * 1e9), width: w0, color: o.color, wobble: 0.35, taper: [0.0, depth > 2 ? 0.5 : 0.08], blot: 0, pressure: (t) => lerp(1, w1 / w0, t) });
  out.push(s);
  if (o.spines && depth >= 1 && width < 3.4) {
    for (let i = 4; i < path.length - 2; i += 4 + Math.floor(R() * 5)) {
      const q = path[i], q2 = path[i + 1];
      const side = R() < 0.5 ? 1 : -1;
      const dir = Math.atan2(q2.y - q.y, q2.x - q.x) + side * R.range(0.9, 1.9);
      const l = R.range(2, 4.8);
      const tip = add(q, polar(dir, l));
      out.push(pen([q, tip], { seed: Math.floor(R() * 1e9), width: 1.05, wobble: 0, taper: [0, 0.2], blot: 0, color: o.color }));
      if (R() < 0.08) out.push(...dotStrokes(tip, 0.9, { seed: Math.floor(R() * 1e9), color: o.color }));
    }
  }
  if (depth >= 4 || width < 0.9) return;
  const forks = R() < 0.18 && depth > 0 ? 1 : 2;
  for (let k = 0; k < forks; k++) {
    const spread = forks === 1 ? R.normal(0.15) : (k === 0 ? -1 : 1) * R.range(0.25, 0.55);
    grow(R, p, a + spread, length * R.range(0.62, 0.85), w1 * R.range(0.8, 0.95), depth + 1, o, out);
  }
}

export function neuron(o: NeuronOpts = {}): Group {
  const seed = o.seed ?? 7;
  const R = rng(seed);
  const r = o.size ?? 22;
  const color = o.color ?? palette.ink;
  const kind = o.kind ?? "pyramidal";
  const reach = o.reach ?? 6;
  const axA = o.axonAngle ?? Math.PI / 2;
  const spines = o.spines ?? true;

  // --- soma outline: a lumpy triangle for pyramidal cells, a lumpy disc otherwise
  const outline: Vec[] = [];
  const lobes = R.range(0, 6.28);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    let rr = r * (1 + 0.1 * Math.sin(3 * a + lobes) + 0.05 * Math.sin(5 * a + lobes * 2));
    if (kind === "pyramidal") {
      // pointed apex towards -y (up), broad base
      const up = Math.max(0, -Math.sin(a));
      rr *= 1 + 0.55 * Math.pow(up, 6) - 0.12 * Math.max(0, Math.sin(a));
    }
    outline.push(v(Math.cos(a) * rr, Math.sin(a) * rr));
  }
  const somaInside = (p: Vec) => {
    const a = Math.atan2(p.y, p.x);
    const i = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 48) % 48;
    return Math.hypot(p.x, p.y) < Math.hypot(outline[i].x, outline[i].y) - 0.8;
  };
  const somaFill = hatch(somaInside, { x: -2 * r, y: -2 * r, w: 4 * r, h: 4 * r }, { seed: seed + 1, spacing: 1.25, width: 3, color, cross: true, curl: 0.12 });
  const ring = pen([...outline, outline[0], outline[1]], { seed: seed + 2, width: 2.4, color, wobble: 0.4, taper: [0, 0.05] });
  const soma = new Group([new Figure([ring]), somaFill]).named("soma");

  // --- dendrites
  const dStrokes: Stroke[] = [];
  const nD = o.dendrites ?? (kind === "pyramidal" ? 5 : 7);
  const rootLen = r * reach * 0.38;
  if (kind === "pyramidal") {
    // apical dendrite: a long trunk upward, opening into a tuft
    const apex = v(0, -r * 1.45);
    const trunk: Vec[] = [apex];
    let p = apex, a = -Math.PI / 2;
    const tl = r * reach * 0.9;
    for (let i = 0; i < 8; i++) { a += R.normal(0.06); p = add(p, polar(a, tl / 8)); trunk.push(p); }
    const tpath = spline(trunk, 2);
    dStrokes.push(pen(tpath, { seed: seed + 3, width: r * 0.32, color, wobble: 0.4, taper: [0, 0.05], blot: 0, pressure: (t) => lerp(1, 0.42, Math.pow(t, 0.7)) }));
    // oblique branches along the trunk
    for (let i = 2; i < trunk.length - 1; i += 2) {
      const side = i % 4 === 0 ? 1 : -1;
      grow(R, trunk[i], -Math.PI / 2 + side * R.range(0.7, 1.1), rootLen * 0.55, r * 0.14, 1, { spines, color }, dStrokes);
    }
    for (let k = 0; k < 3; k++) grow(R, p, -Math.PI / 2 + (k - 1) * 0.55 + R.normal(0.1), rootLen * 0.7, r * 0.17, 1, { spines, color }, dStrokes);
  }
  for (let k = 0; k < nD; k++) {
    let a = kind === "pyramidal" ? Math.PI * (0.05 + (0.9 * k) / Math.max(1, nD - 1)) + R.normal(0.12) : (k / nD) * Math.PI * 2 + R.normal(0.2);
    if (Math.abs(((a - axA + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35) a += 0.5; // keep clear of the axon
    const startP = mul(polar(a, 1), r * 0.85);
    grow(R, startP, a, rootLen * R.range(0.8, 1.2), r * 0.24, 0, { spines, color }, dStrokes);
  }
  const dendrites = new Figure(dStrokes).named("dendrites");

  // --- axon: hillock cone, long meander, terminal arbor with boutons
  const aStrokes: Stroke[] = [];
  const hill = mul(polar(axA, 1), r * 0.95);
  const L = o.axonLength ?? r * reach * 1.6;
  const ax: Vec[] = [hill];
  let p = hill, a = axA;
  for (let i = 0; i < 10; i++) { a += R.normal(0.07) + (axA - a) * 0.2; p = add(p, polar(a, L / 10)); ax.push(p); }
  aStrokes.push(pen(spline(ax, 2), { seed: seed + 4, width: 1.5, color, wobble: 0.5, taper: [0, 0.03], blot: 0, pressure: (t) => (t < 0.04 ? lerp(3.2, 1, t / 0.04) : 1) }));
  // collaterals
  for (const i of [4, 7]) {
    const side = i === 4 ? 1 : -1;
    const q = ax[i];
    const c: Vec[] = [q];
    let qa = axA + side * R.range(0.9, 1.3), qq = q;
    for (let j = 0; j < 4; j++) { qa += R.normal(0.15); qq = add(qq, polar(qa, L * 0.05)); c.push(qq); }
    aStrokes.push(pen(spline(c, 2), { seed: seed + 40 + i, width: 1.1, color, wobble: 0.4, taper: [0, 0.2], blot: 0 }));
    aStrokes.push(...dotStrokes(qq, 2, { seed: seed + 60 + i, color }));
  }
  const terms = 5 + Math.floor(R() * 3);
  for (let k = 0; k < terms; k++) {
    const c: Vec[] = [p];
    let ta = a + (k - (terms - 1) / 2) * 0.32 + R.normal(0.1), tp = p;
    for (let j = 0; j < 3; j++) { ta += R.normal(0.2); tp = add(tp, polar(ta, L * R.range(0.035, 0.06))); c.push(tp); }
    aStrokes.push(pen(spline(c, 2), { seed: seed + 100 + k, width: 1.05, color, wobble: 0.3, taper: [0, 0.15], blot: 0 }));
    aStrokes.push(...dotStrokes(tp, R.range(2, 3), { seed: seed + 200 + k, color }));
  }
  const axon = new Figure(aStrokes).named("axon");

  const g = new Group([soma, dendrites, axon]);
  (g as Group & { terminal: Vec }).terminal = p;
  return g;
}

/** Where the axon of a neuron built with these options ends (local coords). */
export function axonEnd(n: Group): Vec {
  return (n as Group & { terminal: Vec }).terminal;
}

export { rot };
