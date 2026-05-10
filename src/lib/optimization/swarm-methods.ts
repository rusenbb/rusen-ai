/**
 * Four non-gradient (population-based / metaheuristic) methods.
 * Each returns a list of frames; each frame is the position of every
 * individual in the population at that generation.
 */

import type { Surface } from "./surfaces";

export type SwarmAlgoId = "pso" | "ga" | "sa" | "de";

export interface SwarmAlgo {
  id: SwarmAlgoId;
  name: string;
  /** Long-form essay block (the non-gradient section is essay-heavy by design). */
  essay: string;
  /** One-line characterisation shown above the demo. */
  tagline: string;
}

export const SWARM_ALGOS: Record<SwarmAlgoId, SwarmAlgo> = {
  pso: {
    id: "pso",
    name: "Particle Swarm Optimization",
    tagline: "Social swarm — particles get pulled toward their own best and the swarm's best.",
    essay: `Particle Swarm Optimization (PSO), introduced by Kennedy and Eberhart in 1995, draws its metaphor from flocks of birds and schools of fish. A swarm of N particles drifts through the search space; each particle remembers the best position it has personally found (its **pbest**), and the swarm collectively tracks the best position any particle has ever visited (the **gbest**).

Each step, every particle updates its velocity using two attractive pulls: a random pull toward its own pbest and a random pull toward gbest, plus an inertial term that preserves its current direction:

  v ← w·v + c₁·r₁·(pbest − x) + c₂·r₂·(gbest − x)
  x ← x + v

The cognitive coefficient c₁ controls trust-in-yourself; the social coefficient c₂ controls trust-in-the-swarm. Both r₁ and r₂ are uniform random in [0, 1], so even with the same coefficients each particle moves differently. The inertia w controls how much momentum is preserved — too high and the swarm overshoots; too low and it converges prematurely.

PSO has no gradient computation at all — only function evaluations. That makes it work on the kind of nasty multimodal surfaces where gradient methods get pinned to the nearest local minimum. The trade-off is that you need a population (typically 20–50 particles) and many evaluations per particle, so it is far more expensive per "good answer" than gradient descent on a smooth surface.`,
  },

  ga: {
    id: "ga",
    name: "Genetic Algorithm",
    tagline: "Evolutionary search — selection, crossover, mutation, repeat.",
    essay: `Genetic Algorithms (GAs) borrow the four engines of biological evolution: a **population** of candidate solutions, a **fitness** function that ranks them, **selection** that picks parents proportional to fitness, **crossover** that mixes two parents into a child, and **mutation** that occasionally perturbs a child at random.

For continuous optimisation we represent each individual as the vector (x, y). Each generation:

  1. Score every individual: fitness = −f(x, y) (lower loss is fitter).
  2. Select parents — tournament selection works well: pick a few at random, keep the best.
  3. Crossover two parents — for real values, an arithmetic mean weighted by a random α works; one of several BLX-α variants is the classic choice.
  4. Mutate the child by adding Gaussian noise scaled by a small mutation rate.
  5. Build the next generation from those children, optionally keeping a few **elite** copies of the best individual unchanged so the best fitness can never go down.

GAs explore much more broadly than gradient methods because mutation injects diversity at every step. They struggle to fine-tune the last decimal of precision — once the population has converged, mutation is the only force pushing for improvement, and it is undirected. In practice GAs are a great way to generate good starting points for a local optimiser; the **memetic** GA literature is exactly that hybrid.`,
  },

  sa: {
    id: "sa",
    name: "Simulated Annealing",
    tagline: "Single agent that occasionally accepts worse moves; the willingness cools over time.",
    essay: `Simulated Annealing (SA) was introduced by Kirkpatrick, Gelatt, and Vecchi in 1983 as a direct analogy to slowly cooling a metal so its atoms can settle into a low-energy crystalline state. A single point wanders the search space. At each step:

  1. Propose a small random move: x' = x + N(0, σ).
  2. Compute Δ = f(x') − f(x).
  3. If Δ ≤ 0 (the proposal improved), always accept.
  4. Otherwise, accept with probability exp(−Δ / T), where T is the **temperature**.
  5. Cool the temperature: T ← α·T (α slightly less than 1, e.g. 0.995).

When T is high, almost all uphill moves are accepted: the walker is doing a random walk and exploring widely. As T cools, the walker becomes increasingly greedy, eventually behaving like local search. The mathematical magic is that with a sufficiently slow cooling schedule, SA is provably guaranteed to converge to the global optimum — but "sufficiently slow" can mean an absurdly long schedule in practice.

SA is the only method on this page that runs a **single** agent rather than a population, so it is very cheap per step. That makes it the natural choice when each function evaluation is expensive (think: training a small model to score a hyperparameter).`,
  },

  de: {
    id: "de",
    name: "Differential Evolution",
    tagline: "Population method that mutates by combining other individuals' coordinates.",
    essay: `Differential Evolution (DE), proposed by Storn and Price in 1997, replaces the GA's crossover-then-mutate pipeline with a single elegant operator. For each individual x in the population, you pick three other random individuals a, b, c, and form a **trial vector**:

  v = a + F · (b − c)

where F (typically 0.5–0.9) scales the difference. The trial is then crossed with x at each coordinate independently with probability CR, producing a candidate. If the candidate has lower loss than x, it replaces x; otherwise x stays. That's the entire algorithm.

The trick is that the difference vector (b − c) is automatically scaled to whatever the current population covers. Early on, when the population is spread across the whole domain, the differences are big and DE explores aggressively. As the population converges, the differences shrink, and DE seamlessly transitions into fine local search — without any explicit cooling schedule. This adaptiveness is why DE is one of the best general-purpose continuous optimisers and consistently wins blackbox optimisation competitions.

Compared to GA, DE has fewer hyperparameters (just F and CR) and tends to be more robust. Compared to PSO, it converges faster on smoother problems but can get stuck on highly multimodal surfaces if F is too low.`,
  },
};

export const SWARM_ALGO_LIST: ReadonlyArray<SwarmAlgo> = Object.values(SWARM_ALGOS);

export type Population = { x: number; y: number; f: number }[];
/** A frame is the entire population at one generation. */
export type SwarmTrace = Population[];

export interface SwarmHyper {
  /** Population size (single agent for SA). */
  popSize: number;
  /** Generations to run. */
  generations: number;
  /** PSO inertia. */
  inertia: number;
  /** PSO cognitive / GA mutation rate / DE F / SA initial temperature. */
  k1: number;
  /** PSO social / GA crossover rate / DE CR / SA cooling rate. */
  k2: number;
}

export const DEFAULT_SWARM_HYPER: SwarmHyper = {
  popSize: 30,
  generations: 60,
  inertia: 0.6,
  k1: 1.6,
  k2: 1.6,
};

// Mulberry32 — a tiny seedable PRNG for reproducible swarm runs.
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface SwarmRunOpts {
  surface: Surface;
  algo: SwarmAlgoId;
  hyper?: Partial<SwarmHyper>;
  seed?: number;
}

export function runSwarm(opts: SwarmRunOpts): SwarmTrace {
  const { surface, algo } = opts;
  const h = { ...DEFAULT_SWARM_HYPER, ...(opts.hyper ?? {}) };
  const seed = opts.seed ?? 1;
  const rng = mulberry32(seed);
  const D = surface.domain;
  const sample = () => (rng() * 2 - 1) * D;

  if (algo === "sa") return runSA(surface, h, rng);
  if (algo === "pso") return runPSO(surface, h, rng, sample);
  if (algo === "ga") return runGA(surface, h, rng, sample);
  return runDE(surface, h, rng, sample);
}

// ─────────────────────────────────────────────────────────────────────────────
// PSO
function runPSO(
  surface: Surface,
  h: SwarmHyper,
  rng: () => number,
  sample: () => number,
): SwarmTrace {
  const N = h.popSize;
  const D = surface.domain;
  const pos = Array.from({ length: N }, () => ({ x: sample(), y: sample() }));
  const vel = Array.from({ length: N }, () => ({
    x: (rng() - 0.5) * D * 0.2,
    y: (rng() - 0.5) * D * 0.2,
  }));
  const pbest = pos.map((p) => ({ x: p.x, y: p.y, f: surface.f(p.x, p.y) }));
  let gbest = pbest.reduce((a, b) => (b.f < a.f ? b : a));
  const trace: SwarmTrace = [pos.map((p) => ({ x: p.x, y: p.y, f: surface.f(p.x, p.y) }))];

  for (let g = 0; g < h.generations; g++) {
    for (let i = 0; i < N; i++) {
      const r1 = rng();
      const r2 = rng();
      vel[i].x =
        h.inertia * vel[i].x +
        h.k1 * r1 * (pbest[i].x - pos[i].x) +
        h.k2 * r2 * (gbest.x - pos[i].x);
      vel[i].y =
        h.inertia * vel[i].y +
        h.k1 * r1 * (pbest[i].y - pos[i].y) +
        h.k2 * r2 * (gbest.y - pos[i].y);

      pos[i].x = clamp(pos[i].x + vel[i].x, -D, D);
      pos[i].y = clamp(pos[i].y + vel[i].y, -D, D);

      const fi = surface.f(pos[i].x, pos[i].y);
      if (fi < pbest[i].f) {
        pbest[i] = { x: pos[i].x, y: pos[i].y, f: fi };
        if (fi < gbest.f) gbest = pbest[i];
      }
    }
    trace.push(pos.map((p) => ({ x: p.x, y: p.y, f: surface.f(p.x, p.y) })));
  }
  return trace;
}

// ─────────────────────────────────────────────────────────────────────────────
// GA
function runGA(
  surface: Surface,
  h: SwarmHyper,
  rng: () => number,
  sample: () => number,
): SwarmTrace {
  const N = h.popSize;
  const D = surface.domain;
  const mutationRate = 0.25;
  const eliteCount = 2;

  let pop = Array.from({ length: N }, () => {
    const x = sample();
    const y = sample();
    return { x, y, f: surface.f(x, y) };
  });
  const trace: SwarmTrace = [pop.map((p) => ({ ...p }))];

  const tournament = (k = 3) => {
    let best = pop[Math.floor(rng() * N)];
    for (let i = 1; i < k; i++) {
      const c = pop[Math.floor(rng() * N)];
      if (c.f < best.f) best = c;
    }
    return best;
  };

  for (let g = 0; g < h.generations; g++) {
    const sorted = [...pop].sort((a, b) => a.f - b.f);
    const next = sorted.slice(0, eliteCount).map((p) => ({ ...p }));
    while (next.length < N) {
      const p1 = tournament();
      const p2 = tournament();
      // BLX-like blend
      const a = rng();
      let cx = a * p1.x + (1 - a) * p2.x;
      let cy = a * p1.y + (1 - a) * p2.y;
      if (rng() < mutationRate) cx += gauss(rng) * D * 0.15;
      if (rng() < mutationRate) cy += gauss(rng) * D * 0.15;
      cx = clamp(cx, -D, D);
      cy = clamp(cy, -D, D);
      next.push({ x: cx, y: cy, f: surface.f(cx, cy) });
    }
    pop = next;
    trace.push(pop.map((p) => ({ ...p })));
  }
  return trace;
}

// ─────────────────────────────────────────────────────────────────────────────
// SA — single agent. We render a 1-element "population" each frame plus a
// dim trail of the recent positions so the user sees the walk.
function runSA(surface: Surface, h: SwarmHyper, rng: () => number): SwarmTrace {
  const D = surface.domain;
  let x = (rng() * 2 - 1) * D;
  let y = (rng() * 2 - 1) * D;
  let fcur = surface.f(x, y);
  // Initial T so that even a Δ on the order of the surface's range has a
  // reasonable acceptance probability early on.
  let T = h.k1; // the user-controlled knob; sane default ~1.6
  const cooling = h.k2 < 1 ? h.k2 : 0.97; // accept either form
  const sigma = D * 0.15;

  // Pretend population: we use one "leader" + a synthetic trail of the last
  // few accepted states so the dot doesn't look lonely on the plot.
  const TRAIL = 8;
  const trail: { x: number; y: number; f: number }[] = [];
  const totalSteps = h.popSize * h.generations; // borrow knobs to scale length
  const trace: SwarmTrace = [];

  for (let t = 0; t < totalSteps; t++) {
    const px = clamp(x + gauss(rng) * sigma, -D, D);
    const py = clamp(y + gauss(rng) * sigma, -D, D);
    const fp = surface.f(px, py);
    const dE = fp - fcur;
    if (dE <= 0 || rng() < Math.exp(-dE / Math.max(T, 1e-6))) {
      x = px;
      y = py;
      fcur = fp;
      trail.push({ x, y, f: fcur });
      if (trail.length > TRAIL) trail.shift();
    }
    T *= cooling;
    if (t % Math.max(1, Math.floor(totalSteps / h.generations)) === 0) {
      trace.push([
        ...trail.map((p) => ({ ...p })),
        { x, y, f: fcur },
      ]);
    }
  }
  if (trace.length === 0) trace.push([{ x, y, f: fcur }]);
  return trace;
}

// ─────────────────────────────────────────────────────────────────────────────
// DE — Differential Evolution (rand/1/bin)
function runDE(
  surface: Surface,
  h: SwarmHyper,
  rng: () => number,
  sample: () => number,
): SwarmTrace {
  const N = Math.max(4, h.popSize); // DE needs at least 4 distinct individuals
  const D = surface.domain;
  const F = clamp(h.k1, 0.2, 1.5);
  const CR = clamp(h.k2 / 2.5, 0.2, 0.95); // map the shared knob to [0.2, 0.95]

  let pop = Array.from({ length: N }, () => {
    const x = sample();
    const y = sample();
    return { x, y, f: surface.f(x, y) };
  });
  const trace: SwarmTrace = [pop.map((p) => ({ ...p }))];

  for (let g = 0; g < h.generations; g++) {
    const next = pop.map((target, i) => {
      // Pick three distinct indices a, b, c not equal to i
      let a = i,
        b = i,
        c = i;
      while (a === i) a = Math.floor(rng() * N);
      while (b === i || b === a) b = Math.floor(rng() * N);
      while (c === i || c === a || c === b) c = Math.floor(rng() * N);
      const A = pop[a],
        B = pop[b],
        C = pop[c];
      const vx = A.x + F * (B.x - C.x);
      const vy = A.y + F * (B.y - C.y);
      // Binomial crossover, force at least one component of v to enter trial
      const force = Math.floor(rng() * 2);
      const tx = rng() < CR || force === 0 ? clamp(vx, -D, D) : target.x;
      const ty = rng() < CR || force === 1 ? clamp(vy, -D, D) : target.y;
      const ft = surface.f(tx, ty);
      return ft < target.f ? { x: tx, y: ty, f: ft } : target;
    });
    pop = next;
    trace.push(pop.map((p) => ({ ...p })));
  }
  return trace;
}

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
