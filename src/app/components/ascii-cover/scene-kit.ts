/**
 * Shared building blocks for the ASCII cover scenes: the scene contract,
 * a seeded PRNG and a decaying trail buffer most particle scenes draw into.
 *
 * A scene owns its state and exposes two calls per frame: `step` advances the
 * simulation, `sample` reports one cell's brightness (0..1), hue and an
 * optional literal character (used by the text scenes).
 */

export type CellOut = { v: number; hue: number; ch: string | null };

export interface Scene {
  step(dt: number, t: number): void;
  sample(c: number, r: number, out: CellOut): void;
}

/** Grid geometry handed to every scene. `aspect` = cell height / cell width,
 *  so `r * aspect` puts rows in the same unit as columns. */
export type Grid = { cols: number; rows: number; aspect: number };

export type SceneFactory = (g: Grid, rand: () => number) => Scene;

export const TAU = Math.PI * 2;

/** Small deterministic PRNG so a cover looks the same on every first paint. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Brightness + hue buffers with per-frame decay; the shared "trail" canvas
 *  most particle scenes draw into. */
export class TrailBuffer {
  v: Float32Array;
  hue: Float32Array;
  constructor(readonly g: Grid) {
    this.v = new Float32Array(g.cols * g.rows);
    this.hue = new Float32Array(g.cols * g.rows);
  }
  decay(k: number) {
    for (let i = 0; i < this.v.length; i++) this.v[i] *= k;
  }
  /** Plot in column units (y already multiplied by aspect). */
  plot(x: number, y: number, v: number, hue: number) {
    const c = Math.round(x);
    const r = Math.round(y / this.g.aspect);
    if (c < 0 || r < 0 || c >= this.g.cols || r >= this.g.rows) return;
    const i = r * this.g.cols + c;
    if (v >= this.v[i]) {
      this.v[i] = v;
      this.hue[i] = hue;
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, v: number, hue: number) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let k = 0; k <= n; k++) {
      const s = k / n;
      this.plot(x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, v, hue);
    }
  }
  sample(c: number, r: number, out: CellOut) {
    const i = r * this.g.cols + c;
    out.v = this.v[i];
    out.hue = this.hue[i];
    out.ch = null;
  }
}
