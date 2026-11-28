// A Manim-style scene: build it with add/play/wait, then render any moment
// (snap), the whole thing (render to mp4/mov/webm), or step back (undo/redo).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { type Anim } from "./anim.ts";
import { Camera } from "./camera.ts";
import { type Node, type RenderCtx } from "./node.ts";
import { inkTooth, paper } from "./paper.ts";
import { palette } from "./style.ts";

type Step =
  | { kind: "play"; anims: Anim[]; duration?: number }
  | { kind: "wait"; duration: number }
  | { kind: "add"; nodes: Node[] }
  | { kind: "remove"; nodes: Node[] };

type Scheduled = { anim: Anim; start: number; duration: number };

export type SceneOpts = { width?: number; height?: number; fps?: number; paper?: string | null; seed?: number };

export class Scene {
  width: number;
  height: number;
  fps: number;
  paperColor: string | null;
  seed: number;
  camera: Camera;
  steps: Step[] = [];
  redoStack: Step[] = [];

  constructor(o: SceneOpts = {}) {
    this.width = o.width ?? 1920;
    this.height = o.height ?? 1080;
    this.fps = o.fps ?? 60;
    this.paperColor = o.paper === undefined ? palette.paper : o.paper;
    this.seed = o.seed ?? 3;
    this.camera = new Camera(this.width, this.height);
  }

  // ---- building -------------------------------------------------------
  private push(s: Step) { this.steps.push(s); this.redoStack = []; return this; }
  add(...nodes: Node[]) { return this.push({ kind: "add", nodes }); }
  remove(...nodes: Node[]) { return this.push({ kind: "remove", nodes }); }
  wait(duration = 1) { return this.push({ kind: "wait", duration }); }
  /** play(a, b, ...) runs animations together. Last arg may be { duration }. */
  play(...args: (Anim | { duration?: number })[]) {
    let duration: number | undefined;
    const anims: Anim[] = [];
    for (const a of args) {
      if ("apply" in a) anims.push(a as Anim);
      else duration = a.duration;
    }
    return this.push({ kind: "play", anims, duration });
  }
  /** One after another inside a single step (so one undo removes all). */
  sequence(...anims: Anim[]) {
    for (const a of anims) this.steps.push({ kind: "play", anims: [a] });
    this.redoStack = [];
    return this;
  }
  undo(n = 1) { for (let i = 0; i < n && this.steps.length; i++) this.redoStack.push(this.steps.pop()!); return this; }
  redo(n = 1) { for (let i = 0; i < n && this.redoStack.length; i++) this.steps.push(this.redoStack.pop()!); return this; }

  // ---- timeline -------------------------------------------------------
  private compile() {
    const sched: Scheduled[] = [];
    const appear = new Map<Node, number>();
    const vanish = new Map<Node, number>();
    let t = 0;
    for (const s of this.steps) {
      if (s.kind === "wait") t += s.duration;
      else if (s.kind === "add") for (const n of s.nodes) { appear.set(n, t); vanish.delete(n); }
      else if (s.kind === "remove") for (const n of s.nodes) vanish.set(n, t);
      else {
        let len = 0;
        for (const a of s.anims) {
          const d = s.duration ?? a.duration;
          sched.push({ anim: a, start: t, duration: d });
          len = Math.max(len, d);
          for (const n of a.targets) {
            if (a.introduces && (!appear.has(n) || vanish.has(n))) { appear.set(n, t); vanish.delete(n); }
            if (a.removes) vanish.set(n, t + d);
          }
        }
        t += len;
      }
    }
    // A group that was never introduced itself (e.g. made later just to erase
    // several things at once) exists from when its first descendant appears.
    const firstAppear = (n: Node): number | undefined => {
      const own = appear.get(n);
      if (own !== undefined) return own;
      let m: number | undefined;
      for (const c of n.children()) { const a = firstAppear(c); if (a !== undefined) m = m === undefined ? a : Math.min(m, a); }
      return m;
    };
    for (const s of sched) for (const n of s.anim.targets) {
      if (!appear.has(n)) { const a = firstAppear(n); if (a !== undefined) appear.set(n, a); }
    }
    return { sched, appear, vanish, total: t };
  }

  get duration() { return this.compile().total; }

  private stateAt(time: number) {
    const { sched, appear, vanish } = this.compile();
    const roots = new Set<Node>();
    for (const n of appear.keys()) { let r: Node = n; while (r.parent) r = r.parent; roots.add(r); }
    for (const r of roots) r.reset();
    this.camera.reset();
    for (const s of sched) {
      if (s.start > time) continue;
      const p = s.duration > 0 ? Math.min(1, (time - s.start) / s.duration) : 1;
      s.anim.apply(s.anim.ease(p));
    }
    // Appearance is inherited from the nearest ancestor that has one;
    // removal of any ancestor removes the whole subtree.
    const visible = (n: Node) => {
      let a: number | undefined;
      for (let c: Node | null = n; c && a === undefined; c = c.parent) a = appear.get(c);
      if (a === undefined || a > time) return false;
      for (let c: Node | null = n; c; c = c.parent) { const v = vanish.get(c); if (v !== undefined && v <= time) return false; }
      return true;
    };
    return { roots: [...roots], visible };
  }

  // ---- rendering ------------------------------------------------------
  private canvases = new Map<number, { out: Canvas; ink: Canvas }>();

  /** Render the frame at `time` (default: the end) at output width W. */
  frame(time = this.duration, W = this.width, transparent = false): Canvas {
    const H = Math.round((W * this.height) / this.width);
    let c = this.canvases.get(W);
    if (!c) { c = { out: createCanvas(W, H), ink: createCanvas(W, H) }; this.canvases.set(W, c); }
    const { roots, visible } = this.stateAt(time);
    const ictx = c.ink.getContext("2d");
    ictx.setTransform(1, 0, 0, 1, 0, 0);
    ictx.globalCompositeOperation = "source-over";
    ictx.clearRect(0, 0, W, H);
    const rc: RenderCtx = { ctx: ictx, lift: 10, visible };
    const cam = this.camera.matrix(W);
    const walk = (n: Node) => {
      // A node may be shown on its own even if its parent is not yet visible.
      if (visible(n) && (!n.parent || !visible(n.parent))) {
        const pm = n.parent ? n.parent.world() : [1, 0, 0, 1, 0, 0];
        const m = matMulCam(cam, pm as any);
        n.render(rc, m, 1, 1, null);
        return;
      }
      for (const ch of n.children()) walk(ch);
    };
    (rc as any).scene = this;
    for (const r of roots) walk(r);
    // ink tooth: speckles where the nib skipped
    ictx.globalAlpha = 0.55;
    ictx.globalCompositeOperation = "destination-out";
    ictx.drawImage(inkTooth(W, H, this.seed + 2), 0, 0);
    ictx.globalCompositeOperation = "source-over";
    ictx.globalAlpha = 1;
    if (transparent || !this.paperColor) return c.ink;
    const octx = c.out.getContext("2d");
    octx.globalCompositeOperation = "source-over";
    octx.drawImage(paper(W, H, this.seed, this.paperColor), 0, 0);
    octx.globalCompositeOperation = "multiply";
    octx.drawImage(c.ink, 0, 0);
    octx.globalCompositeOperation = "source-over";
    return c.out;
  }

  /** Screenshot of the scene at `time` (default: end of what's built so far). */
  snap(path: string, o: { time?: number; width?: number; transparent?: boolean } = {}) {
    mkdirSync(dirname(path), { recursive: true });
    const cv = this.frame(o.time ?? this.duration, o.width ?? this.width, o.transparent);
    writeFileSync(path, cv.toBuffer("image/png"));
    return path;
  }

  /** Contact sheet of n moments, for checking the motion at a glance. */
  storyboard(path: string, n = 6, width = 640) {
    const H = Math.round((width * this.height) / this.width);
    const cols = 3, rows = Math.ceil(n / cols);
    const sheet = createCanvas(cols * width, rows * H);
    const ctx = sheet.getContext("2d");
    const T = this.duration;
    for (let i = 0; i < n; i++) {
      const cv = this.frame((T * (i + 1)) / n, width);
      ctx.drawImage(cv, (i % cols) * width, Math.floor(i / cols) * H);
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, sheet.toBuffer("image/png"));
    return path;
  }

  /**
   * Render to video. .mp4 = paper background (H.264). .mov = transparent ink
   * (ProRes 4444) for compositing in an editor. .webm = transparent VP9.
   */
  async render(path: string, o: { width?: number; fps?: number; from?: number; to?: number; tail?: number } = {}) {
    mkdirSync(dirname(path), { recursive: true });
    const W = o.width ?? this.width;
    const H = Math.round((W * this.height) / this.width);
    const fps = o.fps ?? this.fps;
    const from = o.from ?? 0;
    const to = (o.to ?? this.duration) + (o.tail ?? 0);
    const transparent = /\.(mov|webm)$/.test(path);
    const codec = path.endsWith(".mov")
      ? ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le"]
      : path.endsWith(".webm")
        ? ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24"]
        : ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium", "-movflags", "+faststart"];
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(fps), "-i", "-", ...codec, path], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise<void>((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));
    const frames = Math.ceil((to - from) * fps);
    for (let i = 0; i <= frames; i++) {
      const cv = this.frame(Math.min(to, from + i / fps), W, transparent);
      // copy out of the canvas (it is reused next frame) without going through ImageData
      const px = Buffer.from((cv as unknown as { data(): Buffer }).data());
      if (!ff.stdin.write(px)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 120 === 0 && process.env.INK_DEBUG) console.error(`frame ${i}/${frames} rss ${(process.memoryUsage().rss / 1e6) | 0}MB`);
    }
    ff.stdin.end();
    await done;
    return path;
  }

  /** Every stroke's start/end time, for syncing with narration. */
  timeline() {
    const { sched, total } = this.compile();
    return {
      duration: total,
      events: sched.map((s) => ({ kind: s.anim.kind, targets: s.anim.targets.map((t) => t.name || `#${t.id}`), start: +s.start.toFixed(3), end: +(s.start + s.duration).toFixed(3) })),
    };
  }
}

function matMulCam(m: number[], n: number[]) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ] as [number, number, number, number, number, number];
}
