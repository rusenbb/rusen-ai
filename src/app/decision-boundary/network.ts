import { createSeededRandom as seededRandom } from "@/lib/random";

/** A 2-input, one-hidden-layer, 1-output network trained by full-batch gradient descent. */
export type HiddenActivation = "linear" | "tanh";

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
