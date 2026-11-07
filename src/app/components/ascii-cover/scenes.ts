/**
 * Procedural scenes for the ASCII card covers. Each scene simulates a tiny
 * version of the project it represents on a character grid, so the cover is
 * a real (if miniature) instance of the idea rather than a stock picture.
 */

import { mulberry32, TAU, TrailBuffer, type Grid, type Scene, type SceneFactory } from "./scene-kit";
import { TOOL_SCENES } from "./scenes-tools";

// ---------------------------------------------------------------- scenes

const gameOfLife: SceneFactory = ({ cols, rows }, rand) => {
  const n = cols * rows;
  let grid = new Uint8Array(n);
  let next = new Uint8Array(n);
  const trail = new Float32Array(n);
  let acc = 0;
  let gen = 0;

  const seed = () => {
    for (let i = 0; i < n; i++) grid[i] = rand() < 0.34 ? 1 : 0;
    gen = 0;
  };
  seed();

  const tick = () => {
    let alive = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let k = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr || dc) {
              k += grid[((r + dr + rows) % rows) * cols + ((c + dc + cols) % cols)];
            }
          }
        }
        const i = r * cols + c;
        const live = grid[i] ? k === 2 || k === 3 : k === 3;
        next[i] = live ? 1 : 0;
        trail[i] = live ? 1 : trail[i] * 0.78;
        alive += next[i];
      }
    }
    [grid, next] = [next, grid];
    gen++;
    if (gen > 180 || alive < n * 0.06) seed();
  };

  return {
    step(dt) {
      acc += dt;
      while (acc > 0.11) {
        acc -= 0.11;
        tick();
      }
    },
    sample(c, r, out) {
      const i = r * cols + c;
      out.v = grid[i] ? 1 : trail[i] * 0.5;
      out.hue = 150 - 40 * (1 - out.v);
      out.ch = null;
    },
  };
};

/** Pulse-coupled fireflies (Mirollo–Strogatz): flashes nudge neighbours'
 *  phases forward until the swarm blinks in sync, then it resets. */
const fireflies: SceneFactory = (g, rand) => {
  const count = Math.max(18, Math.round((g.cols * g.rows) / 45));
  const w = g.cols;
  const h = g.rows * g.aspect;
  const bugs = Array.from({ length: count }, () => ({
    x: rand() * w,
    y: rand() * h,
    phase: rand(),
    omega: 0.7 + rand() * 0.12,
    flash: 0,
  }));
  const buf = new TrailBuffer(g);
  let age = 0;

  return {
    step(dt) {
      age += dt;
      if (age > 26) {
        age = 0;
        for (const b of bugs) b.phase = rand();
      }
      let fired = 0;
      for (const b of bugs) {
        b.phase += dt * b.omega;
        b.flash *= Math.exp(-dt * 7);
        if (b.phase >= 1) {
          b.phase -= 1;
          b.flash = 1;
          fired++;
        }
      }
      if (fired) {
        for (const b of bugs) {
          if (b.flash < 0.99) b.phase = Math.min(1, b.phase + 0.035 * fired * b.phase);
        }
      }
      buf.decay(0.6);
      for (const b of bugs) {
        const glow = 0.32 + b.flash * 0.68;
        const reach = b.flash > 0.2 ? 2 : 0;
        for (let dy = -reach; dy <= reach; dy++) {
          for (let dx = -reach * 2; dx <= reach * 2; dx++) {
            const d2 = dx * dx * 0.5 + dy * dy * 2;
            buf.plot(b.x + dx, b.y + dy * g.aspect, glow * Math.exp(-d2 / (0.6 + 2.5 * b.flash)), 42 + 14 * b.flash);
          }
        }
      }
    },
    sample: (c, r, out) => buf.sample(c, r, out),
  };
};

/** Clustered points rotating in 3D: an embedding space seen from outside. */
const embeddings: SceneFactory = (g, rand) => {
  const hues = [190, 320, 45, 140];
  const pts: { x: number; y: number; z: number; hue: number }[] = [];
  hues.forEach((hue, k) => {
    const a = (k / hues.length) * TAU;
    const cx = Math.cos(a) * 0.55;
    const cz = Math.sin(a) * 0.55;
    const cy = (k % 2 ? 0.25 : -0.25);
    for (let i = 0; i < 34; i++) {
      const gauss = () => (rand() + rand() + rand() - 1.5) * 0.28;
      pts.push({ x: cx + gauss(), y: cy + gauss(), z: cz + gauss(), hue });
    }
  });
  const buf = new TrailBuffer(g);
  const h = g.rows * g.aspect;
  let angle = 0;

  return {
    step(dt) {
      angle += dt * 0.35;
      buf.decay(0.72);
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const scale = Math.min(g.cols, h) * 0.55;
      for (const p of pts) {
        const x = p.x * ca - p.z * sa;
        const z = p.x * sa + p.z * ca;
        const depth = 0.55 + 0.45 * ((z + 1) / 2);
        buf.plot(g.cols / 2 + x * scale * 1.5, h / 2 + p.y * scale, depth, p.hue);
      }
    },
    sample: (c, r, out) => buf.sample(c, r, out),
  };
};

/** Epicycles: a few rotating arms whose tip draws a closed curve. */
const fourier: SceneFactory = (g) => {
  const terms = [
    { k: 1, r: 1 },
    { k: -2, r: 0.42 },
    { k: 3, r: 0.24 },
    { k: -5, r: 0.12 },
    { k: 7, r: 0.07 },
  ];
  const trail = new TrailBuffer(g);
  const arms = new TrailBuffer(g);
  const h = g.rows * g.aspect;
  const scale = Math.min(g.cols * 0.3, h * 0.3);
  let t = 0;

  return {
    step(dt) {
      t += dt * 0.32;
      trail.decay(0.992);
      arms.decay(0);
      let x = g.cols / 2;
      let y = h / 2;
      for (const term of terms) {
        const a = term.k * t * TAU;
        const nx = x + Math.cos(a) * term.r * scale;
        const ny = y + Math.sin(a) * term.r * scale;
        const rad = term.r * scale;
        for (let s = 0; s < 40; s++) {
          const b = (s / 40) * TAU;
          arms.plot(x + Math.cos(b) * rad, y + Math.sin(b) * rad, 0.16, 210);
        }
        arms.line(x, y, nx, ny, 0.45, 200);
        x = nx;
        y = ny;
      }
      trail.plot(x, y, 1, 185 + ((t * 120) % 140));
    },
    sample(c, r, out) {
      trail.sample(c, r, out);
      const v = out.v;
      const hue = out.hue;
      arms.sample(c, r, out);
      if (v >= out.v) {
        out.v = v;
        out.hue = hue;
      }
    },
  };
};

/** Three optimizers racing down the same loss surface, contours underneath. */
const optimizers: SceneFactory = (g, rand) => {
  const f = (x: number, y: number) =>
    0.35 * x * x + 2.2 * y * y + 0.45 * Math.sin(2.2 * x) * Math.cos(1.6 * y);
  const grad = (x: number, y: number): [number, number] => [
    0.7 * x + 0.99 * Math.cos(2.2 * x) * Math.cos(1.6 * y),
    4.4 * y - 0.72 * Math.sin(2.2 * x) * Math.sin(1.6 * y),
  ];
  const h = g.rows * g.aspect;
  const toScreen = (x: number, y: number): [number, number] => [
    ((x + 3.2) / 6.4) * g.cols,
    ((y + 1.6) / 3.2) * h,
  ];
  const contour = new Float32Array(g.cols * g.rows);
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const x = (c / g.cols) * 6.4 - 3.2;
      const y = ((r * g.aspect) / h) * 3.2 - 1.6;
      const level = Math.log1p(f(x, y) + 0.6) * 3.2;
      const frac = level - Math.floor(level);
      contour[r * g.cols + c] = frac < 0.22 ? 0.34 : 0;
    }
  }
  const buf = new TrailBuffer(g);
  type Runner = { x: number; y: number; vx: number; vy: number; m: [number, number]; s: [number, number]; n: number; hue: number; kind: 0 | 1 | 2 };
  let runners: Runner[] = [];
  const reset = () => {
    const sx = rand() < 0.5 ? -2.9 : 2.9;
    const sy = (rand() - 0.5) * 2.6;
    runners = ([0, 1, 2] as const).map((kind) => ({
      x: sx, y: sy, vx: 0, vy: 0, m: [0, 0], s: [0, 0], n: 0,
      hue: [0, 195, 48][kind], kind,
    }));
  };
  reset();
  let acc = 0;
  let age = 0;

  return {
    step(dt) {
      acc += dt;
      age += dt;
      if (age > 7) {
        age = 0;
        reset();
      }
      buf.decay(0.993);
      while (acc > 0.06) {
        acc -= 0.06;
        for (const p of runners) {
          const [gx, gy] = grad(p.x, p.y);
          if (p.kind === 0) {
            p.x -= 0.035 * gx;
            p.y -= 0.035 * gy;
          } else if (p.kind === 1) {
            p.vx = 0.9 * p.vx - 0.012 * gx;
            p.vy = 0.9 * p.vy - 0.012 * gy;
            p.x += p.vx;
            p.y += p.vy;
          } else {
            p.n++;
            p.m = [0.9 * p.m[0] + 0.1 * gx, 0.9 * p.m[1] + 0.1 * gy];
            p.s = [0.999 * p.s[0] + 0.001 * gx * gx, 0.999 * p.s[1] + 0.001 * gy * gy];
            const mh = [p.m[0] / (1 - 0.9 ** p.n), p.m[1] / (1 - 0.9 ** p.n)];
            const sh = [p.s[0] / (1 - 0.999 ** p.n), p.s[1] / (1 - 0.999 ** p.n)];
            p.x -= (0.06 * mh[0]) / (Math.sqrt(sh[0]) + 1e-8);
            p.y -= (0.06 * mh[1]) / (Math.sqrt(sh[1]) + 1e-8);
          }
          const [sx, sy] = toScreen(p.x, p.y);
          buf.plot(sx, sy, 1, p.hue);
        }
      }
    },
    sample(c, r, out) {
      buf.sample(c, r, out);
      const base = contour[r * g.cols + c];
      if (base > out.v) {
        out.v = base;
        out.hue = 220;
      }
    },
  };
};

/** Particles following a flow field that a slowly rotating "steering
 *  vector" bends: activation steering as weather. */
const steering: SceneFactory = (g, rand) => {
  const h = g.rows * g.aspect;
  const count = Math.round((g.cols * g.rows) / 16);
  const ps = Array.from({ length: count }, () => ({ x: rand() * g.cols, y: rand() * h, life: rand() * 4 }));
  const buf = new TrailBuffer(g);
  let t = 0;

  return {
    step(dt) {
      t += dt;
      buf.decay(0.93);
      const steer = t * 0.4;
      const strength = 0.3 + 0.3 * Math.sin(t * 0.5);
      const sx = Math.cos(steer);
      const sy = Math.sin(steer);
      for (const p of ps) {
        const a = 2 * Math.sin(p.x * 0.07 + t * 0.3) + 2 * Math.cos(p.y * 0.09 - t * 0.2);
        const fx = Math.cos(a * 1.6) * (1 - strength) + sx * strength;
        const fy = Math.sin(a * 1.6) * (1 - strength) + sy * strength;
        p.x += fx * dt * 14;
        p.y += fy * dt * 14;
        p.life -= dt;
        if (p.life < 0 || p.x < 0 || p.y < 0 || p.x >= g.cols || p.y >= h) {
          p.x = rand() * g.cols;
          p.y = rand() * h;
          p.life = 2 + rand() * 3;
        }
        const align = (fx * sx + fy * sy + 1) / 2;
        buf.plot(p.x, p.y, 0.55 + 0.45 * align, 255 + 85 * align);
      }
    },
    sample: (c, r, out) => buf.sample(c, r, out),
  };
};

/** Turkish text split into colour-coded sub-word pieces, with a scanner
 *  sweeping across the line it is currently tokenizing. */
const tokenizer: SceneFactory = (g) => {
  const source =
    "evlerimizden gelirken kitaplarımızı unutmayalım · çekoslovakyalılaştıramadıklarımızdan mısınız · güzelleştirilmiş veri setleri · ";
  // Split each word into short chunks that end on a vowel where possible,
  // which is roughly where Turkish suffix boundaries fall.
  const vowels = new Set("aeıioöuüAEIİOÖUÜ");
  const tokenIds: number[] = [];
  let tok = 0;
  let run = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === " " || ch === "·") {
      tok++;
      run = 0;
      tokenIds.push(-1);
      continue;
    }
    tokenIds.push(tok);
    run++;
    const nextIsSpace = source[i + 1] === " ";
    if (!nextIsSpace && run >= 2 && vowels.has(ch) && !vowels.has(source[i + 1] ?? "")) {
      tok++;
      run = 0;
    }
  }
  const palette = [190, 320, 45, 140, 260, 15];
  let t = 0;

  return {
    step(dt) {
      t += dt;
    },
    sample(c, r, out) {
      out.ch = null;
      out.v = 0;
      out.hue = 0;
      if (r % 2) return;
      const lineOffset = r * 37 + Math.floor(t * 2.2) * (r % 2 ? 1 : -1);
      const idx = (((c + lineOffset) % source.length) + source.length) % source.length;
      const ch = source[idx];
      const id = tokenIds[idx];
      const scanRow = (Math.floor(t * 0.7) * 2) % g.rows;
      const scanCol = (t * 26) % (g.cols + 10);
      if (id < 0) {
        out.ch = ch === "·" ? ch : null;
        out.v = ch === "·" ? 0.3 : 0;
        return;
      }
      out.ch = ch;
      out.hue = palette[id % palette.length];
      const near = r === scanRow ? Math.max(0, 1 - Math.abs(c - scanCol) / 6) : 0;
      out.v = (r === scanRow ? 0.75 : 0.42) + near * 0.25;
    },
  };
};

/** A masked word in a sentence keeps getting re-filled; each candidate
 *  scrambles in before it settles. */
const maskedLm: SceneFactory = (g, rand) => {
  const lines = [
    { before: "the cat sat on the ", after: " and slept", fills: ["mat", "sofa", "roof", "keys"] },
    { before: "attention is all you ", after: "", fills: ["need", "get", "want", "have"] },
    { before: "a model predicts the ", after: " word", fills: ["next", "masked", "missing", "best"] },
    { before: "paris is the capital of ", after: "", fills: ["france", "fashion", "europe", "love"] },
  ];
  const glyphs = "abcdefghijklmnopqrstuvwxyz#%&*";
  let t = 0;

  return {
    step(dt) {
      t += dt;
    },
    sample(c, r, out) {
      out.ch = null;
      out.v = 0;
      out.hue = 0;
      const block = r % 3;
      if (block !== 1) return;
      const line = lines[Math.floor(r / 3) % lines.length];
      const phase = t * 0.55 + r * 0.37;
      const fill = line.fills[Math.floor(phase) % line.fills.length];
      const settle = phase - Math.floor(phase);
      const slot = `[${fill}]`;
      const text = line.before + slot + line.after;
      const x = c - 2;
      if (x < 0 || x >= text.length) return;
      const inSlot = x >= line.before.length && x < line.before.length + slot.length;
      let ch = text[x];
      if (inSlot) {
        const k = x - line.before.length;
        if (settle < 0.35 && k > 0 && k < slot.length - 1 && rand() < 0.7) {
          ch = glyphs[Math.floor(rand() * glyphs.length)];
        }
        out.v = 1;
        out.hue = 340;
      } else {
        out.v = 0.42;
        out.hue = 210;
      }
      if (ch === " ") {
        out.v = 0;
        return;
      }
      out.ch = ch;
    },
  };
};

/** A character bigram model, trained on a short blurb at start-up, typing
 *  out its own text line by line. */
const ngram: SceneFactory = (g, rand) => {
  const corpus =
    "the model reads the text and counts which letter follows which. then it samples the next letter from those counts, one at a time, and the words come out almost right. ";
  const counts = new Map<string, Map<string, number>>();
  for (let i = 0; i < corpus.length - 1; i++) {
    const a = corpus[i];
    const row = counts.get(a) ?? new Map<string, number>();
    row.set(corpus[i + 1], (row.get(corpus[i + 1]) ?? 0) + 1);
    counts.set(a, row);
  }
  const nextChar = (prev: string) => {
    const row = counts.get(prev);
    if (!row) return " ";
    let total = 0;
    for (const v of row.values()) total += v;
    let x = rand() * total;
    for (const [ch, v] of row) {
      x -= v;
      if (x <= 0) return ch;
    }
    return " ";
  };
  const chars: string[] = new Array(g.cols * g.rows).fill(" ");
  const born = new Float32Array(g.cols * g.rows).fill(-99);
  // Start with the screen mostly written, as if it had been typing a while.
  let prev = "t";
  let cursor = (g.rows - 2) * g.cols;
  for (let i = 0; i < cursor; i++) {
    prev = nextChar(prev);
    chars[i] = prev;
  }
  let t = 0;
  let acc = 0;

  return {
    step(dt) {
      t += dt;
      acc += dt;
      while (acc > 0.045) {
        acc -= 0.045;
        prev = nextChar(prev);
        chars[cursor] = prev;
        born[cursor] = t;
        cursor++;
        if (cursor >= chars.length) {
          // Scroll up one line.
          chars.copyWithin(0, g.cols);
          born.copyWithin(0, g.cols);
          chars.fill(" ", chars.length - g.cols);
          born.fill(-99, born.length - g.cols);
          cursor -= g.cols;
        }
      }
    },
    sample(c, r, out) {
      const i = r * g.cols + c;
      out.hue = 32;
      if (i === cursor) {
        out.ch = "█";
        out.v = Math.sin(t * 8) > 0 ? 1 : 0.2;
        return;
      }
      const ch = chars[i];
      out.ch = ch === " " ? null : ch;
      out.v = ch === " " ? 0 : 0.4 + 0.6 * Math.exp(-(t - born[i]) * 2.5);
    },
  };
};

/** Fallback: drifting interference pattern. */
const plasma: SceneFactory = (g) => {
  let t = 0;
  return {
    step(dt) {
      t += dt;
    },
    sample(c, r, out) {
      const x = c / g.cols;
      const y = (r * g.aspect) / g.cols;
      const v =
        Math.sin(x * 9 + t) + Math.sin(y * 11 - t * 0.7) + Math.sin((x + y) * 7 + t * 0.4);
      out.v = Math.max(0, v / 3);
      out.hue = 200 + 60 * Math.sin(t * 0.2 + x * 2);
      out.ch = null;
    },
  };
};

const SCENES: Record<string, SceneFactory> = {
  ...TOOL_SCENES,
  "game-of-life": gameOfLife,
  emergence: fireflies,
  "embedding-explorer": embeddings,
  "fourier-sketch": fourier,
  "optimizer-racetrack": optimizers,
  "steering-llms": steering,
  rusenizer: tokenizer,
  "sentence-surgeon": maskedLm,
  "rusen-gram": ngram,
};

export function createScene(id: string, grid: Grid, seed: number): Scene {
  return (SCENES[id] ?? plasma)(grid, mulberry32(seed));
}

export function hasScene(id: string): boolean {
  return id in SCENES;
}
