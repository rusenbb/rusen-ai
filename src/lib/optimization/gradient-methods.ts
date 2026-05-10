/**
 * Five gradient-based optimisation algorithms running on a 2-D surface.
 * Each returns a trace of (x, y, loss) frames that the plot animates.
 */

import type { Surface } from "./surfaces";

export type GradAlgoId = "gd" | "sgd" | "momentum" | "rmsprop" | "adam";

export interface GradAlgo {
  id: GradAlgoId;
  name: string;
  /** Plain-language explanation shown in the prose section. */
  blurb: string;
  /** The update rule, in TeX-free notation, for the panel. */
  rule: string;
}

export const GRAD_ALGOS: Record<GradAlgoId, GradAlgo> = {
  gd: {
    id: "gd",
    name: "Gradient Descent",
    blurb:
      "Take a step opposite the slope. Set the learning rate too high and you bounce out of the bowl; too low and you crawl. On ill-conditioned valleys (the Rosenbrock banana, anything elongated) it zig-zags across the narrow direction while creeping along the long one.",
    rule: "x ← x − η · ∇f(x)",
  },
  sgd: {
    id: "sgd",
    name: "Stochastic GD",
    blurb:
      "Real loss landscapes in ML are sums over millions of samples. SGD estimates the gradient from a tiny mini-batch — fast per step, but the gradient is noisy. We simulate that noise here by adding a small Gaussian perturbation to each gradient evaluation. Noise is a feature: it can knock you out of shallow saddles.",
    rule: "x ← x − η · (∇f(x) + ε),  ε ∼ N(0, σ²)",
  },
  momentum: {
    id: "momentum",
    name: "Momentum",
    blurb:
      "Keep a running velocity that integrates the gradient over time. Steep, persistent slopes accelerate the ball; oscillations across a narrow valley mostly cancel. The infamous β=0.9 means the velocity remembers ~10 past steps. This one alone fixes the Rosenbrock zig-zag.",
    rule: "v ← β·v + ∇f(x);   x ← x − η·v",
  },
  rmsprop: {
    id: "rmsprop",
    name: "RMSProp",
    blurb:
      "Per-coordinate adaptive step sizes. Maintain an EMA of the squared gradient and scale each dimension's step by 1/√(that). Coordinates with consistently large gradients get smaller steps; quiet coordinates get larger steps. Helps a lot on surfaces with very different curvatures along different axes.",
    rule: "s ← γ·s + (1−γ)·∇f(x)²;   x ← x − η·∇f(x) / (√s + ε)",
  },
  adam: {
    id: "adam",
    name: "Adam",
    blurb:
      "RMSProp's adaptive scaling fused with momentum's EMA of the gradient itself, plus a bias-correction so the early steps aren't tiny. The default in deep learning for a reason: it is hard to break and tunes itself per-dimension. Watch how it walks confidently along the Rosenbrock floor.",
    rule:
      "m ← β₁·m + (1−β₁)·g;   v ← β₂·v + (1−β₂)·g²;   x ← x − η·m̂ / (√v̂ + ε)",
  },
};

export const GRAD_ALGO_LIST: ReadonlyArray<GradAlgo> = Object.values(GRAD_ALGOS);

export interface GradHyper {
  lr: number;
  /** Momentum / β₁ */
  momentum: number;
  /** RMSProp γ / Adam β₂ */
  decay: number;
  /** SGD noise σ */
  noise: number;
  /** Numerical floor */
  eps: number;
  steps: number;
}

export const DEFAULT_GRAD_HYPER: GradHyper = {
  lr: 0.05,
  momentum: 0.9,
  decay: 0.999,
  noise: 0.4,
  eps: 1e-8,
  steps: 200,
};

export type Frame = { x: number; y: number; f: number };

// Box-Muller Gaussian noise for SGD.
function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface RunOpts {
  surface: Surface;
  algo: GradAlgoId;
  start: { x: number; y: number };
  hyper?: Partial<GradHyper>;
  /** Seeded RNG for reproducible SGD noise. */
  rng?: () => number;
}

export function runGradient(opts: RunOpts): Frame[] {
  const { surface, algo, start } = opts;
  const h = { ...DEFAULT_GRAD_HYPER, ...(opts.hyper ?? {}) };
  const rng = opts.rng ?? Math.random;

  const trace: Frame[] = [];
  let x = start.x;
  let y = start.y;
  let vx = 0,
    vy = 0; // momentum / Adam first moment
  let sx = 0,
    sy = 0; // RMSProp / Adam second moment
  const beta1 = h.momentum;
  const beta2 = h.decay;

  trace.push({ x, y, f: surface.f(x, y) });

  for (let t = 1; t <= h.steps; t++) {
    let [gx, gy] = surface.grad(x, y);
    if (algo === "sgd") {
      gx += h.noise * gauss(rng);
      gy += h.noise * gauss(rng);
    }

    if (algo === "gd" || algo === "sgd") {
      x -= h.lr * gx;
      y -= h.lr * gy;
    } else if (algo === "momentum") {
      vx = beta1 * vx + gx;
      vy = beta1 * vy + gy;
      x -= h.lr * vx;
      y -= h.lr * vy;
    } else if (algo === "rmsprop") {
      sx = beta2 * sx + (1 - beta2) * gx * gx;
      sy = beta2 * sy + (1 - beta2) * gy * gy;
      x -= (h.lr * gx) / (Math.sqrt(sx) + h.eps);
      y -= (h.lr * gy) / (Math.sqrt(sy) + h.eps);
    } else if (algo === "adam") {
      vx = beta1 * vx + (1 - beta1) * gx;
      vy = beta1 * vy + (1 - beta1) * gy;
      sx = beta2 * sx + (1 - beta2) * gx * gx;
      sy = beta2 * sy + (1 - beta2) * gy * gy;
      const mhx = vx / (1 - Math.pow(beta1, t));
      const mhy = vy / (1 - Math.pow(beta1, t));
      const shx = sx / (1 - Math.pow(beta2, t));
      const shy = sy / (1 - Math.pow(beta2, t));
      x -= (h.lr * mhx) / (Math.sqrt(shx) + h.eps);
      y -= (h.lr * mhy) / (Math.sqrt(shy) + h.eps);
    }

    // Hard clamp so a runaway diverging step doesn't blow up the plot.
    const D = surface.domain * 1.5;
    if (!Number.isFinite(x) || x > D || x < -D) x = Math.sign(x || 1) * D;
    if (!Number.isFinite(y) || y > D || y < -D) y = Math.sign(y || 1) * D;

    trace.push({ x, y, f: surface.f(x, y) });
  }

  return trace;
}
