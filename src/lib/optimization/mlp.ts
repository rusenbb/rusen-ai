import { clamp } from "./math";
import { createRng } from "./rng";
import type { DecisionBoundarySnapshot, TrainingTrace } from "./types";

type Sample = {
  features: readonly [number, number];
  label: 0 | 1;
};

type NetworkParams = {
  w1: Float64Array;
  b1: Float64Array;
  w2: Float64Array;
  b2: number;
};

type NetworkGradients = {
  w1: Float64Array;
  b1: Float64Array;
  w2: Float64Array;
  b2: number;
};

type AdamState = {
  mw1: Float64Array;
  vw1: Float64Array;
  mb1: Float64Array;
  vb1: Float64Array;
  mw2: Float64Array;
  vw2: Float64Array;
  mb2: number;
  vb2: number;
  step: number;
};

export interface TrainingConfig {
  width: number;
  batchSize: number;
  steps: number;
  optimizerId: "sgd" | "adam";
  seed: number;
}

export function generateTwoMoons(sampleCount: number, seed: number): Sample[] {
  const rng = createRng(seed);
  const half = Math.max(2, Math.floor(sampleCount / 2));
  const samples: Sample[] = [];

  for (let index = 0; index < half; index += 1) {
    const t = Math.PI * (index / Math.max(1, half - 1));
    samples.push({
      features: [
        Math.cos(t) + rng.normal() * 0.08,
        Math.sin(t) + rng.normal() * 0.08,
      ],
      label: 0,
    });
  }

  for (let index = 0; index < half; index += 1) {
    const t = Math.PI * (index / Math.max(1, half - 1));
    samples.push({
      features: [
        1 - Math.cos(t) + rng.normal() * 0.08,
        0.5 - Math.sin(t) + rng.normal() * 0.08,
      ],
      label: 1,
    });
  }

  return samples;
}

function createParams(width: number, seed: number): NetworkParams {
  const rng = createRng(seed);
  const w1 = new Float64Array(width * 2);
  const b1 = new Float64Array(width);
  const w2 = new Float64Array(width);

  for (let index = 0; index < w1.length; index += 1) {
    w1[index] = rng.normal() * Math.sqrt(2 / 2);
  }
  for (let index = 0; index < w2.length; index += 1) {
    w2[index] = rng.normal() * Math.sqrt(2 / Math.max(1, width));
  }

  return {
    w1,
    b1,
    w2,
    b2: 0,
  };
}

function createGradients(width: number): NetworkGradients {
  return {
    w1: new Float64Array(width * 2),
    b1: new Float64Array(width),
    w2: new Float64Array(width),
    b2: 0,
  };
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function predict(params: NetworkParams, width: number, input: readonly [number, number]): number {
  let logit = params.b2;
  for (let index = 0; index < width; index += 1) {
    const z =
      params.w1[index * 2] * input[0] +
      params.w1[index * 2 + 1] * input[1] +
      params.b1[index];
    const activation = z > 0 ? z : 0;
    logit += params.w2[index] * activation;
  }
  return sigmoid(logit);
}

function zeroGradients(gradients: NetworkGradients): void {
  gradients.w1.fill(0);
  gradients.b1.fill(0);
  gradients.w2.fill(0);
  gradients.b2 = 0;
}

function computeBatchGradients(
  params: NetworkParams,
  width: number,
  batch: Sample[],
  gradients: NetworkGradients,
): { loss: number; accuracy: number } {
  zeroGradients(gradients);

  let totalLoss = 0;
  let correct = 0;

  for (const sample of batch) {
    const hidden = new Float64Array(width);
    const gates = new Float64Array(width);
    let logit = params.b2;

    for (let index = 0; index < width; index += 1) {
      const z =
        params.w1[index * 2] * sample.features[0] +
        params.w1[index * 2 + 1] * sample.features[1] +
        params.b1[index];
      hidden[index] = z > 0 ? z : 0;
      gates[index] = z > 0 ? 1 : 0;
      logit += params.w2[index] * hidden[index];
    }

    const prediction = clamp(sigmoid(logit), 1e-5, 1 - 1e-5);
    const error = prediction - sample.label;
    totalLoss +=
      -sample.label * Math.log(prediction) -
      (1 - sample.label) * Math.log(1 - prediction);
    if ((prediction >= 0.5 ? 1 : 0) === sample.label) {
      correct += 1;
    }

    gradients.b2 += error;

    for (let index = 0; index < width; index += 1) {
      gradients.w2[index] += error * hidden[index];
      const hiddenError = error * params.w2[index] * gates[index];
      gradients.b1[index] += hiddenError;
      gradients.w1[index * 2] += hiddenError * sample.features[0];
      gradients.w1[index * 2 + 1] += hiddenError * sample.features[1];
    }
  }

  const batchSize = Math.max(1, batch.length);
  for (let index = 0; index < gradients.w1.length; index += 1) {
    gradients.w1[index] /= batchSize;
  }
  for (let index = 0; index < gradients.b1.length; index += 1) {
    gradients.b1[index] /= batchSize;
    gradients.w2[index] /= batchSize;
  }
  gradients.b2 /= batchSize;

  return {
    loss: totalLoss / batchSize,
    accuracy: correct / batchSize,
  };
}

function applySgd(
  params: NetworkParams,
  gradients: NetworkGradients,
  learningRate: number,
): void {
  for (let index = 0; index < params.w1.length; index += 1) {
    params.w1[index] -= learningRate * gradients.w1[index];
  }
  for (let index = 0; index < params.b1.length; index += 1) {
    params.b1[index] -= learningRate * gradients.b1[index];
    params.w2[index] -= learningRate * gradients.w2[index];
  }
  params.b2 -= learningRate * gradients.b2;
}

function createAdamState(width: number): AdamState {
  return {
    mw1: new Float64Array(width * 2),
    vw1: new Float64Array(width * 2),
    mb1: new Float64Array(width),
    vb1: new Float64Array(width),
    mw2: new Float64Array(width),
    vw2: new Float64Array(width),
    mb2: 0,
    vb2: 0,
    step: 0,
  };
}

function applyAdam(
  params: NetworkParams,
  gradients: NetworkGradients,
  state: AdamState,
  learningRate: number,
): void {
  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;
  state.step += 1;

  for (let index = 0; index < params.w1.length; index += 1) {
    state.mw1[index] = beta1 * state.mw1[index] + (1 - beta1) * gradients.w1[index];
    state.vw1[index] =
      beta2 * state.vw1[index] + (1 - beta2) * gradients.w1[index] ** 2;
    const mHat = state.mw1[index] / (1 - beta1 ** state.step);
    const vHat = state.vw1[index] / (1 - beta2 ** state.step);
    params.w1[index] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
  }

  for (let index = 0; index < params.b1.length; index += 1) {
    state.mb1[index] = beta1 * state.mb1[index] + (1 - beta1) * gradients.b1[index];
    state.vb1[index] =
      beta2 * state.vb1[index] + (1 - beta2) * gradients.b1[index] ** 2;
    state.mw2[index] = beta1 * state.mw2[index] + (1 - beta1) * gradients.w2[index];
    state.vw2[index] =
      beta2 * state.vw2[index] + (1 - beta2) * gradients.w2[index] ** 2;

    const b1Hat = state.mb1[index] / (1 - beta1 ** state.step);
    const vb1Hat = state.vb1[index] / (1 - beta2 ** state.step);
    const w2Hat = state.mw2[index] / (1 - beta1 ** state.step);
    const vw2Hat = state.vw2[index] / (1 - beta2 ** state.step);

    params.b1[index] -= learningRate * b1Hat / (Math.sqrt(vb1Hat) + epsilon);
    params.w2[index] -= learningRate * w2Hat / (Math.sqrt(vw2Hat) + epsilon);
  }

  state.mb2 = beta1 * state.mb2 + (1 - beta1) * gradients.b2;
  state.vb2 = beta2 * state.vb2 + (1 - beta2) * gradients.b2 ** 2;
  const mb2Hat = state.mb2 / (1 - beta1 ** state.step);
  const vb2Hat = state.vb2 / (1 - beta2 ** state.step);
  params.b2 -= learningRate * mb2Hat / (Math.sqrt(vb2Hat) + epsilon);
}

function evaluateDataset(
  params: NetworkParams,
  width: number,
  samples: Sample[],
): { loss: number; accuracy: number } {
  let totalLoss = 0;
  let correct = 0;
  for (const sample of samples) {
    const prediction = clamp(predict(params, width, sample.features), 1e-5, 1 - 1e-5);
    totalLoss +=
      -sample.label * Math.log(prediction) -
      (1 - sample.label) * Math.log(1 - prediction);
    if ((prediction >= 0.5 ? 1 : 0) === sample.label) {
      correct += 1;
    }
  }
  return {
    loss: totalLoss / samples.length,
    accuracy: correct / samples.length,
  };
}

function createDecisionGrid(
  params: NetworkParams,
  width: number,
  gridSize: number,
): number[] {
  const values = new Array<number>(gridSize * gridSize);
  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const x = -1.5 + (col / (gridSize - 1)) * 4;
      const y = -1.4 + (row / (gridSize - 1)) * 3.2;
      values[row * gridSize + col] = predict(params, width, [x, y]);
    }
  }
  return values;
}

function snapshotTrace(
  params: NetworkParams,
  width: number,
  samples: Sample[],
  step: number,
  batchSize: number,
  optimizerId: "sgd" | "adam",
): DecisionBoundarySnapshot {
  const metrics = evaluateDataset(params, width, samples);
  return {
    step,
    loss: metrics.loss,
    accuracy: metrics.accuracy,
    width,
    batchSize,
    optimizerId,
    gridSize: 28,
    decisionGrid: createDecisionGrid(params, width, 28),
  };
}

export function trainTwoMoonsTrace(config: TrainingConfig): TrainingTrace {
  const samples = generateTwoMoons(160, config.seed);
  const params = createParams(config.width, config.seed + 17);
  const gradients = createGradients(config.width);
  const optimizerState = config.optimizerId === "adam" ? createAdamState(config.width) : null;
  const rng = createRng(config.seed + 101);
  const snapshots: DecisionBoundarySnapshot[] = [
    snapshotTrace(params, config.width, samples, 0, config.batchSize, config.optimizerId),
  ];

  const learningRate = config.optimizerId === "adam" ? 0.01 : 0.035;

  for (let step = 1; step <= config.steps; step += 1) {
    const batch: Sample[] = [];
    for (let index = 0; index < config.batchSize; index += 1) {
      batch.push(samples[rng.int(0, samples.length - 1)] ?? samples[0]!);
    }

    computeBatchGradients(params, config.width, batch, gradients);

    if (config.optimizerId === "adam" && optimizerState) {
      applyAdam(params, gradients, optimizerState, learningRate);
    } else {
      applySgd(params, gradients, learningRate);
    }

    if (step % 12 === 0 || step === config.steps) {
      snapshots.push(
        snapshotTrace(
          params,
          config.width,
          samples,
          step,
          config.batchSize,
          config.optimizerId,
        ),
      );
    }
  }

  const finalSnapshot = snapshots[snapshots.length - 1] ?? snapshots[0]!;

  return {
    snapshots,
    finalLoss: finalSnapshot.loss,
    finalAccuracy: finalSnapshot.accuracy,
  };
}
