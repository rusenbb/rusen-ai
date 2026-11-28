// A scene as a JSON list of ops, so it can be built one step at a time from
// the command line: add a piece, look at a snapshot, undo, try again.
import { readFileSync, writeFileSync } from "node:fs";
import * as A from "./anim.ts";
import { v } from "./geom.ts";
import { Group, type Node } from "./node.ts";
import { neuron } from "./neuron.ts";
import { Scene } from "./scene.ts";
import { arrow, box, circle, curve, dot, line } from "./primitives.ts";
import { node } from "./components.ts";
import { palette } from "./style.ts";
import { tex, text } from "./text.ts";
import { axes3d, path3d, points3d, surface, type V3, type Figure3D } from "./three.ts";

export type Op = Record<string, any> & { op: string };
export type SessionFile = { width: number; height: number; fps: number; ops: Op[]; redo: Op[] };

const color = (c?: string) => (c && c in palette ? (palette as Record<string, string>)[c] : c);
const P = (p: number[]) => v(p[0], p[1]);

/** Things the session can make. args mirror the TS builders. */
export const makers: Record<string, (a: any, reg: Map<string, Node>) => Node> = {
  neuron: (a) => neuron({ ...a, color: color(a.color) }),
  node: (a) => node(v(0, 0), a.r ?? 46, a.label ?? "", { ...a, color: color(a.color), textOpts: { font: a.math === false ? "serif" : "math", ...(a.textOpts ?? {}) } }),
  circle: (a) => circle(v(0, 0), a.r ?? 40, { ...a, color: color(a.color) }),
  dot: (a) => dot(v(0, 0), a.r ?? 3, { ...a, color: color(a.color) }),
  line: (a) => line(P(a.from), P(a.to), { ...a, color: color(a.color) }),
  arrow: (a) => arrow(P(a.from), P(a.to), { ...a, color: color(a.color) }),
  curve: (a) => curve(a.points.map(P), { ...a, color: color(a.color) }),
  box: (a) => box(0, 0, a.w, a.h, { ...a, color: color(a.color) }),
  text: (a) => text(a.text, { ...a, color: color(a.color) }),
  tex: (a) => tex(a.text, { ...a, color: color(a.color) }),
  surface: (a) => surface(new Function("x", "z", `return (${a.f});`) as (x: number, z: number) => number, { ...a, color: color(a.color) }, a.unit ?? 120),
  axes3d: (a) => axes3d(a.size ?? 3, a.unit ?? 120, { ...a, color: color(a.color) }),
  points3d: (a) => points3d(a.points as V3[], { ...a, color: color(a.color), colors: a.colors?.map(color) }, a.unit ?? 120),
  path3d: (a, reg) => {
    const f = path3d(a.points as V3[], { ...a, color: color(a.color) }, a.unit ?? 120);
    if (a.behind) f.behind(reg.get(a.behind) as Figure3D);
    return f;
  },
};

function resolve(reg: Map<string, Node>, id: string): Node {
  const [head, ...rest] = id.split(".");
  let n: Node | undefined = reg.get(head);
  if (!n) throw new Error(`no object "${head}" (have: ${[...reg.keys()].join(", ") || "none"})`);
  for (const part of rest) {
    const kids: Node[] = n.children();
    const k: Node | undefined = kids.find((c) => c.name === part) ?? kids[Number(part)];
    if (!k) throw new Error(`"${id}": no part "${part}" (parts: ${kids.map((c: Node) => c.name).filter(Boolean).join(", ")})`);
    n = k;
  }
  return n!;
}

/** Turn one op into scene calls. Ops that create objects register them. */
function anims(op: Op, s: Scene, reg: Map<string, Node>): A.Anim[] | "step" {
  const d = op.duration !== undefined ? { duration: op.duration } : {};
  const make = () => {
    if (reg.has(op.id)) return reg.get(op.id)!;
    const f = makers[op.make];
    if (!f) throw new Error(`unknown maker "${op.make}" (have: ${Object.keys(makers).join(", ")})`);
    const n = f(op.args ?? {}, reg).named(op.id);
    if (op.at) n.at(op.at[0], op.at[1]);
    if (op.scale) n.scaled(op.scale);
    if (op.rotation) n.rotated(op.rotation);
    if (op.lag !== undefined && n instanceof Group) n.withLag(op.lag);
    reg.set(op.id, n);
    return n;
  };
  switch (op.op) {
    case "draw": return [A.draw(make(), { ...d, speed: op.speed })];
    case "fadeIn": return [A.fadeIn(make(), d)];
    case "add": s.add(make()); return "step";
    case "wait": s.wait(op.t ?? op.duration ?? 1); return "step";
    case "remove": s.remove(resolve(reg, op.id)); return "step";
    case "undraw": return [A.undraw(resolve(reg, op.id), d)];
    case "fadeOut": return [A.fadeOut(resolve(reg, op.id), d)];
    case "move": return [A.moveTo(resolve(reg, op.id), op.to[0], op.to[1], d)];
    case "shift": return [A.shift(resolve(reg, op.id), op.by[0], op.by[1], d)];
    case "scale": return [A.scaleTo(resolve(reg, op.id), op.to, d)];
    case "rotate": return [A.rotateTo(resolve(reg, op.id), op.to, d)];
    case "opacity": return [A.opacityTo(resolve(reg, op.id), op.to, d)];
    case "recolor": return [A.recolor(resolve(reg, op.id), color(op.color) ?? null, d)];
    case "indicate": return [A.indicate(resolve(reg, op.id), { ...d, color: color(op.color), amount: op.amount })];
    case "camera": { const { op: _o, duration: _d, ...to } = op; return [A.cameraTo(s.camera, to, d)]; }
    case "together": {
      const all: A.Anim[] = [];
      for (const o of op.ops as Op[]) { const r = anims(o, s, reg); if (r !== "step") all.push(...r); }
      return all;
    }
    default: throw new Error(`unknown op "${op.op}"`);
  }
}

export function build(file: SessionFile): { scene: Scene; reg: Map<string, Node> } {
  const s = new Scene({ width: file.width, height: file.height, fps: file.fps });
  const reg = new Map<string, Node>();
  for (const op of file.ops) {
    const r = anims(op, s, reg);
    if (r !== "step") s.play(...r, ...(op.duration !== undefined && op.op === "together" ? [{ duration: op.duration }] : []));
  }
  return { scene: s, reg };
}

export const load = (p: string): SessionFile => JSON.parse(readFileSync(p, "utf8"));
export const save = (p: string, f: SessionFile) => writeFileSync(p, JSON.stringify(f, null, 1) + "\n");
