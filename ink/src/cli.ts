// ink: build a drawing one step at a time.
//   ink new  s.json [--width 1920 --height 1080 --fps 60]
//   ink do   s.json '{"op":"draw","id":"n","make":"neuron","at":[960,500]}'
//   ink undo s.json [n]      ink redo s.json [n]      ink ls s.json
//   ink snap s.json out.png [--at 3.5] [--width 960] [--transparent]
//   ink board s.json out.png [frames]
//   ink render s.json out.mp4|out.mov|out.webm [--width 1280 --fps 30]
//   ink timeline s.json
import { existsSync } from "node:fs";
import { build, load, save, type Op } from "./session.ts";

const [cmd, file, ...rest] = process.argv.slice(2);
const flag = (k: string) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : undefined; };
const num = (k: string) => (flag(k) !== undefined ? Number(flag(k)) : undefined);

function usage(): never {
  console.error(readUsage());
  process.exit(1);
}
function readUsage() {
  return "usage: ink new|do|undo|redo|ls|snap|board|render|timeline <scene.json> ...";
}

if (!cmd || !file) usage();

switch (cmd) {
  case "new": {
    if (existsSync(file) && !rest.includes("--force")) { console.error(`${file} exists (use --force)`); process.exit(1); }
    save(file, { width: num("width") ?? 1920, height: num("height") ?? 1080, fps: num("fps") ?? 60, ops: [], redo: [] });
    console.log(`new scene ${file}`);
    break;
  }
  case "do": {
    const f = load(file);
    const ops: Op[] = rest.filter((r) => r.trim().startsWith("{") || r.trim().startsWith("[")).flatMap((r) => { const j = JSON.parse(r); return Array.isArray(j) ? j : [j]; });
    f.ops.push(...ops);
    f.redo = [];
    // validate by building; roll back on error
    try { const { scene } = build(f); save(file, f); console.log(`ok: ${f.ops.length} ops, ${scene.duration.toFixed(2)}s`); }
    catch (e) { console.error(`rejected: ${(e as Error).message}`); process.exit(1); }
    break;
  }
  case "undo":
  case "redo": {
    const f = load(file);
    const n = Number(rest[0] ?? 1);
    for (let i = 0; i < n; i++) {
      if (cmd === "undo" && f.ops.length) f.redo.push(f.ops.pop()!);
      if (cmd === "redo" && f.redo.length) f.ops.push(f.redo.pop()!);
    }
    save(file, f);
    console.log(`${cmd}: ${f.ops.length} ops (${f.redo.length} to redo)`);
    break;
  }
  case "ls": {
    const f = load(file);
    f.ops.forEach((o, i) => console.log(`${i}\t${JSON.stringify(o)}`));
    if (f.redo.length) console.log(`(${f.redo.length} undone, redo-able)`);
    break;
  }
  case "snap": {
    const { scene } = build(load(file));
    console.log(scene.snap(rest[0] ?? "out/snap.png", { time: num("at"), width: num("width"), transparent: rest.includes("--transparent") }));
    break;
  }
  case "board": {
    const { scene } = build(load(file));
    console.log(scene.storyboard(rest[0] ?? "out/board.png", Number(rest[1] ?? 6)));
    break;
  }
  case "render": {
    const { scene } = build(load(file));
    console.log(await scene.render(rest[0] ?? "out/scene.mp4", { width: num("width"), fps: num("fps"), tail: num("tail") }));
    break;
  }
  case "timeline": {
    const { scene } = build(load(file));
    console.log(JSON.stringify(scene.timeline(), null, 1));
    break;
  }
  default: usage();
}
