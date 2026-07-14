import {
  DIGIT_PIXEL_WIDTH,
  DIGIT_RAW_LABELS,
  DIGIT_RAW_PIXELS,
  DIGIT_SAMPLE_COUNT,
} from "./digits-data";

export type DigitLabel = 3 | 8;

export interface DigitSample {
  sourceIndex: number;
  label: DigitLabel;
  /** Real 8x8 pixel intensities, normalized from the source 0..16 range to 0..1. */
  pixels: number[];
}

export interface DigitSplit {
  training: DigitSample[];
  testing: DigitSample[];
}

export interface TinyDigitClassifier {
  weights: number[];
  bias: number;
  epochs: number;
  trainingLoss: number;
  testAccuracy: number;
}

export interface PixelAttack {
  originalProbabilityOfEight: number;
  attackedProbabilityOfEight: number;
  originalLabel: DigitLabel;
  attackedLabel: DigitLabel;
  pixels: number[];
  perturbation: number[];
  gradient: number[];
  epsilon: number;
}

export const DIGIT_DATASET_DESCRIPTION =
  "Real 8x8 handwritten 3s and 8s from sklearn.datasets.load_digits, a copy of the UCI Optical Recognition of Handwritten Digits data.";

const PIXEL_COUNT = DIGIT_PIXEL_WIDTH * DIGIT_PIXEL_WIDTH;
const DEFAULT_SPLIT_SEED = 20_260_714;
const DEFAULT_EPOCHS = 600;
const DEFAULT_LEARNING_RATE = 0.45;
const DEFAULT_L2 = 0.0005;

let samplesCache: DigitSample[] | null = null;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function sigmoid(value: number): number {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponent = Math.exp(value);
  return exponent / (1 + exponent);
}

function targetFor(label: DigitLabel): 0 | 1 {
  return label === 8 ? 1 : 0;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

export function loadDigitSamples(): DigitSample[] {
  if (samplesCache) return samplesCache;
  if (DIGIT_RAW_LABELS.length !== DIGIT_SAMPLE_COUNT || DIGIT_RAW_PIXELS.length !== DIGIT_SAMPLE_COUNT * PIXEL_COUNT) {
    throw new Error("The bundled digit data has inconsistent dimensions.");
  }

  samplesCache = Array.from({ length: DIGIT_SAMPLE_COUNT }, (_, sourceIndex) => {
    const rawLabel = DIGIT_RAW_LABELS[sourceIndex];
    if (rawLabel !== 3 && rawLabel !== 8) {
      throw new Error("The bundled Pixel Nudge data must contain only 3s and 8s.");
    }
    const offset = sourceIndex * PIXEL_COUNT;
    return {
      sourceIndex,
      label: rawLabel,
      pixels: Array.from(DIGIT_RAW_PIXELS.slice(offset, offset + PIXEL_COUNT), (value) => value / 16),
    };
  });
  return samplesCache;
}

/** A deterministic, label-balanced 75/25 split of every bundled real sample. */
export function createDigitSplit(seed = DEFAULT_SPLIT_SEED): DigitSplit {
  const random = seededRandom(seed);
  const samples = loadDigitSamples();
  const training: DigitSample[] = [];
  const testing: DigitSample[] = [];

  for (const label of [3, 8] as const) {
    const classSamples = shuffle(samples.filter((sample) => sample.label === label), random);
    const testingCount = Math.round(classSamples.length * 0.25);
    testing.push(...classSamples.slice(0, testingCount));
    training.push(...classSamples.slice(testingCount));
  }

  return { training, testing };
}

export function probabilityOfEight(
  classifier: Pick<TinyDigitClassifier, "weights" | "bias">,
  pixels: readonly number[],
): number {
  const logit = pixels.reduce(
    (total, pixel, index) => total + pixel * (classifier.weights[index] ?? 0),
    classifier.bias,
  );
  return sigmoid(logit);
}

export function classifyDigit(probability: number): DigitLabel {
  return probability >= 0.5 ? 8 : 3;
}

function crossEntropy(probability: number, target: 0 | 1): number {
  const safeProbability = Math.min(1 - 1e-7, Math.max(1e-7, probability));
  return -(target * Math.log(safeProbability) + (1 - target) * Math.log(1 - safeProbability));
}

function lossForSamples(
  classifier: Pick<TinyDigitClassifier, "weights" | "bias">,
  samples: readonly DigitSample[],
): number {
  if (!samples.length) return 0;
  return samples.reduce(
    (total, sample) => total + crossEntropy(probabilityOfEight(classifier, sample.pixels), targetFor(sample.label)),
    0,
  ) / samples.length;
}

/**
 * Full-batch gradient descent for a 64-input logistic classifier. The model is
 * intentionally trained in the browser from raw bundled pixels, not loaded as
 * a checkpoint.
 */
export function trainDigitClassifier(
  training: readonly DigitSample[],
  testing: readonly DigitSample[],
  options: { epochs?: number; learningRate?: number; l2?: number } = {},
): TinyDigitClassifier {
  const epochs = options.epochs ?? DEFAULT_EPOCHS;
  const learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE;
  const l2 = options.l2 ?? DEFAULT_L2;
  const weights = Array.from({ length: PIXEL_COUNT }, () => 0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradient = Array.from({ length: PIXEL_COUNT }, () => 0);
    let biasGradient = 0;

    for (const sample of training) {
      const error = probabilityOfEight({ weights, bias }, sample.pixels) - targetFor(sample.label);
      biasGradient += error;
      for (let index = 0; index < PIXEL_COUNT; index++) {
        gradient[index] += error * sample.pixels[index];
      }
    }

    const scale = learningRate / training.length;
    for (let index = 0; index < PIXEL_COUNT; index++) {
      weights[index] -= learningRate * l2 * weights[index] + scale * gradient[index];
    }
    bias -= scale * biasGradient;
  }

  const classifier = { weights, bias };
  const testAccuracy = testing.length
    ? testing.filter((sample) => classifyDigit(probabilityOfEight(classifier, sample.pixels)) === sample.label).length / testing.length
    : 0;

  return {
    ...classifier,
    epochs,
    trainingLoss: lossForSamples(classifier, training),
    testAccuracy,
  };
}

export function inputGradient(
  classifier: Pick<TinyDigitClassifier, "weights" | "bias">,
  sample: Pick<DigitSample, "label" | "pixels">,
): number[] {
  const error = probabilityOfEight(classifier, sample.pixels) - targetFor(sample.label);
  return classifier.weights.map((weight) => error * weight);
}

function signed(value: number): number {
  return value < 0 ? -1 : 1;
}

export function attackDigit(
  classifier: Pick<TinyDigitClassifier, "weights" | "bias">,
  sample: DigitSample,
  epsilon: number,
): PixelAttack {
  const gradient = inputGradient(classifier, sample);
  const safeEpsilon = clampUnit(epsilon);
  const pixels = sample.pixels.map((pixel, index) => clampUnit(pixel + safeEpsilon * signed(gradient[index])));
  const perturbation = pixels.map((pixel, index) => pixel - sample.pixels[index]);
  const originalProbabilityOfEight = probabilityOfEight(classifier, sample.pixels);
  const attackedProbabilityOfEight = probabilityOfEight(classifier, pixels);

  return {
    originalProbabilityOfEight,
    attackedProbabilityOfEight,
    originalLabel: classifyDigit(originalProbabilityOfEight),
    attackedLabel: classifyDigit(attackedProbabilityOfEight),
    pixels,
    perturbation,
    gradient,
    epsilon: Math.max(...perturbation.map((value) => Math.abs(value))),
  };
}

export function randomNudge(
  sample: DigitSample,
  epsilon: number,
): number[] {
  const random = seededRandom(9_019 + sample.sourceIndex * 101);
  const safeEpsilon = clampUnit(epsilon);
  return sample.pixels.map((pixel) => clampUnit(pixel + safeEpsilon * (random() < 0.5 ? -1 : 1)));
}

/** Finds the smallest gradient-sign budget that changes a currently correct prediction. */
export function minimumFlipEpsilon(
  classifier: Pick<TinyDigitClassifier, "weights" | "bias">,
  sample: DigitSample,
  maximum = 0.4,
): number | null {
  if (classifyDigit(probabilityOfEight(classifier, sample.pixels)) !== sample.label) return null;
  if (attackDigit(classifier, sample, maximum).attackedLabel === sample.label) return null;

  let lower = 0;
  let upper = maximum;
  for (let iteration = 0; iteration < 24; iteration++) {
    const middle = (lower + upper) / 2;
    if (attackDigit(classifier, sample, middle).attackedLabel === sample.label) lower = middle;
    else upper = middle;
  }
  return upper;
}

export function vulnerableHeldOutSamples(
  classifier: Pick<TinyDigitClassifier, "weights" | "bias">,
  samples: readonly DigitSample[],
): Array<{ sample: DigitSample; minimumEpsilon: number | null }> {
  return samples
    .filter((sample) => classifyDigit(probabilityOfEight(classifier, sample.pixels)) === sample.label)
    .map((sample) => ({ sample, minimumEpsilon: minimumFlipEpsilon(classifier, sample) }))
    .sort((left, right) => {
      if (left.minimumEpsilon === null && right.minimumEpsilon === null) return left.sample.sourceIndex - right.sample.sourceIndex;
      if (left.minimumEpsilon === null) return 1;
      if (right.minimumEpsilon === null) return -1;
      return left.minimumEpsilon - right.minimumEpsilon || left.sample.sourceIndex - right.sample.sourceIndex;
    });
}
