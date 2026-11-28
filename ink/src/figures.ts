// Layer 3, figures: characters and compound diagrams built from components.
// They carry meaning on their own (an agent you can trust or not, a network
// a signal can flow through), so patterns can animate them directly.
import { type Vec, v } from "./geom.ts";
import { Figure, Group, type Node } from "./node.ts";
import { arc, box, circleStroke, dotStrokes, line, lineStroke, type Mark } from "./primitives.ts";
import { node } from "./components.ts";
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
