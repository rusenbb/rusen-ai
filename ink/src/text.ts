// Labels. Prose is set in the brand serif (Geist Serif); math in STIX Two
// italic, with x_1, w_{ij}, x^2 markup for sub/superscripts. Revealed left to
// right like a pen writing across the page.
import { GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { type Mat, matMul } from "./stroke.ts";
import { Node, type RenderCtx, type Tint, mixColor, tintOf } from "./node.ts";
import { palette } from "./style.ts";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
let loaded = false;
function fonts() {
  if (loaded) return;
  GlobalFonts.registerFromPath(here("../fonts/GeistSerifVF.ttf"), "Geist Serif");
  GlobalFonts.registerFromPath(here("../fonts/GeistMono-Regular.ttf"), "Geist Mono");
  GlobalFonts.registerFromPath(here("../fonts/STIXTwoText-Regular.ttf"), "STIX Two Text");
  GlobalFonts.registerFromPath(here("../fonts/STIXTwoText-Italic.ttf"), "STIX Two Text");
  loaded = true;
}

export type TextOpts = {
  size?: number;
  /** serif = prose, math = STIX italic with _ and ^ markup, mono = code/labels. */
  font?: "serif" | "math" | "mono";
  color?: string;
  align?: "left" | "center" | "right";
  alpha?: number;
};

type Run = { s: string; level: 0 | -1 | 1 };

function parse(src: string, math: boolean): Run[] {
  if (!math) return [{ s: src, level: 0 }];
  const runs: Run[] = [];
  let buf = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if ((c === "_" || c === "^") && i + 1 < src.length) {
      if (buf) runs.push({ s: buf, level: 0 });
      buf = "";
      let arg: string;
      if (src[i + 1] === "{") { const j = src.indexOf("}", i + 2); arg = src.slice(i + 2, j < 0 ? undefined : j); i = j < 0 ? src.length : j; }
      else { arg = src[i + 1]; i++; }
      runs.push({ s: arg, level: c === "_" ? -1 : 1 });
    } else buf += c;
  }
  if (buf) runs.push({ s: buf, level: 0 });
  return runs;
}

export class Text extends Node {
  text: string;
  o: Required<TextOpts>;
  runs: Run[];
  constructor(text: string, o: TextOpts = {}) {
    super();
    fonts();
    this.text = text;
    const def: Required<TextOpts> = { size: 34, font: "serif", color: palette.ink, align: "center", alpha: 0.92 };
    const given = Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined));
    this.o = { ...def, ...given };
    this.runs = parse(text, this.o.font === "math");
  }
  inkLength() { return this.text.length * this.o.size * 0.9; }
  strokeCount() { return this.text.replace(/\s/g, "").length; }
  private fontFor(level: number) {
    const size = level === 0 ? this.o.size : this.o.size * 0.62;
    if (this.o.font === "mono") return `${size}px "Geist Mono"`;
    if (this.o.font === "math") return `italic ${size}px "STIX Two Text", FreeSerif`;
    return `${size}px "Geist Serif", "STIX Two Text", FreeSerif`;
  }

  render(rc: RenderCtx, parent: Mat, share: number, opacity: number, color: Tint) {
    const st = this.state;
    const d = st.drawn * share;
    const op = opacity * st.opacity;
    if (d <= 0 || op <= 0) return;
    const m = matMul(parent, this.localMatrix());
    const ctx = rc.ctx;
    ctx.save();
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const widths = this.runs.map((r) => { ctx.font = this.fontFor(r.level); return ctx.measureText(r.s).width + (r.level ? this.o.size * 0.04 : 0); });
    const w = widths.reduce((a, b) => a + b, 0);
    const x0 = this.o.align === "center" ? -w / 2 : this.o.align === "right" ? -w : 0;
    const base = this.o.size * 0.33; // visually centre the x-height on y=0
    if (d < 1) {
      ctx.beginPath();
      ctx.rect(x0 - 4, -this.o.size * 1.2, (w + 8) * d, this.o.size * 2.4);
      ctx.clip();
    }
    ctx.globalAlpha = this.o.alpha * op;
    ctx.fillStyle = mixColor(this.o.color, tintOf(st, color));
    let x = x0;
    this.runs.forEach((r, i) => {
      ctx.font = this.fontFor(r.level);
      const dy = r.level === -1 ? this.o.size * 0.22 : r.level === 1 ? -this.o.size * 0.42 : 0;
      ctx.fillText(r.s, x + (r.level ? this.o.size * 0.02 : 0), base + dy);
      x += widths[i];
    });
    ctx.restore();
  }
}

export const text = (s: string, o: TextOpts = {}) => new Text(s, o);
/** Math label: tex("w_1 x_1"), tex("x^2"). */
export const tex = (s: string, o: TextOpts = {}) => new Text(s, { font: "math", ...o });
