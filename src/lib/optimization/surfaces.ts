/**
 * Six 2-D test surfaces used by both gradient and non-gradient demos.
 *
 * Each surface exposes:
 *   - f(x, y): the loss to minimise
 *   - grad(x, y): the analytical gradient (only defined where it exists)
 *   - domain: a square box [-r, r] × [-r, r] that frames it nicely
 *   - global minimum (for the "did it converge" indicator)
 */

export type Surface = {
  id: SurfaceId;
  name: string;
  blurb: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  domain: number; // half-extent — surface is shown over [-d, d] × [-d, d]
  globalMin: { x: number; y: number; f: number };
  /** Whether the loss value is best displayed on a log scale. */
  logScale?: boolean;
};

export type SurfaceId =
  | "bowl"
  | "rosenbrock"
  | "saddle"
  | "himmelblau"
  | "rastrigin"
  | "ackley";

const TWO_PI = 2 * Math.PI;

export const SURFACES: Record<SurfaceId, Surface> = {
  bowl: {
    id: "bowl",
    name: "Bowl",
    blurb:
      "A clean convex paraboloid f(x,y) = x² + y². Every gradient method should sail straight to the bottom — this is the sanity-check surface.",
    f: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
    domain: 5,
    globalMin: { x: 0, y: 0, f: 0 },
  },

  rosenbrock: {
    id: "rosenbrock",
    name: "Rosenbrock",
    blurb:
      "The classic banana valley f(x,y) = (1 - x)² + 100·(y - x²)². The valley floor is curved and ill-conditioned: vanilla gradient descent zig-zags forever; momentum and Adam cope much better.",
    f: (x, y) => {
      const a = 1 - x;
      const b = y - x * x;
      return a * a + 100 * b * b;
    },
    grad: (x, y) => {
      const b = y - x * x;
      return [-2 * (1 - x) - 400 * x * b, 200 * b];
    },
    domain: 2.2,
    globalMin: { x: 1, y: 1, f: 0 },
    logScale: true,
  },

  saddle: {
    id: "saddle",
    name: "Saddle",
    blurb:
      "f(x,y) = x² − y² has a saddle point at the origin: minimum along x, maximum along y. Plain gradient descent can stall here when the ball lands directly on the ridge.",
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
    domain: 3,
    globalMin: { x: 0, y: Infinity, f: -Infinity },
  },

  himmelblau: {
    id: "himmelblau",
    name: "Himmelblau",
    blurb:
      "Four equally good global minima: f(x,y) = (x² + y − 11)² + (x + y² − 7)². A great way to see how starting position decides which basin you fall into.",
    f: (x, y) => {
      const a = x * x + y - 11;
      const b = x + y * y - 7;
      return a * a + b * b;
    },
    grad: (x, y) => {
      const a = x * x + y - 11;
      const b = x + y * y - 7;
      return [4 * x * a + 2 * b, 2 * a + 4 * y * b];
    },
    domain: 5,
    globalMin: { x: 3, y: 2, f: 0 },
    logScale: true,
  },

  rastrigin: {
    id: "rastrigin",
    name: "Rastrigin",
    blurb:
      "Convex bowl + cosine ripples: f(x,y) = 20 + x² + y² − 10·(cos(2πx) + cos(2πy)). Riddled with local minima — gradient methods get stuck immediately, but PSO and GA do much better.",
    f: (x, y) =>
      20 +
      x * x +
      y * y -
      10 * (Math.cos(TWO_PI * x) + Math.cos(TWO_PI * y)),
    grad: (x, y) => [
      2 * x + 10 * TWO_PI * Math.sin(TWO_PI * x),
      2 * y + 10 * TWO_PI * Math.sin(TWO_PI * y),
    ],
    domain: 5,
    globalMin: { x: 0, y: 0, f: 0 },
  },

  ackley: {
    id: "ackley",
    name: "Ackley",
    blurb:
      "A nearly-flat plateau punched by a needle-thin global basin. Without a coarse global search a local method will sit on the plateau forever; the gradient there is essentially zero.",
    f: (x, y) => {
      const r = Math.sqrt(0.5 * (x * x + y * y));
      const term1 = -20 * Math.exp(-0.2 * r);
      const term2 = -Math.exp(0.5 * (Math.cos(TWO_PI * x) + Math.cos(TWO_PI * y)));
      return term1 + term2 + 20 + Math.E;
    },
    grad: (x, y) => {
      // Numerical gradient — analytic form is nasty and we only use this
      // for pedagogical purposes. Central differences with h=1e-4 are
      // plenty accurate on Ackley at this scale.
      const h = 1e-4;
      const f = SURFACES.ackley.f;
      const gx = (f(x + h, y) - f(x - h, y)) / (2 * h);
      const gy = (f(x, y + h) - f(x, y - h)) / (2 * h);
      return [gx, gy];
    },
    domain: 5,
    globalMin: { x: 0, y: 0, f: 0 },
  },
};

export const SURFACE_LIST: ReadonlyArray<Surface> = Object.values(SURFACES);
