// Layer 3, figures: characters and compound diagrams built from components.
// They carry meaning on their own (an agent you can trust or not, a network
// a signal can flow through), so patterns can animate them directly.
import { type Vec, v } from "./geom.ts";
import { Figure, Group, type Node } from "./node.ts";
import { arc, box, circleStroke, dotStrokes, hatch, line, lineStroke, type Mark } from "./primitives.ts";
import { node } from "./components.ts";
import { cachedTone, loadTone, portrait, type PortraitOpts, type Portrait } from "./portrait.ts";
import { rng } from "./rng.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
 * Simple reflex agent: plain dot eyes, a straight mouth, lever arms and a
 * switch on its chest: it maps what it sees now to an action, by a rule.
 * Parts: antenna, head, eyes, mouth, body, arms, rule.
 */
export function reflexAgent(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 100);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
  const eyes = new Figure([...dotStrokes(P(-12, -66), 4 * k, { seed: seed + 1 }), ...dotStrokes(P(12, -66), 4 * k, { seed: seed + 2 })]);
  const mouth = line(P(-10, -50), P(10, -50), { seed: seed + 3, width: w, wobble: 0.15 });
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
  const g = withSilhouette(parts({ antenna, head, eyes, mouth, body, arms, rule }), k, 34, [-30, -24, 60, 74]);
  g.at(c.x, c.y);
  return g;
}

/**
 * Learning agent: looks up at the idea bulb on its antenna, a pencil in its
 * raised hand, and a rising learning curve on its chest.
 * Parts: antenna, head, eyes, mouth, body, curve, arms, pencil.
 */
export function learningAgent(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 100);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
  // pupils up and to the side: looking at the bulb
  const eyes = new Figure([...dotStrokes(P(-10, -70), 4.2 * k, { seed: seed + 1 }), ...dotStrokes(P(14, -70), 4.2 * k, { seed: seed + 2 })]);
  const mouth = arc(P(2, -60), 10 * k, Math.PI * 0.25, Math.PI * 0.75, { seed: seed + 4, width: w });
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
    pen([P(30, -14), P(50, -24), P(54, -40)], { seed: seed + 13, width: w }),
  ]);
  // a pencil held up, tip pointing to the sky
  const pencil = new Figure([
    lineStroke(P(51, -32), P(60, -62), { seed: seed + 14, width: w * 1.6 }),
    lineStroke(P(60, -62), P(62, -70), { seed: seed + 15, width: w * 0.6 }),
  ]);
  const g = withSilhouette(parts({ antenna, head, eyes, mouth, body, curve, arms, pencil }), k, 34, [-30, -24, 60, 74]);
  g.at(c.x, c.y);
  return g;
}

/**
 * AGI, general intelligence: one agent that can do any task. Grown up and
 * calm, its chest split into four skills (craft, art, writing, science).
 * Parts: antenna, head, eyes, mouth, body, shade, panes, skills, arms.
 */
export function agi(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 190);
  const t = w * 0.75;
  const head = new Figure([circleStroke(P(0, -62), 36 * k, { seed, width: w })]);
  const eyes = new Figure([...dotStrokes(P(-13, -65), 3.8 * k, { seed: seed + 1 }), ...dotStrokes(P(13, -65), 3.8 * k, { seed: seed + 2 })]);
  const mouth = arc(P(0, -60), 13 * k, Math.PI * 0.3, Math.PI * 0.7, { seed: seed + 5, width: w * 0.9 });
  const antenna = new Figure([lineStroke(P(0, -98), P(0, -114), { seed: seed + 6, width: w }), circleStroke(P(0, -120), 5.5 * k, { seed: seed + 7, width: w * 0.8 })]);
  const body = box(-34 * k, -24 * k, 68 * k, 80 * k, { seed: seed + 8, width: w });
  const shade = hatch((q) => q.x > 27 * k && q.x < 32 * k && q.y > -20 * k && q.y < 54 * k, { x: 26 * k, y: -22 * k, w: 8 * k, h: 78 * k }, { seed: seed + 9, spacing: 3.6 * Math.sqrt(k), width: 0.9 });
  // its chest is four panes, one skill in each: craft (gear), art (note),
  // writing (pencil), science (a plotted curve). One mind, every domain.
  const panes = new Figure([
    lineStroke(P(-26, 18), P(26, 18), { seed: seed + 20, width: t * 0.7 }),
    lineStroke(P(0, -16), P(0, 50), { seed: seed + 21, width: t * 0.7 }),
  ]);
  const gear = (cx: number, cy: number) => [
    circleStroke(P(cx, cy), 6 * k, { seed: seed + 30, width: t }),
    circleStroke(P(cx, cy), 2 * k, { seed: seed + 31, width: t * 0.8 }),
    ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return lineStroke(P(cx + 6 * Math.cos(a), cy + 6 * Math.sin(a)), P(cx + 9 * Math.cos(a), cy + 9 * Math.sin(a)), { seed: seed + 32 + i, width: t * 1.3 }); }),
  ];
  const note = (cx: number, cy: number) => [
    ...dotStrokes(P(cx - 3, cy + 6), 3.2 * k, { seed: seed + 50 }),
    lineStroke(P(cx, cy + 6), P(cx, cy - 9), { seed: seed + 51, width: t }),
    pen([P(cx, cy - 9), P(cx + 5, cy - 5), P(cx + 6, cy - 1)], { seed: seed + 52, width: t, wobble: 0.1 }),
  ];
  const pencil = (cx: number, cy: number) => [
    lineStroke(P(cx + 7, cy - 8), P(cx - 3, cy + 5), { seed: seed + 60, width: t * 1.8 }),
    lineStroke(P(cx - 3, cy + 5), P(cx - 6, cy + 9), { seed: seed + 61, width: t * 0.6 }),
    pen([P(cx - 10, cy + 11), P(cx - 4, cy + 12), P(cx + 2, cy + 10), P(cx + 8, cy + 12)], { seed: seed + 62, width: t * 0.6, wobble: 0.1 }),
  ];
  const plot = (cx: number, cy: number) => [
    lineStroke(P(cx - 9, cy - 9), P(cx - 9, cy + 9), { seed: seed + 70, width: t * 0.7 }),
    lineStroke(P(cx - 9, cy + 9), P(cx + 10, cy + 9), { seed: seed + 71, width: t * 0.7 }),
    pen(Array.from({ length: 12 }, (_, i) => { const u = i / 11; return P(cx - 7 + 16 * u, cy + 6 - 13 * Math.sin(u * Math.PI * 0.85)); }), { seed: seed + 72, width: t, wobble: 0.1 }),
  ];
  const skills = new Figure([...gear(-13, 1), ...note(13, 1), ...pencil(-13, 34), ...plot(13, 34)]);
  const arms = new Figure([
    pen([P(-34, -14), P(-50, 4), P(-56, 30)], { seed: seed + 10, width: w }),
    pen([P(34, -14), P(50, 4), P(56, 30)], { seed: seed + 11, width: w }),
  ]);
  const g = withSilhouette(parts({ antenna, head, eyes, mouth, body, shade, panes, skills, arms }), k, 36, [-34, -24, 68, 80]);
  g.at(c.x, c.y);
  return g;
}

/**
 * Superintelligence: the same character at a scale nothing was built for.
 * Default size is huge on purpose: place it so it spills out of a sandbox or
 * the screen. A crown of antennae, deep irises, a flat mouth, and a galaxy
 * turning on its chest. Parts: antennae, head, eyes, mouth, body, shade, galaxy, arms.
 */
export function superintelligence(c: Vec, o: Kin = {}) {
  const { k, w, P, seed } = kin(o, 520);
  const R = rng(seed);
  const head = new Figure([circleStroke(P(0, -62), 34 * k, { seed, width: w })]);
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
  // volume: hatching down the right side of the body
  const shade = hatch((q) => q.x > 18 * k && q.x < 28 * k && q.y > -22 * k && q.y < 48 * k, { x: 16 * k, y: -24 * k, w: 14 * k, h: 74 * k }, { seed: seed + 9, spacing: 3.2 * Math.sqrt(k), width: 1, tone: (q) => (q.x - 16 * k) / (12 * k) });
  // a spiral galaxy: two arms of ink around a bright core, and a few stars
  const galaxy = new Figure([
    ...[0, Math.PI].map((ph, j) => pen(Array.from({ length: 60 }, (_, i) => {
      const tt = i / 59, a = ph + tt * Math.PI * 2.4, r = 2 + tt * 15;
      return P(Math.cos(a) * r, 12 + Math.sin(a) * r * 0.62);
    }), { seed: seed + 400 + j, width: w * 0.5, wobble: 0.1, taper: [0.1, 0.5] })),
    circleStroke(P(0, 12), 2.2 * k, { seed: seed + 410, width: w * 0.5 }),
    ...Array.from({ length: 14 }, (_, i) => {
      const a = R() * Math.PI * 2, r = R.range(6, 22);
      return dotStrokes(P(Math.cos(a) * r, 12 + Math.sin(a) * r * 0.62), R.range(0.25, 0.5) * k, { seed: seed + 420 + i });
    }).flat(),
  ]);
  const arms = new Figure([
    pen([P(-30, -14), P(-58, 4), P(-62, 34)], { seed: seed + 7, width: w }),
    pen([P(30, -14), P(58, 4), P(62, 34)], { seed: seed + 8, width: w }),
  ]);
  const g = withSilhouette(parts({ antennae, head, eyes, mouth, body, shade, galaxy, arms }), k, 34, [-30, -24, 60, 74]);
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
// Photos live in the data folder (INK_DATA, synced with Google Drive), not in
// the repo: <data>/people/people.json lists who is there, with the source and
// licence of each photo, and <key>.mask.png (tools/mask.py) cuts out the
// background. Without INK_DATA the small sample in ./sample is used.

export type PersonEntry = {
  file: string; name: string; years: string; group?: string;
  author?: string; license?: string; licenseUrl?: string; page?: string;
  opts?: PortraitOpts;
};

/** The data folder: $INK_DATA, else the sample that ships with the library. */
export const dataDir = () => process.env.INK_DATA ?? new URL("../sample", import.meta.url).pathname;

/** Everyone in <data>/people/people.json. */
export function people(): Record<string, PersonEntry> {
  const f = join(dataDir(), "people", "people.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
}

const resolvePerson = (who: string) => {
  const e = people()[who];
  const path = e ? join(dataDir(), "people", e.file) : who;
  const m = path.replace(/\.[a-z]+$/i, ".mask.png");
  return { e, path, mask: existsSync(m) ? m : null };
};

/** Load the photos a later personSync() call will need (images decode asynchronously). */
export async function preloadPerson(who: string) {
  const r = resolvePerson(who);
  await loadTone(r.path);
  if (r.mask) await loadTone(r.mask);
}

const personOpts = (who: string, o: PortraitOpts): [string, PortraitOpts] => {
  const r = resolvePerson(who);
  const mask = r.mask ? cachedTone(r.mask) : undefined;
  // with a cut-out, the vignette only has to fade the shoulders out
  const vignette = mask ? { cy: 0.45, rx: 0.6, ry: 0.56, soft: 0.2 } : undefined;
  return [r.path, { ...(vignette ? { vignette } : {}), ...(r.e?.opts ?? {}), ...(mask ? { mask } : {}), ...o }];
};

/**
 * An engraved portrait of someone in people.json, or of any photo path:
 * `await person("turing")`. Parts: outline, shade (layer1..layer4). Centred on its origin.
 */
export async function person(who: string, o: PortraitOpts = {}): Promise<Portrait> {
  await preloadPerson(who);
  return personSync(who, o);
}

/** person() for code that cannot await; call preloadPerson(who) first. */
export function personSync(who: string, o: PortraitOpts = {}): Portrait {
  const [path, opts] = personOpts(who, o);
  return portrait(cachedTone(path), opts);
}

// ---------------------------------------------------------------- logos
// Company logos, redrawn in ink for editorial use (trademarks of their owners).
// Files and their sources: <data>/logos/logos.json.

export type LogoEntry = { file: string; name: string; page?: string; license?: string; note?: string; opts?: PortraitOpts };

export function logos(): Record<string, LogoEntry> {
  const f = join(dataDir(), "logos", "logos.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
}

/**
 * A logo engraved: its outline, then the solid parts hatched.
 * `await logo("anthropic", { height: 80 })`. Parts: outline, shade. Centred on its origin.
 */
export async function logo(which: string, o: PortraitOpts & { fit?: [number, number] } = {}): Promise<Portrait> {
  const e = logos()[which];
  const path = e ? join(dataDir(), "logos", e.file) : which;
  const t = await loadTone(path, { mode: "ink", maxSize: 1200 });
  // fit: largest size inside a [w, h] box, so wordmarks and symbols line up
  const height = o.fit ? Math.min(o.fit[1], (o.fit[0] * t.h) / t.w) : o.height;
  return portrait(t, {
    vignette: false, detail: 0, gamma: 1, levels: [0, 1], features: 0, outline: [0.5], outlineBlur: 0.8, minOutline: 6,
    flow: 0, angle: -Math.PI * 0.3, layers: [{ at: 0.5, angle: 0, spacing: 3.4 }], width: 1.1,
    ...(e?.opts ?? {}), ...o, ...(height ? { height } : {}),
  });
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
