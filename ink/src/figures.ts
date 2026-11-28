// Layer 3, figures: characters and compound diagrams built from components.
// They carry meaning on their own (an agent you can trust or not, a network
// a signal can flow through), so patterns can animate them directly.
import { type Vec, v } from "./geom.ts";
import { Figure, Group, type Node } from "./node.ts";
import { arc, box, circleStroke, dotStrokes, hatch, line, lineStroke, stipple, type Mark } from "./primitives.ts";
import { node } from "./components.ts";
import { cachedTone, loadTone, portrait, type PortraitOpts, type Portrait } from "./portrait.ts";
import { rng } from "./rng.ts";
import { pen } from "./stroke.ts";
import { palette } from "./style.ts";

let auto = 31;
const sd = (o: { seed?: number }) => o.seed ?? (auto = (auto * 48271) % 2147483647);
function parts<T extends Record<string, Node>>(p: T): Group & T {
  for (const [k, n] of Object.entries(p)) n.named(k);
  return Object.assign(new Group(Object.values(p)), p);
}

export type AgentOpts = Mark & {
  /** true: calm, open face, upright antenna. false: narrowed eyes, crooked grin, bent antenna. */
  aligned?: boolean;
  size?: number;
};

/**
 * An agent character: head with eyes and mouth, antenna, body, arms.
 * Parts: head, eyes, mouth, antenna, body, arms. Same proportions every
 * time, so a series can reuse "the agent" as a recurring character.
 */
export function agent(c: Vec, o: AgentOpts = {}) {
  const seed = sd(o);
  const k = (o.size ?? 100) / 100;
  const al = o.aligned ?? true;
  const w = (o.width ?? 2.4) * Math.sqrt(k);
  const P = (x: number, y: number) => v(x * k, y * k);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
  const eyes = al
    ? new Figure([...dotStrokes(P(-12, -66), 4.2 * k, { seed: seed + 1 }), ...dotStrokes(P(12, -66), 4.2 * k, { seed: seed + 2 })])
    : new Figure([lineStroke(P(-19, -70), P(-6, -66), { seed: seed + 1, width: w * 1.3 }), lineStroke(P(6, -66), P(19, -70), { seed: seed + 2, width: w * 1.3 })]);
  const mouth = al
    ? arc(P(0, -60), 13 * k, Math.PI * 0.2, Math.PI * 0.8, { seed: seed + 3, width: w })
    : new Figure([pen([P(-14, -48), P(-2, -50), P(8, -47), P(15, -53)], { seed: seed + 3, width: w, wobble: 0.2 })]);
  const antenna = al
    ? new Figure([lineStroke(P(0, -96), P(0, -122), { seed: seed + 4, width: w }), ...dotStrokes(P(0, -126), 5 * k, { seed: seed + 5 })])
    : new Figure([pen([P(0, -96), P(4, -110), P(16, -118)], { seed: seed + 4, width: w, wobble: 0.2 }), ...dotStrokes(P(19, -120), 5 * k, { seed: seed + 5 })]);
  const body = box(-30 * k, -24 * k, 60 * k, 74 * k, { seed: seed + 6, width: w });
  const arms = new Figure([
    pen([P(-30, -14), P(-52, 8), P(-50, 30)], { seed: seed + 7, width: w }),
    pen(al ? [P(30, -14), P(52, 8), P(50, 30)] : [P(30, -14), P(54, -24), P(64, -42)], { seed: seed + 8, width: w }),
  ]);
  const g = parts({ antenna, head, eyes, mouth, body, arms });
  g.at(c.x, c.y);
  return g;
}

// ---------------------------------------------------------------- the agent family
// Same body plan as agent(): a round head on a box body, so they read as one
// family that grows up: reflex -> learning -> AGI -> superintelligence.

type Kin = Mark & { size?: number };
type Inside = { inside: (p: Vec) => boolean };

/** Scene-space test for "inside the head or body", following the group wherever it moves. */
function withSilhouette<T extends Group>(g: T, k: number, headR: number, body: [number, number, number, number], pad = 4): T & Inside {
  return Object.assign(g, {
    inside: (p: Vec) => {
      const m = g.world();
      const det = m[0] * m[3] - m[1] * m[2];
      const dx = p.x - m[4], dy = p.y - m[5];
      const x = (m[3] * dx - m[2] * dy) / det, y = (-m[1] * dx + m[0] * dy) / det;
      if (Math.hypot(x, y + 62 * k) < headR * k + pad) return true;
      const [bx, by, bw, bh] = body.map((q) => q * k);
      return x > bx - pad && x < bx + bw + pad && y > by - pad && y < by + bh + pad;
    },
  });
}
const kin = (o: Kin, def: number) => {
  const k = (o.size ?? def) / 100;
  return { k, w: (o.width ?? 2.4) * Math.sqrt(k), P: (x: number, y: number) => v(x * k, y * k), seed: sd(o) };
};

/**
 * Simple reflex agent: one eye, a straight mouth, stiff arms. It sees only
 * the present and answers with a rule. Parts: head, eye, mouth, antenna, body, arms, rule.
 */
export function reflexAgent(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 100);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
  const eye = new Figure([circleStroke(P(0, -66), 10 * k, { seed: seed + 1, width: w * 0.8 }), ...dotStrokes(P(0, -66), 4.4 * k, { seed: seed + 2 })]);
  const mouth = line(P(-11, -47), P(11, -47), { seed: seed + 3, width: w, wobble: 0.15 });
  const antenna = new Figure([lineStroke(P(0, -96), P(0, -116), { seed: seed + 4, width: w }), lineStroke(P(-8, -116), P(8, -116), { seed: seed + 5, width: w })]);
  const body = box(-30 * k, -24 * k, 60 * k, 74 * k, { seed: seed + 6, width: w });
  // arms bent at right angles, like levers
  const arms = new Figure([
    pen([P(-30, -14), P(-50, -14), P(-50, 22)], { seed: seed + 7, width: w, wobble: 0.15 }),
    pen([P(30, -14), P(50, -14), P(50, 22)], { seed: seed + 8, width: w, wobble: 0.15 }),
  ]);
  // "if -> then" on the chest: a switch
  const rule = new Figure([
    ...dotStrokes(P(-12, 14), 3.4 * k, { seed: seed + 9 }),
    lineStroke(P(-12, 14), P(10, 2), { seed: seed + 10, width: w * 0.8 }),
    ...dotStrokes(P(14, 14), 3.4 * k, { seed: seed + 11 }),
  ]);
  const g = withSilhouette(parts({ antenna, head, eye, mouth, body, arms, rule }), k, 34, [-30, -24, 60, 74]);
  g.at(c.x, c.y);
  return g;
}

/**
 * Learning agent: two eyes and a raised brow (curious), a bulb on the
 * antenna, and a rising learning curve on its chest.
 * Parts: antenna, head, eyes, brow, mouth, body, curve, arms.
 */
export function learningAgent(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 100);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
  const eyes = new Figure([...dotStrokes(P(-12, -64), 4.2 * k, { seed: seed + 1 }), ...dotStrokes(P(12, -64), 4.2 * k, { seed: seed + 2 })]);
  const brow = new Figure([pen([P(5, -76), P(12, -80), P(20, -78)], { seed: seed + 3, width: w * 0.9, wobble: 0.15 })]);
  const mouth = arc(P(0, -58), 11 * k, Math.PI * 0.25, Math.PI * 0.75, { seed: seed + 4, width: w });
  const antenna = new Figure([
    lineStroke(P(0, -96), P(0, -112), { seed: seed + 5, width: w }),
    circleStroke(P(0, -124), 9 * k, { seed: seed + 6, width: w * 0.8 }),
    pen(Array.from({ length: 13 }, (_, i) => P(-4 + (8 * i) / 12, -125 + 1.8 * Math.sin((i / 12) * Math.PI * 4))), { seed: seed + 7, width: w * 0.45, wobble: 0, taper: [0, 0] }),
  ]);
  const body = box(-30 * k, -24 * k, 60 * k, 74 * k, { seed: seed + 8, width: w });
  const curve = new Figure([
    lineStroke(P(-20, -12), P(-20, 36), { seed: seed + 9, width: w * 0.6 }),
    lineStroke(P(-20, 36), P(22, 36), { seed: seed + 10, width: w * 0.6 }),
    pen(Array.from({ length: 24 }, (_, i) => { const t = i / 23; return P(-18 + 38 * t, 32 - 40 * (1 - Math.exp(-3.2 * t)) + 3 * Math.sin(t * 19) * (1 - t)); }), { seed: seed + 11, width: w * 0.85, wobble: 0.1 }),
  ]);
  const arms = new Figure([
    pen([P(-30, -14), P(-52, 8), P(-50, 30)], { seed: seed + 12, width: w }),
    pen([P(30, -14), P(50, -30), P(56, -48)], { seed: seed + 13, width: w }), // hand up: "I can try that"
  ]);
  const g = withSilhouette(parts({ antenna, head, eyes, brow, mouth, body, curve, arms }), k, 34, [-30, -24, 60, 74]);
  g.at(c.x, c.y);
  return g;
}

/**
 * AGI: the same character, grown up. Large and calm: half-closed eyes, a
 * slight smile, hands folded, shaded volume. Parts: antenna, head, eyes, mouth, body, shade, arms.
 */
export function agi(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 190);
  const head = new Figure([circleStroke(P(0, -62), 36 * k, { seed, width: w })]);
  const lid = (x: number, s: number) => [
    pen(Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.1 + 0.8 * (i / 8)); return P(x + 7 * Math.cos(a), -64 - 2.2 * Math.sin(a)); }), { seed: s, width: w * 0.8, wobble: 0.1 }),
    ...dotStrokes(P(x, -62), 3 * k, { seed: s + 1 }),
  ];
  const eyes = new Figure([...lid(-13, seed + 1), ...lid(13, seed + 3)]);
  const mouth = arc(P(0, -60), 14 * k, Math.PI * 0.33, Math.PI * 0.67, { seed: seed + 5, width: w * 0.9 });
  const antenna = new Figure([lineStroke(P(0, -98), P(0, -114), { seed: seed + 6, width: w }), circleStroke(P(0, -120), 5.5 * k, { seed: seed + 7, width: w * 0.8 })]);
  const body = box(-34 * k, -24 * k, 68 * k, 80 * k, { seed: seed + 8, width: w });
  const shade = hatch((q) => q.x > 12 * k && q.x < 31 * k && q.y > -20 * k && q.y < 52 * k, { x: 10 * k, y: -22 * k, w: 24 * k, h: 76 * k }, { seed: seed + 9, spacing: 4.5 * Math.sqrt(k), width: 0.9, tone: (q) => (q.x - 10 * k) / (22 * k) });
  // arms at rest, a little away from the body, open hands
  const arms = new Figure([
    pen([P(-34, -14), P(-46, 6), P(-48, 34)], { seed: seed + 10, width: w }),
    pen([P(-48, 34), P(-52, 40)], { seed: seed + 12, width: w * 0.8 }),
    pen([P(-48, 34), P(-45, 41)], { seed: seed + 13, width: w * 0.8 }),
    pen([P(34, -14), P(46, 6), P(48, 34)], { seed: seed + 11, width: w }),
    pen([P(48, 34), P(52, 40)], { seed: seed + 14, width: w * 0.8 }),
    pen([P(48, 34), P(45, 41)], { seed: seed + 15, width: w * 0.8 }),
  ]);
  const g = withSilhouette(parts({ antenna, head, eyes, mouth, body, shade, arms }), k, 36, [-34, -24, 68, 80]);
  g.at(c.x, c.y);
  return g;
}

/**
 * Superintelligence: the same character at a scale nothing was built for.
 * Default size is huge on purpose: place it so it spills out of a sandbox or
 * the screen. Detailed irises, a stippled head, a field of antennae.
 * Parts: antennae, head, eyes, mouth, body, arms.
 */
export function superintelligence(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 520);
  const R = rng(seed);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
  const tex = stipple((q) => Math.hypot(q.x, q.y + 62 * k) < 33 * k && q.x + q.y * 0.4 > -2 * k, { x: -34 * k, y: -96 * k, w: 68 * k, h: 68 * k }, { seed: seed + 20, count: Math.round(260 * k), size: 1.5, tone: (q) => Math.max(0, (q.x + 10 * k) / (44 * k)) ** 1.5 });
  head.strokes.push(...tex.strokes);
  const iris = (x: number, s: number) => [
    circleStroke(P(x, -66), 8 * k, { seed: s, width: w * 0.5 }),
    ...Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + R() * 0.1; return lineStroke(P(x + 3.4 * Math.cos(a), -66 + 3.4 * Math.sin(a)), P(x + 7.2 * Math.cos(a), -66 + 7.2 * Math.sin(a)), { seed: s + 1 + i, width: w * 0.22, wobble: 0.1 }); }),
    ...dotStrokes(P(x, -66), 3 * k, { seed: s + 40 }),
  ];
  const eyes = new Figure([...iris(-13, seed + 100), ...iris(13, seed + 200)]);
  const mouth = line(P(-9, -46), P(9, -46), { seed: seed + 3, width: w * 0.6, wobble: 0.1 });
  const antennae = new Figure(Array.from({ length: 7 }, (_, i) => {
    const a = -Math.PI / 2 + (i - 3) * 0.32;
    const base = P(34 * Math.cos(a), -62 + 34 * Math.sin(a));
    const tip = P(52 * Math.cos(a), -62 + 52 * Math.sin(a));
    return [lineStroke(base, tip, { seed: seed + 300 + i, width: w * 0.6 }), ...dotStrokes(tip, 2.2 * k, { seed: seed + 320 + i })];
  }).flat());
  const body = box(-30 * k, -24 * k, 60 * k, 74 * k, { seed: seed + 6, width: w });
  const arms = new Figure([
    pen([P(-30, -14), P(-58, 4), P(-62, 34)], { seed: seed + 7, width: w }),
    pen([P(30, -14), P(58, 4), P(62, 34)], { seed: seed + 8, width: w }),
  ]);
  const g = withSilhouette(parts({ antennae, head, eyes, mouth, body, arms }), k, 34, [-30, -24, 60, 74]);
  g.at(c.x, c.y);
  return g;
}

export type Sandbox = Group & { frame: Figure; band: Figure; bolts: Figure; floor: Figure; inner: { x: number; y: number; w: number; h: number } };

/**
 * A sandbox: a heavy framed test arena with bolted corners and a floor in
 * perspective, for placing an agent under observation. Centred on `c`.
 * `inner` is the free area inside the frame (scene coordinates).
 */
export function sandbox(c: Vec, o: Mark & { w?: number; h?: number; band?: number } = {}): Sandbox {
  const seed = sd(o);
  const W = o.w ?? 520, H = o.h ?? 360, b = o.band ?? 18;
  const wd = o.width ?? 2.6;
  const frame = new Figure([
    ...box(-W / 2, -H / 2, W, H, { seed, width: wd }).strokes,
    ...box(-W / 2 + b, -H / 2 + b, W - 2 * b, H - 2 * b, { seed: seed + 1, width: wd * 0.7 }).strokes,
  ]);
  const inBand = (q: Vec) => Math.abs(q.x) < W / 2 - 2 && Math.abs(q.y) < H / 2 - 2 && (Math.abs(q.x) > W / 2 - b + 2 || Math.abs(q.y) > H / 2 - b + 2);
  const band = hatch(inBand, { x: -W / 2, y: -H / 2, w: W, h: H }, { seed: seed + 2, spacing: 4.5, width: 0.9, alpha: 0.75 });
  const bolts = new Figure([[-1, -1], [1, -1], [1, 1], [-1, 1]].flatMap(([sx, sy], i) => {
    const p = v(sx * (W / 2 - b / 2), sy * (H / 2 - b / 2));
    return [circleStroke(p, b * 0.36, { seed: seed + 10 + i, width: 1.4 }), lineStroke(v(p.x - b * 0.2, p.y - b * 0.2), v(p.x + b * 0.2, p.y + b * 0.2), { seed: seed + 20 + i, width: 1.1 })];
  }));
  // floor: a horizon two thirds down, lines converging to a point above the centre
  const iw = W - 2 * b, ih = H - 2 * b, fy = -H / 2 + b + ih * 0.62, by = H / 2 - b - 2;
  const vp = v(0, fy - ih * 0.9);
  const rays: Vec[][] = [];
  for (let i = -4; i <= 4; i++) {
    const x0 = (i / 4) * (iw / 2 - 4);
    const t = (fy - vp.y) / (by - vp.y);
    rays.push([v(vp.x + (x0 - vp.x) * t, fy), v(x0, by)]);
  }
  const floor = new Figure([
    lineStroke(v(-iw / 2 + 2, fy), v(iw / 2 - 2, fy), { seed: seed + 30, width: 1.3 }),
    ...rays.map((r, i) => lineStroke(r[0], r[1], { seed: seed + 40 + i, width: 0.9, alpha: 0.7 })),
    ...[0.3, 0.62].map((f, i) => { const y = fy + (by - fy) * f; const t = (y - vp.y) / (by - vp.y); return lineStroke(v(-iw / 2 * t + 2, y), v(iw / 2 * t - 2, y), { seed: seed + 60 + i, width: 0.9, alpha: 0.7 }); }),
  ]);
  const g = parts({ floor, frame, band, bolts }) as Sandbox;
  g.at(c.x, c.y);
  g.inner = { x: c.x - iw / 2, y: c.y - ih / 2, w: iw, h: ih };
  return g;
}

// ---------------------------------------------------------------- people

/** Portraits the library knows. Photos live in assets/people with their source and licence in README.md. */
export const people: Record<string, { file: string; name: string; years: string; opts?: PortraitOpts }> = {
  turing: { file: "turing-1951.jpg", name: "Alan Turing", years: "1912–1954" },
};

export const personPath = (who: string) => (people[who] ? new URL(`../assets/people/${people[who].file}`, import.meta.url).pathname : who);

/**
 * An engraved portrait of a known person (see `people`) or of any image file:
 * `await person("turing")`. Parts: outline, shade (layer1..layer4). Centred on its origin.
 */
export async function person(who: string, o: PortraitOpts = {}): Promise<Portrait> {
  return portrait(await loadTone(personPath(who)), { ...(people[who]?.opts ?? {}), ...o });
}

/** person() for code that cannot await; the image must have been loaded with loadTone(personPath(who)). */
export function personSync(who: string, o: PortraitOpts = {}): Portrait {
  return portrait(cachedTone(personPath(who)), { ...(people[who]?.opts ?? {}), ...o });
}

export type Network = Group & {
  /** node groups per layer, left to right */
  layers: Group[][];
  /** edges[l] connects layer l to l+1; edges[l][i][j] from node i to node j */
  edges: Figure[][][];
  pos: Vec[][];
};

/** A fully connected network diagram: columns of nodes and the wires between them. */
export function network(at: Vec, sizes: number[], o: Mark & { width?: number; height?: number; r?: number; labels?: string[][] } = {}): Network {
  const seed = sd(o);
  const W = o.width ?? 900, H = o.height ?? 520, r = o.r ?? 26;
  const pos = sizes.map((n, l) => Array.from({ length: n }, (_, i) => v(at.x - W / 2 + (W * l) / Math.max(1, sizes.length - 1), at.y - ((n - 1) * Math.min(H / Math.max(1, n - 1), 120)) / 2 + i * Math.min(H / Math.max(1, n - 1), 120))));
  const layers = pos.map((col, l) => col.map((p, i) => node(p, r, o.labels?.[l]?.[i] ?? "", { seed: seed + l * 50 + i, width: 2.2, textOpts: { font: "math" } })));
  const edges = pos.slice(0, -1).map((col, l) => col.map((a, i) => pos[l + 1].map((b, j) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    return line(v(a.x + ux * (r + 6), a.y + uy * (r + 6)), v(b.x - ux * (r + 6), b.y - uy * (r + 6)), { seed: seed + 1000 + l * 400 + i * 20 + j, width: 1.3, alpha: 0.85 });
  })));
  const edgeGroups = edges.map((e) => new Group(e.flat()).withLag(0.15));
  const nodeGroups = layers.map((col) => new Group(col).withLag(0.4));
  // draw order: a layer of nodes, its outgoing wires, the next layer...
  const order: Node[] = [];
  nodeGroups.forEach((ng, l) => { order.push(ng); if (edgeGroups[l]) order.push(edgeGroups[l]); });
  const g = new Group(order) as Network;
  g.layers = layers;
  g.edges = edges;
  g.pos = pos;
  return g;
}

export { palette };
