import type { Domain2D, Projection2D, Vector } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampPointToDomain(point: Vector, domain: Domain2D): Vector {
  return [
    clamp(point[0] ?? 0, domain.x[0], domain.x[1]),
    clamp(point[1] ?? 0, domain.y[0], domain.y[1]),
  ];
}

export function addVectors(a: Vector, b: Vector): Vector {
  return a.map((value, index) => value + (b[index] ?? 0));
}

export function subtractVectors(a: Vector, b: Vector): Vector {
  return a.map((value, index) => value - (b[index] ?? 0));
}

export function scaleVector(vector: Vector, scalar: number): Vector {
  return vector.map((value) => value * scalar);
}

export function dotProduct(a: Vector, b: Vector): number {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}

export function norm(vector: Vector): number {
  return Math.sqrt(dotProduct(vector, vector));
}

export function distance(a: Vector, b: Vector): number {
  return norm(subtractVectors(a, b));
}

export function meanVector(points: Vector[]): Vector {
  if (points.length === 0) return [];

  const totals = new Array(points[0]?.length ?? 0).fill(0);
  for (const point of points) {
    for (let index = 0; index < totals.length; index += 1) {
      totals[index] += point[index] ?? 0;
    }
  }

  return totals.map((value) => value / points.length);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function mapToRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (Math.abs(inMax - inMin) < 1e-9) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function createGrid(
  domain: Domain2D,
  resolution: number,
): { xValues: number[]; yValues: number[] } {
  const xValues = new Array(resolution);
  const yValues = new Array(resolution);

  for (let index = 0; index < resolution; index += 1) {
    const t = resolution === 1 ? 0 : index / (resolution - 1);
    xValues[index] = lerp(domain.x[0], domain.x[1], t);
    yValues[index] = lerp(domain.y[0], domain.y[1], t);
  }

  return { xValues, yValues };
}

export function rotate2D(point: Vector, radians: number): Vector {
  const x = point[0] ?? 0;
  const y = point[1] ?? 0;
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [x * c - y * s, x * s + y * c];
}

export function unitVector(vector: Vector): Vector {
  const length = norm(vector);
  if (length < 1e-9) {
    return vector.map(() => 0);
  }
  return scaleVector(vector, 1 / length);
}

export function orthonormalize(axisA: Vector, axisB: Vector): Projection2D {
  const a = unitVector(axisA);
  const bProjected = subtractVectors(axisB, scaleVector(a, dotProduct(axisB, a)));
  const b = unitVector(bProjected);
  return { axisA: a, axisB: b };
}

export function projectTo2D(point: Vector, projection: Projection2D): Vector {
  return [
    dotProduct(point, projection.axisA),
    dotProduct(point, projection.axisB),
  ];
}

export function covarianceSpread(points: Vector[]): number {
  if (points.length === 0) return 0;
  const center = meanVector(points);
  const distances = points.map((point) => distance(point, center));
  return distances.reduce((sum, value) => sum + value, 0) / distances.length;
}

export function eigenDecomposition2x2(matrix: readonly [number, number, number]): {
  radii: readonly [number, number];
  axisA: Vector;
  axisB: Vector;
} {
  const [a, b, c] = matrix;
  const trace = a + c;
  const determinant = a * c - b * b;
  const discriminant = Math.max(0, trace * trace * 0.25 - determinant);
  const lambda1 = trace * 0.5 + Math.sqrt(discriminant);
  const lambda2 = trace * 0.5 - Math.sqrt(discriminant);

  const axisA =
    Math.abs(b) > 1e-9
      ? unitVector([lambda1 - c, b])
      : Math.abs(a) >= Math.abs(c)
        ? [1, 0]
        : [0, 1];
  const axisB = [-axisA[1], axisA[0]];

  return {
    radii: [Math.sqrt(Math.max(lambda1, 1e-6)), Math.sqrt(Math.max(lambda2, 1e-6))],
    axisA,
    axisB,
  };
}

export function coordinateNoise(x: number, y: number, seed = 0): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 31.17) * 43758.5453;
  return value - Math.floor(value);
}

export function generateLogSpectrum(
  dimension: number,
  minValue: number,
  maxValue: number,
): number[] {
  const values = new Array(dimension);
  const minLog = Math.log(minValue);
  const maxLog = Math.log(maxValue);

  for (let index = 0; index < dimension; index += 1) {
    const t = dimension === 1 ? 0 : index / (dimension - 1);
    values[index] = Math.exp(lerp(minLog, maxLog, t));
  }

  return values;
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(1);
  }
  return value.toFixed(2);
}
