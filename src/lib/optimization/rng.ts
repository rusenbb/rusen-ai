import type { Vector } from "./types";

export interface SeededRng {
  next: () => number;
  normal: () => number;
  int: (min: number, max: number) => number;
}

export function createRng(seed: number): SeededRng {
  let state = seed >>> 0;
  let normalSpare: number | null = null;

  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    normal: () => {
      if (normalSpare !== null) {
        const spare = normalSpare;
        normalSpare = null;
        return spare;
      }

      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const magnitude = Math.sqrt(-2 * Math.log(u));
      const angle = 2 * Math.PI * v;
      normalSpare = magnitude * Math.sin(angle);
      return magnitude * Math.cos(angle);
    },
    int: (min: number, max: number) =>
      Math.floor(next() * (max - min + 1)) + min,
  };
}

export function sampleGaussian2D(
  rng: SeededRng,
  mean: Vector,
  covariance: readonly [number, number, number],
): Vector {
  const [a, b, c] = covariance;
  const trace = a + c;
  const determinant = a * c - b * b;
  const discriminant = Math.max(0, trace * trace * 0.25 - determinant);
  const lambda1 = Math.max(1e-6, trace * 0.5 + Math.sqrt(discriminant));
  const lambda2 = Math.max(1e-6, trace * 0.5 - Math.sqrt(discriminant));
  const axisA =
    Math.abs(b) > 1e-9
      ? [lambda1 - c, b]
      : Math.abs(a) >= Math.abs(c)
        ? [1, 0]
        : [0, 1];
  const normAxis = Math.hypot(axisA[0], axisA[1]) || 1;
  const u = [axisA[0] / normAxis, axisA[1] / normAxis];
  const v = [-u[1], u[0]];
  const z1 = rng.normal();
  const z2 = rng.normal();

  return [
    (mean[0] ?? 0) + u[0] * Math.sqrt(lambda1) * z1 + v[0] * Math.sqrt(lambda2) * z2,
    (mean[1] ?? 0) + u[1] * Math.sqrt(lambda1) * z1 + v[1] * Math.sqrt(lambda2) * z2,
  ];
}
