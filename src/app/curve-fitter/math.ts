export type CurveKind = "wave" | "arc";
export type ClassificationKind = "xor" | "circles" | "line";
export type HiddenActivation = "linear" | "tanh";

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

export interface ClassificationPoint {
  x: number;
  y: number;
  label: 0 | 1;
}

export interface TinyNetwork {
  activation: HiddenActivation;
  w1: number[][];
  b1: number[];
  w2: number[];
  b2: number;
  loss: number;
}

export interface TinyNetworkTrainingOptions {
  hiddenSize?: number;
  epochs?: number;
  learningRate?: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state / 0x100000000;
  };
}

export function createRegressionDataset(kind: CurveKind): RegressionPoint[] {
  const random = seededRandom(kind === "wave" ? 18 : 73);
  return Array.from({ length: 34 }, (_, index) => {
    const x = -1.15 + (index / 33) * 2.3;
    const clean = kind === "wave" ? 0.56 * Math.sin(x * 3.4) + 0.18 * x : 0.72 * x * x - 0.28 * x - 0.34;
    const y = clean + (random() - 0.5) * 0.18;
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

export function createClassificationDataset(kind: ClassificationKind): ClassificationPoint[] {
  const random = seededRandom(kind === "xor" ? 11 : kind === "circles" ? 33 : 55);
  const points: ClassificationPoint[] = [];

  if (kind === "xor") {
    const centers: Array<[number, number, 0 | 1]> = [
      [-0.62, -0.62, 1],
      [-0.62, 0.62, 0],
      [0.62, -0.62, 0],
      [0.62, 0.62, 1],
    ];
    centers.forEach(([x, y, label]) => {
      for (let index = 0; index < 16; index++) {
        points.push({
          x: x + (random() - 0.5) * 0.35,
          y: y + (random() - 0.5) * 0.35,
          label,
        });
      }
    });
    return points;
  }

  if (kind === "circles") {
    for (let index = 0; index < 80; index++) {
      const outer = index % 2 === 0;
      const angle = random() * Math.PI * 2;
      const radius = (outer ? 0.75 : 0.32) + (random() - 0.5) * 0.12;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        label: outer ? 1 : 0,
      });
    }
    return points;
  }

  for (let index = 0; index < 80; index++) {
    const x = random() * 1.8 - 0.9;
    const y = random() * 1.8 - 0.9;
    points.push({ x, y, label: x + 0.4 * y > 0 ? 1 : 0 });
  }
  return points;
}

function sigmoid(value: number): number {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function activate(value: number, activation: HiddenActivation): number {
  return activation === "tanh" ? Math.tanh(value) : value;
}

function activationDerivative(value: number, activation: HiddenActivation): number {
  return activation === "tanh" ? 1 - value * value : 1;
}

export function inspectHiddenLayer(
  network: Pick<TinyNetwork, "activation" | "w1" | "b1">,
  point: ClassificationPoint | { x: number; y: number },
) {
  const preActivations = network.w1.map(
    (weights, index) => weights[0] * point.x + weights[1] * point.y + network.b1[index],
  );
  const activations = preActivations.map((value) => activate(value, network.activation));
  return { preActivations, activations };
}

function forward(network: Omit<TinyNetwork, "loss">, point: ClassificationPoint | { x: number; y: number }) {
  const { activations: hidden } = inspectHiddenLayer(network, point);
  const logit = hidden.reduce((total, value, index) => total + value * network.w2[index], network.b2);
  return { hidden, probability: sigmoid(logit) };
}

function cloneTinyNetwork(network: TinyNetwork): TinyNetwork {
  return {
    activation: network.activation,
    w1: network.w1.map((weights) => [...weights]),
    b1: [...network.b1],
    w2: [...network.w2],
    b2: network.b2,
    loss: network.loss,
  };
}

export function networkLoss(
  points: ClassificationPoint[],
  network: Omit<TinyNetwork, "loss">,
): number {
  if (points.length === 0) return 0;
  return points.reduce((total, point) => {
    const probability = Math.min(1 - 1e-7, Math.max(1e-7, forward(network, point).probability));
    return total - point.label * Math.log(probability) - (1 - point.label) * Math.log(1 - probability);
  }, 0) / points.length;
}

export function initializeTinyNetwork(
  points: ClassificationPoint[],
  activation: HiddenActivation,
  options: Pick<TinyNetworkTrainingOptions, "hiddenSize"> = {},
): TinyNetwork {
  const hiddenSize = options.hiddenSize ?? 5;
  const random = seededRandom(105);
  const network = {
    activation,
    w1: Array.from({ length: hiddenSize }, () => [random() * 1.4 - 0.7, random() * 1.4 - 0.7]),
    b1: Array.from({ length: hiddenSize }, () => random() * 0.2 - 0.1),
    w2: Array.from({ length: hiddenSize }, () => random() * 1.4 - 0.7),
    b2: 0,
  };

  return { ...network, loss: networkLoss(points, network) };
}

export function stepTinyNetwork(
  points: ClassificationPoint[],
  network: TinyNetwork,
  options: Pick<TinyNetworkTrainingOptions, "learningRate"> = {},
): TinyNetwork {
  const learningRate = options.learningRate ?? 0.18;
  const hiddenSize = network.w1.length;
  const gradientW1 = network.w1.map(() => [0, 0]);
  const gradientB1 = network.b1.map(() => 0);
  const gradientW2 = network.w2.map(() => 0);
  let gradientB2 = 0;

  for (const point of points) {
    const { hidden, probability } = forward(network, point);
    const outputGradient = probability - point.label;
    gradientB2 += outputGradient;

    for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex++) {
      gradientW2[hiddenIndex] += outputGradient * hidden[hiddenIndex];
      const hiddenGradient = outputGradient * network.w2[hiddenIndex] * activationDerivative(hidden[hiddenIndex], network.activation);
      gradientW1[hiddenIndex][0] += hiddenGradient * point.x;
      gradientW1[hiddenIndex][1] += hiddenGradient * point.y;
      gradientB1[hiddenIndex] += hiddenGradient;
    }
  }

  const next = cloneTinyNetwork(network);
  const scale = points.length === 0 ? 0 : learningRate / points.length;
  for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex++) {
    next.w1[hiddenIndex][0] -= scale * gradientW1[hiddenIndex][0];
    next.w1[hiddenIndex][1] -= scale * gradientW1[hiddenIndex][1];
    next.b1[hiddenIndex] -= scale * gradientB1[hiddenIndex];
    next.w2[hiddenIndex] -= scale * gradientW2[hiddenIndex];
  }
  next.b2 -= scale * gradientB2;
  next.loss = networkLoss(points, next);
  return next;
}

export function createTinyNetworkTrainingTrace(
  points: ClassificationPoint[],
  activation: HiddenActivation,
  options: TinyNetworkTrainingOptions = {},
): TinyNetwork[] {
  const epochs = Math.max(0, Math.floor(options.epochs ?? 1800));
  const learningRate = options.learningRate ?? 0.18;
  const trace: TinyNetwork[] = [initializeTinyNetwork(points, activation, options)];

  for (let epoch = 0; epoch < epochs; epoch++) {
    trace.push(stepTinyNetwork(points, trace[trace.length - 1], { learningRate }));
  }

  return trace;
}

export function trainTinyNetwork(
  points: ClassificationPoint[],
  activation: HiddenActivation,
  options: TinyNetworkTrainingOptions = {},
): TinyNetwork {
  const trace = createTinyNetworkTrainingTrace(points, activation, options);
  return trace[trace.length - 1];
}

export function predictTinyNetwork(network: TinyNetwork, point: { x: number; y: number }): number {
  return forward(network, point).probability;
}

export function predictTinyNetworkWithHiddenCount(
  network: TinyNetwork,
  point: { x: number; y: number },
  hiddenCount: number,
): number {
  const count = Math.max(1, Math.min(network.w2.length, Math.floor(hiddenCount)));
  const { activations } = inspectHiddenLayer(network, point);
  const logit = activations
    .slice(0, count)
    .reduce((total, value, index) => total + value * network.w2[index], network.b2);
  return sigmoid(logit);
}

export function classificationAccuracy(network: TinyNetwork, points: ClassificationPoint[]): number {
  if (points.length === 0) return 0;
  const correct = points.filter(
    (point) => (predictTinyNetwork(network, point) >= 0.5 ? 1 : 0) === point.label,
  ).length;
  return correct / points.length;
}

export function classificationAccuracyWithHiddenCount(
  network: TinyNetwork,
  points: ClassificationPoint[],
  hiddenCount: number,
): number {
  if (points.length === 0) return 0;
  const correct = points.filter(
    (point) => (predictTinyNetworkWithHiddenCount(network, point, hiddenCount) >= 0.5 ? 1 : 0) === point.label,
  ).length;
  return correct / points.length;
}
