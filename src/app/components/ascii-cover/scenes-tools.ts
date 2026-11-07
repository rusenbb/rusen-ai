/**
 * Cover scenes for /demos and /bulletin. Same contract as `scenes.ts`: each
 * one is a miniature of what the project does, keyed by project id.
 */

import { TAU, TrailBuffer, type CellOut, type Grid, type SceneFactory } from "./scene-kit";

/** A screen of text lines; scenes write lines, `sample` reads characters. */
class TextScreen {
  lines: { text: string; hue: number; v: number; spans?: { from: number; to: number; hue: number; v: number }[] }[] = [];
  /** `spacing` 2 leaves an empty row between lines, like a terminal. */
  constructor(readonly g: Grid, readonly left = 2, readonly spacing = 1) {}
  sample(c: number, r: number, out: CellOut) {
    out.ch = null;
    out.v = 0;
    out.hue = 0;
    if (r % this.spacing) return;
    const line = this.lines[r / this.spacing];
    if (!line) return;
    const x = c - this.left;
    // Clip to the cover with an ellipsis instead of running off the edge.
    const room = this.g.cols - this.left - 1;
    if (x < 0 || x >= room) return;
    const clipped = line.text.length > room && x === room - 1;
    const ch = clipped ? "…" : line.text[x];
    if (!ch || ch === " ") return;
    out.ch = ch;
    out.v = line.v;
    out.hue = line.hue;
    for (const span of line.spans ?? []) {
      if (x >= span.from && x < span.to) {
        out.v = span.v;
        out.hue = span.hue;
      }
    }
  }
}

/** A character canvas redrawn every frame, for scenes that draw with
 *  box-drawing glyphs and symbols rather than a density ramp. */
class CharCanvas {
  ch: (string | null)[];
  v: Float32Array;
  hue: Float32Array;
  constructor(readonly g: Grid) {
    this.ch = new Array(g.cols * g.rows).fill(null);
    this.v = new Float32Array(g.cols * g.rows);
    this.hue = new Float32Array(g.cols * g.rows);
  }
  clear() {
    this.ch.fill(null);
    this.v.fill(0);
  }
  put(c: number, r: number, ch: string, v: number, hue: number) {
    c = Math.round(c);
    r = Math.round(r);
    if (c < 0 || r < 0 || c >= this.g.cols || r >= this.g.rows) return;
    const i = r * this.g.cols + c;
    this.ch[i] = ch;
    this.v[i] = v;
    this.hue[i] = hue;
  }
  box(c0: number, r0: number, c1: number, r1: number, v: number, hue: number) {
    c0 = Math.round(c0);
    r0 = Math.round(r0);
    c1 = Math.round(c1);
    r1 = Math.round(r1);
    for (let c = c0 + 1; c < c1; c++) {
      this.put(c, r0, "─", v, hue);
      this.put(c, r1, "─", v, hue);
    }
    for (let r = r0 + 1; r < r1; r++) {
      this.put(c0, r, "│", v, hue);
      this.put(c1, r, "│", v, hue);
    }
    this.put(c0, r0, "┌", v, hue);
    this.put(c1, r0, "┐", v, hue);
    this.put(c0, r1, "└", v, hue);
    this.put(c1, r1, "┘", v, hue);
  }
  sample(c: number, r: number, out: CellOut) {
    const i = r * this.g.cols + c;
    out.ch = this.ch[i];
    out.v = out.ch && out.ch !== " " ? this.v[i] : 0;
    out.hue = this.hue[i];
  }
}

const bar = (frac: number, width: number) => {
  const full = Math.round(Math.max(0, Math.min(1, frac)) * width);
  return "█".repeat(full) + "░".repeat(width - full);
};

// ---------------------------------------------------------------- demos

/** Frames stacked in depth like a flip-book; tracked objects move through
 *  every slice and a tube joins their positions across time. The motion
 *  changes every few seconds: an orbit, a bounce, and two crossing paths. */
const videoVolume: SceneFactory = (g) => {
  const cv = new CharCanvas(g);
  const slices = 6;
  type Path = (phase: number) => [number, number];
  const motions: { hue: number; path: Path }[][] = [
    [{ hue: 15, path: (p) => [Math.sin(p), Math.cos(p * 1.3)] }],
    [{ hue: 45, path: (p) => [Math.sin(p * 0.7), 1 - 2 * Math.abs(Math.sin(p * 1.6))] }],
    [
      { hue: 15, path: (p) => [Math.sin(p * 0.9), -0.5] },
      { hue: 195, path: (p) => [-Math.sin(p * 0.9), 0.5] },
    ],
  ];
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const { index } = cycle(t, motions.length, 6);
      cv.clear();
      const w = Math.floor(g.cols * 0.4);
      const h = Math.max(4, Math.floor(g.rows * 0.5));
      const stepC = (g.cols - w - 4) / (slices - 1);
      const stepR = (g.rows - h - 2) / (slices - 1);
      const objects = motions[index].map(() => [] as [number, number, number][]);
      // Back slice first (top right), front slice last (bottom left).
      for (let k = slices - 1; k >= 0; k--) {
        const c0 = 2 + k * stepC;
        const r0 = 1 + (slices - 1 - k) * stepR;
        const depth = 1 - k / slices;
        cv.box(c0, r0, c0 + w, r0 + h, 0.2 + 0.4 * depth, 210);
        motions[index].forEach((m, j) => {
          const [ux, uy] = m.path(t * 0.8 - k * 0.45);
          objects[j].push([c0 + w / 2 + ux * (w / 2 - 3), r0 + h / 2 + uy * (h / 2 - 1.5), depth]);
        });
      }
      objects.forEach((centers, j) => {
        const hue = motions[index][j].hue;
        for (let i = 1; i < centers.length; i++) {
          const [ax, ay] = centers[i - 1];
          const [bx, by] = centers[i];
          const n = Math.ceil(Math.hypot(bx - ax, by - ay));
          for (let s2 = 1; s2 < n; s2++) cv.put(ax + ((bx - ax) * s2) / n, ay + ((by - ay) * s2) / n, "·", 0.6, hue);
        }
        // Objects last so no frame line covers them; the front one is ringed.
        centers.forEach(([x, y, depth], i) => {
          const front = i === centers.length - 1;
          cv.put(x, y, "●", front ? 1 : 0.4 + 0.5 * depth, hue);
          if (front) {
            cv.put(x - 1, y, "(", 0.85, hue);
            cv.put(x + 1, y, ")", 0.85, hue);
          }
        });
      });
    },
    sample: (c, r, out) => cv.sample(c, r, out),
  };
};

/** A 5 Hz wave sampled at four rates in turn. Above twice the signal
 *  frequency the reconstruction matches; below it, the samples trace a
 *  slower alias. The alias is computed, not drawn by hand. */
const samplingLab: SceneFactory = (g) => {
  const cv = new CharCanvas(g);
  const label = new TextScreen(g, 1);
  const SIGNAL_HZ = 5;
  const rates = [24, 12, 7, 4];
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const { index } = cycle(t, rates.length, 4.5);
      const fs = rates[index];
      const ok = fs > 2 * SIGNAL_HZ;
      // Signed alias: sin(2π f n/fs) equals sin(2π fa n/fs) at every sample.
      const fa = SIGNAL_HZ - Math.round(SIGNAL_HZ / fs) * fs;
      const top = 2;
      const mid = top + (g.rows - top) / 2;
      const amp = (g.rows - top) / 2 - 1;
      const phase = t * 1.2;
      const at = (f: number, x: number) => mid - Math.sin(2 * Math.PI * f * (x / g.cols) + phase) * amp;

      cv.clear();
      for (let x = 0; x < g.cols; x++) cv.put(x, at(SIGNAL_HZ, x), "·", 0.4, 210);
      // The wave the samples imply: the signal itself when fs is high
      // enough, a slower alias when it is not.
      for (let x = 0; x < g.cols; x++) {
        const y0 = at(fa, x);
        const y1 = at(fa, x + 1);
        const glyph = y1 < y0 - 0.35 ? "╱" : y1 > y0 + 0.35 ? "╲" : "─";
        cv.put(x, y0, glyph, ok ? 0.55 : 0.85, ok ? 140 : 330);
      }
      const spacing = g.cols / fs;
      for (let x = spacing / 2; x < g.cols; x += spacing) {
        const y = at(SIGNAL_HZ, x);
        const from = Math.min(y, mid);
        const to = Math.max(y, mid);
        // Stems only when samples are sparse enough to read as separate.
        if (spacing >= 4) for (let r = Math.ceil(from); r <= Math.floor(to); r++) cv.put(x, r, "│", 0.35, 45);
        cv.put(x, y, "●", 1, 45);
      }
      const verdict = ok ? "OK" : `ALIASED → ${Math.abs(fa)} Hz`;
      const head = `signal 5 Hz · fs ${fs} Hz · `;
      label.lines = [{ text: head + verdict, hue: 210, v: 0.6, spans: [{ from: head.length, to: head.length + verdict.length, hue: ok ? 140 : 330, v: 0.95 }] }];
    },
    sample(c, r, out) {
      if (r === 0) {
        label.sample(c, r, out);
        return;
      }
      cv.sample(c, r, out);
    },
  };
};

/** Two classes of points; each region is tinted by its 3 nearest
 *  neighbours and the line where the vote flips is drawn explicitly. */
const decisionBoundary: SceneFactory = (g, rand) => {
  const h = g.rows * g.aspect;
  const pts = Array.from({ length: 14 }, (_, i) => ({
    x: rand() * g.cols,
    y: rand() * h,
    vx: (rand() - 0.5) * 2.4,
    vy: (rand() - 0.5) * 2.4,
    cls: i % 2,
  }));
  const vote = new Int8Array(g.cols * g.rows);
  const near: [number, number][] = pts.map(() => [0, 0]);
  const hueOf = [200, 22];
  return {
    step(dt) {
      for (const p of pts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 1 || p.x > g.cols - 2) p.vx *= -1;
        if (p.y < 1 || p.y > h - 2) p.vy *= -1;
      }
      for (let r = 0; r < g.rows; r++) {
        const y = r * g.aspect;
        for (let c = 0; c < g.cols; c++) {
          pts.forEach((p, k) => {
            near[k][0] = (p.x - c) ** 2 + (p.y - y) ** 2;
            near[k][1] = p.cls;
          });
          near.sort((a, b) => a[0] - b[0]);
          vote[r * g.cols + c] = near[0][1] + near[1][1] + near[2][1] >= 2 ? 1 : 0;
        }
      }
    },
    sample(c, r, out) {
      const i = r * g.cols + c;
      const p = pts.find((q) => Math.round(q.x) === c && Math.round(q.y / g.aspect) === r);
      if (p) {
        out.ch = "●";
        out.v = 1;
        out.hue = hueOf[p.cls];
        return;
      }
      const me = vote[i];
      const right = c + 1 < g.cols && vote[i + 1] !== me;
      const down = r + 1 < g.rows && vote[i + g.cols] !== me;
      if (right || down) {
        out.ch = right && down ? "┼" : right ? "│" : "─";
        out.v = 0.8;
        out.hue = 50;
        return;
      }
      out.ch = (c + r) % 2 ? "·" : null;
      out.v = out.ch ? 0.3 : 0;
      out.hue = hueOf[me];
    },
  };
};

/** Free-form labels with probability bars that settle on an answer. */
const classifyAnything: SceneFactory = (g) => {
  const screen = new TextScreen(g);
  const texts = [
    { text: '"the battery died after an hour"', labels: ["complaint", "praise", "question"], win: 0 },
    { text: '"can I return it after 30 days?"', labels: ["complaint", "praise", "question"], win: 2 },
    { text: '"best purchase I made this year"', labels: ["complaint", "praise", "question"], win: 1 },
  ];
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const idx = Math.floor(t / 4) % texts.length;
      const item = texts[idx];
      const p = Math.min(1, (t % 4) / 1.6);
      const width = Math.max(6, g.cols - 22);
      screen.lines = [{ text: "", hue: 0, v: 0 }, { text: item.text, hue: 210, v: 0.75 }, { text: "", hue: 0, v: 0 }];
      item.labels.forEach((label, k) => {
        const target = k === item.win ? 0.78 : 0.11;
        const prob = 0.33 + (target - 0.33) * p;
        const text = `${label.padEnd(10)}${bar(prob, width)} ${prob.toFixed(2)}`;
        const hue = [0, 140, 45][k];
        screen.lines.push({ text, hue, v: k === item.win && p >= 1 ? 1 : 0.55, spans: [{ from: 0, to: 10, hue: 210, v: 0.6 }] });
        screen.lines.push({ text: "", hue: 0, v: 0 });
      });
    },
    sample: (c, r, out) => screen.sample(c, r, out),
  };
};

/** A blob-shaped object; a mask floods out from a click until it fills it. */
const segmentAnything: SceneFactory = (g, rand) => {
  const h = g.rows * g.aspect;
  let cx = 0;
  let cy = 0;
  let lobes: number[] = [];
  let click = { x: 0, y: 0 };
  let t = 0;
  const reset = () => {
    cx = g.cols * (0.3 + rand() * 0.4);
    cy = h * (0.4 + rand() * 0.2);
    lobes = [rand() * TAU, 0.15 + rand() * 0.2, rand() * TAU, 0.1 + rand() * 0.15];
    click = { x: cx + (rand() - 0.5) * 4, y: cy + (rand() - 0.5) * 3 };
    t = 0;
  };
  reset();
  const radius = (a: number) =>
    Math.min(g.cols * 0.28, h * 0.42) * (1 + lobes[1] * Math.sin(3 * a + lobes[0]) + lobes[3] * Math.sin(5 * a + lobes[2]));
  return {
    step(dt) {
      t += dt;
      if (t > 5) reset();
    },
    sample(c, r, out) {
      out.ch = null;
      const y = r * g.aspect;
      const dx = c - cx;
      const dy = (y - cy) * 1.4;
      const d = Math.hypot(dx, dy);
      const R = radius(Math.atan2(dy, dx));
      const inside = d < R;
      const edge = Math.abs(d - R) < 1.1;
      const flood = Math.hypot(c - click.x, (y - click.y) * 1.4) < Math.max(0, t - 0.6) * 16;
      // A faint photographic texture everywhere.
      const tex = 0.1 + 0.08 * Math.sin(c * 0.7) * Math.cos(r * 1.3);
      out.v = tex;
      out.hue = 40;
      if (inside) {
        out.v = 0.3;
        out.hue = 30;
      }
      if (inside && flood) {
        out.v = 0.62;
        out.hue = 280;
      }
      if (edge && flood) {
        out.v = 1;
        out.hue = 290;
      }
      if (t > 0.3 && t < 1.4 && Math.round(click.x) === c && Math.round(click.y / g.aspect) === r) {
        out.v = 1;
        out.hue = 0;
        out.ch = "+";
      }
    },
  };
};

/** Three different pictures in turn, each scanned and then scored against
 *  its own labels, the way a CLIP-style model ranks free-form text. */
const visionAnything: SceneFactory = (g) => {
  const screen = new TextScreen(g, 0);
  const split = Math.floor(g.cols * 0.58);
  type Pixel = (x: number, y: number) => [number, number];
  const examples: { labels: string[]; image: Pixel }[] = [
    {
      labels: ["mountains", "a city", "the sea"],
      image: (x, y) => {
        const ridge = 0.55 - 0.25 * Math.abs(Math.sin(x * 5.2)) - 0.1 * Math.sin(x * 13);
        if (Math.hypot(x - 0.75, (y - 0.25) * 1.6) < 0.1) return [0.9, 40];
        return y > ridge ? [0.35 + 0.4 * (y - ridge), 160] : [0.12, 210];
      },
    },
    {
      labels: ["a city", "a forest", "the moon"],
      image: (x, y) => {
        const b = Math.floor(x * 9);
        const height = 0.25 + 0.5 * Math.abs(Math.sin(b * 12.9898) % 1);
        if (y > 1 - height) {
          const window = Math.floor(x * 40) % 2 === 0 && Math.floor(y * 14) % 2 === 0;
          return window ? [0.95, 48] : [0.35, 220];
        }
        return [0.06, 230];
      },
    },
    {
      labels: ["the sea", "a desert", "a city"],
      image: (x, y) => {
        const horizon = 0.45;
        if (Math.hypot(x - 0.3, (y - 0.2) * 1.6) < 0.08) return [0.9, 50];
        if (y > horizon - 0.08 && y < horizon && Math.abs(x - 0.62) < 0.07) return [0.85, 15];
        if (y > horizon) return [0.3 + 0.35 * Math.max(0, Math.sin(x * 30 + y * 18)), 200];
        return [0.08, 220];
      },
    },
  ];
  let t = 0;
  let index = 0;
  return {
    step(dt) {
      t += dt;
      const c0 = cycle(t, examples.length, 5);
      index = c0.index;
      const p = Math.min(1, Math.max(0, (c0.local - 1.2) / 1.6));
      const width = Math.max(4, g.cols - split - 6);
      screen.lines = [];
      for (let r = 0; r < g.rows; r++) screen.lines.push({ text: "", hue: 0, v: 0 });
      examples[index].labels.forEach((label, k) => {
        const target = k === 0 ? 0.83 : 0.08;
        const prob = 0.33 + (target - 0.33) * p;
        const row = 2 + k * 3;
        if (row + 1 >= g.rows) return;
        screen.lines[row] = { text: " ".repeat(split + 2) + label, hue: 210, v: 0.6 };
        screen.lines[row + 1] = { text: " ".repeat(split + 2) + bar(prob, width), hue: k === 0 && p > 0.5 ? 140 : 0, v: k === 0 ? 0.9 : 0.4 };
      });
    },
    sample(c, r, out) {
      if (c >= split) {
        screen.sample(c, r, out);
        return;
      }
      out.ch = null;
      const local = t % 5;
      // The new picture is revealed by the scan line sweeping across.
      const scan = Math.min(split + 2, local * 30);
      const shown = c < scan ? index : (index + examples.length - 1) % examples.length;
      const [v, hue] = examples[shown].image(c / split, r / g.rows);
      out.v = Math.abs(c - scan) < 1 ? Math.min(1, v + 0.5) : v;
      out.hue = hue;
    },
  };
};

/** Noisy samples from four different curves in turn, a fit sliding from a
 *  straight line into shape, and the mean squared error it reaches. */
const curveFitter: SceneFactory = (g, rand) => {
  const buf = new TrailBuffer(g);
  const label = new TextScreen(g, 1);
  const h = g.rows * g.aspect;
  const targets: ((x: number) => number)[] = [
    (x) => Math.sin(x * 2.4) * 0.6 + Math.tanh((x - 0.3) * 4) * 0.3,
    (x) => Math.tanh(x * 6) * 0.7,
    (x) => 1.3 * x * x - 0.6,
    (x) => Math.exp(-((x - 0.2) ** 2) * 9) * 1.2 - 0.5,
  ];
  const samples = targets.map((f) =>
    Array.from({ length: 22 }, () => {
      const x = rand() * 2 - 1;
      return { x, y: f(x) + (rand() - 0.5) * 0.25 };
    }),
  );
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const { index, local } = cycle(t, targets.length, 6);
      const f = targets[index];
      const pts = samples[index];
      buf.decay(0);
      const k = Math.min(1, local / 4);
      const fit = (x: number) => k * f(x) + (1 - k) * (0.4 * x);
      const toX = (x: number) => ((x + 1) / 2) * g.cols;
      const toY = (y: number) => h * 0.55 - y * h * 0.38;
      for (const p of pts) buf.plot(toX(p.x), toY(p.y), 0.75, 45);
      let px = -1;
      let py = fit(-1);
      for (let x = -0.98; x <= 1; x += 0.02) {
        const y = fit(x);
        buf.line(toX(px), toY(py), toX(x), toY(y), 0.9, 190 + 120 * (1 - k));
        px = x;
        py = y;
      }
      const mse = pts.reduce((s2, p) => s2 + (fit(p.x) - p.y) ** 2, 0) / pts.length;
      const epoch = Math.round(k * 500);
      label.lines = [{ text: `epoch ${String(epoch).padStart(3)} · mse ${mse.toFixed(3)}`, hue: k >= 1 ? 140 : 45, v: 0.85 }];
    },
    sample(c, r, out) {
      if (r === 0) {
        label.sample(c, r, out);
        return;
      }
      buf.sample(c, r, out);
    },
  };
};

/** A 3×3 window slides over a picture, leaving the filtered result behind.
 *  Each pass uses a different picture and a different kernel. */
const convolutionLab: SceneFactory = (g) => {
  const label = new TextScreen(g, 1);
  type Img = (c: number, r: number) => number;
  const images: Img[] = [
    (c, r) => {
      const x = c / g.cols - 0.5;
      const y = (r * g.aspect) / g.cols - 0.25;
      const disc = Math.hypot(x + 0.15, y) < 0.18 ? 0.8 : 0;
      const box = Math.abs(x - 0.22) < 0.12 && Math.abs(y + 0.02) < 0.14 ? 0.55 : 0;
      return Math.max(disc, box, 0.12);
    },
    (c, r) => ((Math.floor(c / 4) + Math.floor(r / 2)) % 2 ? 0.75 : 0.12),
    (c, r) => {
      const x = c / g.cols - 0.5;
      const y = (r * g.aspect) / g.cols - 0.3;
      const ring = Math.abs(Math.hypot(x, y) - 0.2) < 0.05 ? 0.85 : 0;
      return Math.max(ring, 0.1 + 0.25 * (c / g.cols));
    },
  ];
  type Kernel = { name: string; apply: (img: Img, c: number, r: number) => number };
  const kernels: Kernel[] = [
    { name: "edge", apply: (img, c, r) => Math.min(1, Math.hypot(img(c + 1, r) - img(c - 1, r), img(c, r + 1) - img(c, r - 1)) * 1.6) },
    {
      name: "blur",
      apply: (img, c, r) => {
        let s2 = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) s2 += img(c + dc, r + dr);
        return s2 / 9;
      },
    },
    {
      name: "sharpen",
      apply: (img, c, r) =>
        Math.max(0, Math.min(1, 5 * img(c, r) - img(c + 1, r) - img(c - 1, r) - img(c, r + 1) - img(c, r - 1))),
    },
  ];
  const PASS = (g.cols * g.rows) / 60 + 1.5;
  let t = 0;
  let index = 0;
  return {
    step(dt) {
      t += dt;
      index = cycle(t, kernels.length, PASS).index;
      label.lines = [{ text: `kernel: ${kernels[index].name}`, hue: 45, v: 0.9 }];
    },
    sample(c, r, out) {
      out.ch = null;
      const img = images[index];
      const kernel = kernels[index];
      const pos = Math.floor((t % PASS) * 60);
      const wr = Math.floor(pos / g.cols);
      const wc = pos % g.cols;
      const inWindow = Math.abs(r - wr) <= 1 && Math.abs(c - wc) <= 1;
      if (inWindow) {
        out.v = 1;
        out.hue = 45;
        out.ch = r === wr && c === wc ? "▣" : "□";
        return;
      }
      if (r === 0 && c < 18) {
        label.sample(c, r, out);
        if (out.ch) return;
      }
      const done = r < wr || (r === wr && c < wc);
      if (done) {
        const v = kernel.apply(img, c, r);
        out.v = kernel.name === "edge" && v < 0.1 ? 0.04 : v;
        out.hue = 175;
      } else {
        out.v = img(c, r);
        out.hue = 220;
      }
    },
  };
};

/** BFS flooding outward from S through a field of wall segments, then the
 *  shortest path to G lighting up. */
const pathfinding: SceneFactory = (g, rand) => {
  const { cols, rows } = g;
  let wall = new Uint8Array(cols * rows);
  let dist = new Int32Array(cols * rows);
  let prev = new Int32Array(cols * rows);
  let path = new Set<number>();
  let maxDist = 1;
  let t = 0;
  let start = 0;
  let goal = 0;
  const bfs = () => {
    dist = new Int32Array(cols * rows).fill(-1);
    prev = new Int32Array(cols * rows).fill(-1);
    dist[start] = 0;
    const q = [start];
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi];
      const r = Math.floor(i / cols);
      const c = i % cols;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const j = nr * cols + nc;
        if (wall[j] || dist[j] >= 0) continue;
        dist[j] = dist[i] + 1;
        prev[j] = i;
        q.push(j);
      }
    }
  };
  const build = () => {
    for (let attempt = 0; attempt < 12; attempt++) {
      wall = new Uint8Array(cols * rows);
      const segments = Math.round((cols * rows) / 22);
      for (let s = 0; s < segments; s++) {
        const len = 3 + Math.floor(rand() * 5);
        const horiz = rand() < 0.5;
        const r0 = Math.floor(rand() * rows);
        const c0 = Math.floor(rand() * cols);
        for (let k = 0; k < len; k++) {
          const r = horiz ? r0 : r0 + k;
          const c = horiz ? c0 + k * 2 : c0;
          for (const cc of horiz ? [c, c + 1] : [c]) {
            if (r < rows && cc < cols) wall[r * cols + cc] = 1;
          }
        }
      }
      start = Math.floor(rows / 2) * cols + 1;
      goal = Math.floor(rows / 2) * cols + cols - 2;
      wall[start] = 0;
      wall[goal] = 0;
      bfs();
      if (dist[goal] >= 0) break;
    }
    maxDist = Math.max(1, ...Array.from(dist));
    path = new Set();
    for (let i = goal; i >= 0 && dist[goal] >= 0; i = prev[i]) path.add(i);
    t = 0;
  };
  build();
  const speed = 0.045;
  return {
    step(dt) {
      t += dt;
      if (t > maxDist * speed + 3) build();
    },
    sample(c, r, out) {
      const i = r * cols + c;
      out.ch = null;
      out.v = 0;
      const front = t / speed;
      if (i === start || i === goal) {
        out.v = 1;
        out.hue = i === start ? 140 : 0;
        out.ch = i === start ? "S" : "G";
        return;
      }
      if (wall[i]) {
        out.v = 0.35;
        out.hue = 220;
        out.ch = "▪";
        return;
      }
      const d = dist[i];
      if (d < 0 || d > front) return;
      if (front > dist[goal] && path.has(i)) {
        out.v = 1;
        out.hue = 48;
        out.ch = "●";
        return;
      }
      const fresh = front - d < 1.5;
      out.ch = fresh ? "○" : "·";
      out.v = fresh ? 0.95 : 0.45;
      out.hue = 175 + (d / maxDist) * 110;
    },
  };
};

/** A scrolling line chart: slope glyphs for the line, a shaded area under
 *  it and a dashed marker at the latest value. The walk is decorative, so
 *  no price is printed. */
const pulseBoard: SceneFactory = (g, rand) => {
  const n = g.cols;
  const cv = new CharCanvas(g);
  const vals: number[] = [];
  let p = 0.5;
  const next = () => {
    p = Math.max(0.1, Math.min(0.9, p + (rand() - 0.5) * 0.11 + (0.5 - p) * 0.04));
    return p;
  };
  for (let i = 0; i < n; i++) vals.push(next());
  let acc = 0;
  const draw = () => {
    cv.clear();
    const top = 2;
    const span = g.rows - top - 1;
    // Autoscale to the visible window, as a real chart would.
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const rowOf = (v: number) => top + (1 - (v - lo) / Math.max(1e-6, hi - lo)) * span;
    const last = vals[n - 1];
    const up = last >= vals[n - 2];
    const lastRow = Math.round(rowOf(last));
    for (let c = 0; c < n; c += 2) cv.put(c, lastRow, "┄", 0.22, up ? 140 : 0);
    for (let c = 0; c < n; c++) {
      const y0 = rowOf(vals[c]);
      const y1 = rowOf(vals[Math.min(n - 1, c + 1)]);
      const rising = y1 < y0 - 0.3;
      const falling = y1 > y0 + 0.3;
      const hue = rising ? 140 : falling ? 0 : 200;
      const r0 = Math.round(Math.min(y0, y1));
      const r1 = Math.round(Math.max(y0, y1));
      for (let r = r0; r <= r1; r++) cv.put(c, r, rising ? "╱" : falling ? "╲" : "─", 0.95, hue);
      for (let r = r1 + 1; r < g.rows; r++) if ((r + c) % 2 === 0) cv.put(c, r, "·", 0.3, 200);
    }
    cv.put(n - 1, rowOf(last), "◆", 1, up ? 140 : 0);
    const label = `LIVE FEED ${up ? "▲" : "▼"}`;
    for (let k = 0; k < label.length; k++) if (label[k] !== " ") cv.put(1 + k, 0, label[k], 0.9, up ? 140 : 0);
  };
  draw();
  return {
    step(dt) {
      acc += dt;
      let moved = false;
      while (acc > 0.2) {
        acc -= 0.2;
        vals.push(next());
        vals.shift();
        moved = true;
      }
      if (moved) draw();
    },
    sample: (c, r, out) => cv.sample(c, r, out),
  };
};

/** Two bots in a walled arena: they patrol, leave a fading track and trade
 *  shots that flash across the floor. */
const adaptiveArena: SceneFactory = (g, rand) => {
  const cv = new CharCanvas(g);
  const W = g.cols;
  const H = g.rows;
  const blocks = Array.from({ length: 5 }, () => ({
    c: 4 + Math.floor(rand() * (W - 10)),
    r: 2 + Math.floor(rand() * (H - 5)),
    w: 2 + Math.floor(rand() * 4),
  }));
  const blocked = (c: number, r: number) =>
    blocks.some((b) => Math.round(r) === b.r && Math.round(c) >= b.c && Math.round(c) < b.c + b.w);
  const bots = [0, 1].map((k) => ({
    c: k ? W - 4 : 3,
    r: k ? H - 3 : 2,
    vc: (k ? -1 : 1) * 6,
    vr: (k ? -1 : 1) * 2.2,
    hue: k ? 15 : 195,
    trail: [] as [number, number][],
  }));
  const shots: { a: [number, number]; b: [number, number]; age: number; hue: number }[] = [];
  let cooldown = 0.6;
  return {
    step(dt) {
      for (const b of bots) {
        const nc = b.c + b.vc * dt;
        const nr = b.r + b.vr * dt;
        if (nc < 1.5 || nc > W - 2.5 || blocked(nc, b.r)) b.vc *= -1;
        else b.c = nc;
        if (nr < 1.5 || nr > H - 2.5 || blocked(b.c, nr)) b.vr *= -1;
        else b.r = nr;
        b.trail.push([b.c, b.r]);
        if (b.trail.length > 26) b.trail.shift();
      }
      cooldown -= dt;
      if (cooldown < 0) {
        cooldown = 0.7 + rand() * 0.8;
        const k = rand() < 0.5 ? 0 : 1;
        const a = bots[k];
        const b = bots[1 - k];
        shots.push({ a: [a.c, a.r], b: [b.c, b.r], age: 0, hue: a.hue });
      }
      for (const s of shots) s.age += dt;
      while (shots.length && shots[0].age > 0.45) shots.shift();

      cv.clear();
      cv.box(0, 0, W - 1, H - 1, 0.35, 220);
      for (const bl of blocks) for (let k = 0; k < bl.w; k++) cv.put(bl.c + k, bl.r, "▪", 0.45, 220);
      for (const b of bots) {
        b.trail.forEach(([c, r], i) => cv.put(c, r, "·", 0.25 + 0.5 * (i / b.trail.length), b.hue));
      }
      for (const s of shots) {
        const fade = 1 - s.age / 0.45;
        const [ac, ar] = s.a;
        const [bc, br] = s.b;
        const dc = bc - ac;
        const dr = br - ar;
        const n = Math.ceil(Math.max(Math.abs(dc), Math.abs(dr)));
        const glyph = Math.abs(dr) * 2 < Math.abs(dc) ? "─" : Math.abs(dc) < Math.abs(dr) * 0.5 ? "│" : dc * dr > 0 ? "╲" : "╱";
        for (let i = 1; i < n; i++) cv.put(ac + (dc * i) / n, ar + (dr * i) / n, glyph, 0.9 * fade, s.hue);
        cv.put(bc, br, "✶", fade, 48);
      }
      for (const b of bots) cv.put(b.c, b.r, "◉", 1, b.hue);
    },
    sample: (c, r, out) => cv.sample(c, r, out),
  };
};

/** You press left or right, the model guesses first. Hits are green, misses
 *  red, and the running accuracy climbs as it learns the habit. */
const outguess: SceneFactory = (g, rand) => {
  const screen = new TextScreen(g, 2, 2);
  const moves: { key: string; hit: boolean }[] = [];
  let acc = 0.3 * 80;
  let last = "◀";
  return {
    step(dt) {
      acc += dt;
      while (acc > 0.3) {
        acc -= 0.3;
        // Humans repeat themselves; the model learns it and starts winning.
        const key = rand() < 0.7 ? last : last === "◀" ? "▶" : "◀";
        const guess = moves.length > 6 && rand() < 0.75 ? last : rand() < 0.5 ? "◀" : "▶";
        moves.push({ key, hit: guess === key });
        last = key;
        if (moves.length > 400) moves.splice(0, 200);
      }
      const perRow = Math.max(4, Math.floor((g.cols - 4) / 2));
      const rowsAvail = Math.floor(g.rows / 2) - 1;
      const shown = moves.slice(-perRow * rowsAvail);
      const recent = moves.slice(-60);
      const score = recent.length ? recent.filter((m) => m.hit).length / recent.length : 0;
      const head = `model reads you ${String(Math.round(score * 100)).padStart(3)}% `;
      const width = Math.max(4, g.cols - head.length - 4);
      screen.lines = [
        { text: head + bar(score, width), hue: 45, v: 0.95, spans: [{ from: head.length, to: head.length + width, hue: 45, v: 0.7 }] },
      ];
      for (let r = 0; r < rowsAvail; r++) {
        const chunk = shown.slice(r * perRow, (r + 1) * perRow);
        if (!chunk.length) break;
        const text = chunk.map((m) => m.key + " ").join("");
        const newestRow = r * perRow + chunk.length === shown.length;
        const spans = chunk.map((m, k) => ({
          from: k * 2,
          to: k * 2 + 1,
          hue: m.hit ? 140 : 0,
          v: newestRow && k === chunk.length - 1 ? 1 : m.hit ? 0.8 : 0.5,
        }));
        screen.lines.push({ text, hue: 0, v: 0.6, spans });
      }
    },
    sample: (c, r, out) => screen.sample(c, r, out),
  };
};

// ---------------------------------------------------------------- bulletin

type Line = TextScreen["lines"][number];

/** Which of `count` cases is on screen, and how far into it we are. */
const cycle = (t: number, count: number, period: number) => ({
  index: Math.floor(t / period) % count,
  local: t % period,
});

/** Eduport's own views in turn: the application Kanban with a card moving
 *  between columns, a table sorted by deadline, and the ⌘K palette. */
const eduport: SceneFactory = (g) => {
  const screen = new TextScreen(g, 1, 2);
  const views: ((local: number) => Line[])[] = [
    (local) => {
      const cols = ["DRAFT", "SUBMITTED", "INTERVIEW", "OFFER"];
      const colW = Math.max(9, Math.floor((g.cols - 2) / cols.length));
      const cards = [
        ["EPFL", 0],
        ["KAIST", 1],
        ["Edinburgh", 1],
        ["TU München", 2],
      ] as const;
      // One card walks right, one column per second and a half.
      const moving = Math.min(cols.length - 1, 1 + Math.floor(local / 1.6));
      const placed = [...cards.map(([n, c]) => [n, c] as [string, number]), ["ETH Zürich", moving] as [string, number]];
      const lines: Line[] = [{ text: cols.map((c) => c.padEnd(colW)).join(""), hue: 220, v: 0.5 }];
      for (let row = 0; row < 3; row++) {
        let text = "";
        const spans: { from: number; to: number; hue: number; v: number }[] = [];
        cols.forEach((_, ci) => {
          const here = placed.filter(([, c]) => c === ci);
          const card = here[row];
          const cell = card ? `▌${card[0].slice(0, colW - 2)}` : "";
          if (card) spans.push({ from: ci * colW, to: ci * colW + 1, hue: card[0] === "ETH Zürich" ? 45 : 195, v: 1 });
          if (card?.[0] === "ETH Zürich") spans.push({ from: ci * colW + 1, to: ci * colW + cell.length, hue: 45, v: 0.95 });
          text += cell.padEnd(colW);
        });
        lines.push({ text, hue: 210, v: 0.6, spans });
      }
      return lines;
    },
    (local) => {
      const rows = [
        ["Edinburgh", 4],
        ["KAIST", 11],
        ["EPFL", 23],
        ["TU München", 38],
      ] as const;
      return [
        { text: "DEADLINE    PROGRAM", hue: 220, v: 0.45 },
        ...rows.map(([name, days], i) => {
          const left = Math.max(0, days - Math.floor(local * 0.8));
          const urgent = left <= 7;
          const text = `${`${left} days`.padEnd(12)}${name}`;
          const blink = urgent && i === 0 && Math.sin(local * 6) > 0;
          return { text, hue: 210, v: 0.6, spans: [{ from: 0, to: 9, hue: urgent ? 0 : 45, v: blink ? 1 : 0.8 }] };
        }),
      ];
    },
    (local) => {
      const query = "zurich";
      const typed = Math.min(query.length, Math.floor(local * 6));
      const hits = [
        ["University", "eth-zurich"],
        ["Program", "eth-msc-data-science"],
        ["Person", "prof-at-eth"],
      ];
      const lines: Line[] = [
        { text: `⌘K  ${query.slice(0, typed)}${typed < query.length ? "█" : ""}`, hue: 195, v: 0.9, spans: [{ from: 0, to: 2, hue: 220, v: 0.5 }] },
      ];
      if (typed === query.length) {
        const shown = Math.floor((local - query.length / 6) * 5);
        hits.slice(0, Math.max(0, shown)).forEach(([kind, slug], k) => {
          const text = `${k === 0 ? "›" : " "} ${kind.padEnd(11)}[[${slug}]]`;
          lines.push({ text, hue: 210, v: k === 0 ? 0.85 : 0.55, spans: [{ from: 2, to: 13, hue: 220, v: 0.45 }, { from: 13, to: text.length, hue: 280, v: k === 0 ? 0.95 : 0.65 }] });
        });
      }
      return lines;
    },
  ];
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const { index, local } = cycle(t, views.length, 6.5);
      screen.lines = views[index](local);
    },
    sample: (c, r, out) => screen.sample(c, r, out),
  };
};

/** Real vaultdb commands from its README, typed in turn, each followed by
 *  sample output: query, count, create and traverse. */
const vaultdb: SceneFactory = (g) => {
  const screen = new TextScreen(g, 2, 2);
  const note = (name: string, rest: string, v = 0.6): Line => ({ text: `${name.padEnd(12)}${rest}`, hue: 210, v, spans: [{ from: 0, to: name.length, hue: 280, v: 0.75 }] });
  const cases: { cmd: string; out: Line[] }[] = [
    {
      cmd: `vaultdb query 3-Notes --where "status exists"`,
      out: [note("Deep Work", "to-read"), note("Dune", "reading"), note("Arrival", "watched")],
    },
    {
      cmd: "vaultdb count 3-Notes",
      out: [{ text: "42", hue: 45, v: 0.95 }],
    },
    {
      cmd: `vaultdb create 3-Notes --name "Arrival"`,
      out: [{ text: "created 3-Notes/Arrival.md", hue: 140, v: 0.85, spans: [{ from: 8, to: 26, hue: 280, v: 0.8 }] }],
    },
    {
      cmd: "vaultdb traverse BERT --depth 2",
      out: [
        { text: "BERT", hue: 280, v: 0.85 },
        { text: "├─ Transformer", hue: 210, v: 0.6, spans: [{ from: 0, to: 3, hue: 220, v: 0.4 }] },
        { text: "│  └─ Attention", hue: 210, v: 0.6, spans: [{ from: 0, to: 6, hue: 220, v: 0.4 }] },
        { text: "└─ Masked LM", hue: 210, v: 0.6, spans: [{ from: 0, to: 3, hue: 220, v: 0.4 }] },
      ],
    },
  ];
  const TYPE_RATE = 34;
  const PERIOD = 6;
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const { index, local } = cycle(t, cases.length, PERIOD);
      const { cmd, out } = cases[index];
      const typed = Math.min(cmd.length, Math.floor(local * TYPE_RATE));
      const typing = typed < cmd.length;
      const cursor = Math.sin(t * 8) > 0 ? "█" : " ";
      screen.lines = [
        { text: `$ ${cmd.slice(0, typed)}${typing ? cursor : ""}`, hue: 140, v: 0.9, spans: [{ from: 0, to: 1, hue: 220, v: 0.5 }] },
      ];
      if (typing) return;
      const shown = Math.floor((local - cmd.length / TYPE_RATE) * 7);
      screen.lines.push(...out.slice(0, Math.max(0, shown)));
    },
    sample: (c, r, out) => screen.sample(c, r, out),
  };
};

/** The metuclass commands in turn: a sync pulling new files down, a dry
 *  run listing what would change, and the course list. */
const metuclass: SceneFactory = (g) => {
  const screen = new TextScreen(g, 2, 2);
  const nameW = 24;
  const views: ((local: number) => Line[])[] = [
    (local) => {
      const files = ["CENG 334/slides-w05.pdf", "CENG 334/hw2.pdf", "CENG 596/syllabus.pdf", "MATH 260/notes-w6.pdf"];
      const width = Math.max(4, g.cols - nameW - 9);
      return [
        { text: "$ metuclass sync", hue: 140, v: 0.9, spans: [{ from: 0, to: 1, hue: 220, v: 0.5 }] },
        ...files.map((f, i) => {
          const p = Math.max(0, Math.min(1, local * 0.55 - i * 0.5));
          const done = p >= 1;
          const text = `${f.padEnd(nameW)}${bar(p, width)} ${done ? "✓" : `${Math.round(p * 100)}%`.padStart(3)}`;
          return { text, hue: 210, v: 0.55, spans: [{ from: nameW, to: text.length, hue: done ? 140 : 45, v: done ? 0.85 : 0.7 }] };
        }),
      ];
    },
    (local) => {
      const rows: [string, string][] = [
        ["new", "CENG 334/slides-w06.pdf"],
        ["updated", "CENG 334/hw2.pdf"],
      ];
      const shown = Math.floor(local * 2);
      return [
        { text: "$ metuclass sync --dry-run", hue: 140, v: 0.9, spans: [{ from: 0, to: 1, hue: 220, v: 0.5 }] },
        ...rows.slice(0, shown).map(([kind, f]) => {
          const text = `${kind.padEnd(9)}${f}`;
          return { text, hue: 210, v: 0.6, spans: [{ from: 0, to: 8, hue: kind === "new" ? 140 : 45, v: 0.85 }] };
        }),
        ...(shown > rows.length ? [{ text: "nothing downloaded (dry run)", hue: 220, v: 0.5 }] : []),
      ];
    },
    (local) => {
      const courses = ["CENG 334 Section 1", "CENG 596 Section 1", "MATH 260 Section 2"];
      const shown = Math.floor(local * 3);
      return [
        { text: "$ metuclass courses", hue: 140, v: 0.9, spans: [{ from: 0, to: 1, hue: 220, v: 0.5 }] },
        ...courses.slice(0, shown).map((c) => ({ text: `• ${c}`, hue: 195, v: 0.7, spans: [{ from: 0, to: 1, hue: 45, v: 0.8 }] })),
      ];
    },
  ];
  let t = 0;
  return {
    step(dt) {
      t += dt;
      const { index, local } = cycle(t, views.length, 6);
      screen.lines = views[index](local);
    },
    sample: (c, r, out) => screen.sample(c, r, out),
  };
};

export const TOOL_SCENES: Record<string, SceneFactory> = {
  "video-volume": videoVolume,
  "sampling-lab": samplingLab,
  "decision-boundary": decisionBoundary,
  "classify-anything": classifyAnything,
  "segment-anything": segmentAnything,
  "vision-anything": visionAnything,
  "curve-fitter": curveFitter,
  "convolution-lab": convolutionLab,
  "pathfinding-showdown": pathfinding,
  "pulse-board": pulseBoard,
  "adaptive-arena": adaptiveArena,
  outguess,
  eduport,
  vaultdb,
  metuclass,
};

