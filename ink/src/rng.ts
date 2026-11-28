// Seeded randomness. Every drawing is reproducible from its seed.

export type Rng = {
  (): number;
  range(a: number, b: number): number;
  normal(sd?: number): number;
  pick<T>(xs: readonly T[]): T;
  fork(salt: number): Rng;
};

export function rng(seed: number): Rng {
  let s = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  const next = (() => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.range = (a, b) => a + (b - a) * next();
  next.normal = (sd = 1) => {
    const u = Math.max(1e-9, next());
    const v = next();
    return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  next.pick = (xs) => xs[Math.floor(next() * xs.length)];
  next.fork = (salt) => rng(seed * 7919 + salt * 104729 + 17);
  return next;
}

/** Smooth 1D value noise in roughly [-1, 1]. */
export function noise1(seed: number) {
  const r = rng(seed);
  const table = Array.from({ length: 256 }, () => r() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

/** Two octaves of value noise: slow drift plus a little tremor. */
export function tremor(seed: number) {
  const lo = noise1(seed);
  const hi = noise1(seed + 101);
  return (x: number) => lo(x) * 0.8 + hi(x * 3.7) * 0.2;
}

/** Smooth 2D value noise in roughly [-1, 1]. */
export function noise2(seed: number) {
  const r = rng(seed);
  const t = Array.from({ length: 256 * 256 }, () => r() * 2 - 1);
  const g = (i: number, j: number) => t[(i & 255) * 256 + (j & 255)];
  return (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g(i, j) + (g(i + 1, j) - g(i, j)) * sx;
    const b = g(i, j + 1) + (g(i + 1, j + 1) - g(i, j + 1)) * sx;
    return a + (b - a) * sy;
  };
}
