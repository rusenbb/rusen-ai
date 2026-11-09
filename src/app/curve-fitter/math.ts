import { createSeededRandom as seededRandom } from "@/lib/random";

export type CurveKind = "wave" | "arc";

export interface RegressionPoint {
  x: number;
  y: number;
  split: "train" | "test";
}

export interface PolynomialTrainingState {
  coefficients: number[];
  epoch: number;
  loss: number;
}

export interface PolynomialTrainingOptions {
  epochs?: number;
  learningRate?: number;
}

export function createRegressionDataset(kind: CurveKind, count = 34, noise = 0.18): RegressionPoint[] {
  const random = seededRandom(kind === "wave" ? 18 : 73);
  return Array.from({ length: count }, (_, index) => {
    const x = -1.15 + (index / (count - 1)) * 2.3;
    const clean = kind === "wave" ? 0.56 * Math.sin(x * 3.4) + 0.18 * x : 0.72 * x * x - 0.28 * x - 0.34;
    const y = clean + (random() - 0.5) * noise;
    return { x, y, split: index % 5 === 0 ? "test" : "train" };
  });
}

export function evaluatePolynomial(coefficients: number[], x: number): number {
  return coefficients.reduce((total, coefficient, index) => total + coefficient * x ** index, 0);
}

function safePolynomialDegree(degree: number): number {
  return Math.max(0, Math.min(8, Math.floor(degree)));
}

function solveSystem(matrix: number[][], values: number[]): number[] {
  const augmented = matrix.map((row, rowIndex) => [...row, values[rowIndex]]);
  const size = augmented.length;

  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-10) return Array.from({ length: size }, () => 0);

    for (let entry = column; entry <= size; entry++) {
      augmented[column][entry] /= divisor;
    }
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const scale = augmented[row][column];
      for (let entry = column; entry <= size; entry++) {
        augmented[row][entry] -= scale * augmented[column][entry];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

export function fitPolynomial(points: RegressionPoint[], degree: number): number[] {
  const safeDegree = safePolynomialDegree(degree);
  const size = safeDegree + 1;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const values = Array.from({ length: size }, () => 0);

  for (const point of points) {
    for (let row = 0; row < size; row++) {
      values[row] += point.y * point.x ** row;
      for (let column = 0; column < size; column++) {
        matrix[row][column] += point.x ** (row + column);
      }
    }
  }
  for (let index = 0; index < size; index++) {
    matrix[index][index] += 1e-8;
  }
  return solveSystem(matrix, values);
}

export function meanSquaredError(points: RegressionPoint[], coefficients: number[]): number {
  if (points.length === 0) return 0;
  return (
    points.reduce((total, point) => {
      const error = evaluatePolynomial(coefficients, point.x) - point.y;
      return total + error * error;
    }, 0) / points.length
  );
}

export function initializePolynomialTraining(
  points: RegressionPoint[],
  degree: number,
): PolynomialTrainingState {
  const coefficients = Array.from({ length: safePolynomialDegree(degree) + 1 }, () => 0);
  return { coefficients, epoch: 0, loss: meanSquaredError(points, coefficients) };
}

export function polynomialGradient(
  points: RegressionPoint[],
  coefficients: number[],
): number[] {
  if (points.length === 0) return Array.from({ length: coefficients.length }, () => 0);

  const gradient = Array.from({ length: coefficients.length }, () => 0);
  for (const point of points) {
    const residual = evaluatePolynomial(coefficients, point.x) - point.y;
    for (let index = 0; index < coefficients.length; index++) {
      gradient[index] += (2 * residual * point.x ** index) / points.length;
    }
  }
  return gradient;
}

export function stepPolynomialTraining(
  points: RegressionPoint[],
  state: PolynomialTrainingState,
  learningRate = 0.12,
): PolynomialTrainingState {
  const gradient = polynomialGradient(points, state.coefficients);
  const coefficients = state.coefficients.map(
    (coefficient, index) => coefficient - learningRate * gradient[index],
  );
  return {
    coefficients,
    epoch: state.epoch + 1,
    loss: meanSquaredError(points, coefficients),
  };
}

export function createPolynomialTrainingTrace(
  points: RegressionPoint[],
  degree: number,
  options: PolynomialTrainingOptions = {},
): PolynomialTrainingState[] {
  const epochs = Math.max(0, Math.floor(options.epochs ?? 1000));
  const learningRate = options.learningRate ?? 0.12;
  const trace: PolynomialTrainingState[] = [initializePolynomialTraining(points, degree)];

  for (let epoch = 0; epoch < epochs; epoch++) {
    trace.push(stepPolynomialTraining(points, trace[trace.length - 1], learningRate));
  }
  return trace;
}
