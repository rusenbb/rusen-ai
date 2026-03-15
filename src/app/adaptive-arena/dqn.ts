// ── Types ──────────────────────────────────────────────────────────────────────

export type LayerWeights = {
  weights: Float32Array; // row-major [outDim × inDim]
  biases: Float32Array; // [outDim]
  inDim: number;
  outDim: number;
};

export type DQNWeights = {
  layers: LayerWeights[];
};

export type DQNConfig = {
  layerSizes: number[]; // e.g. [68, 128, 64, 8]
  learningRate: number;
  gamma: number;
  targetUpdateFreq: number;
  batchSize: number;
  replayCapacity: number;
  epsilon: number;
  epsilonDecay: number;
  epsilonMin: number;
  weightDecay: number; // L2 regularization coefficient (AdamW-style)
};

export type Transition = {
  state: Float32Array;
  action: number; // action index 0-7
  reward: number;
  nextState: Float32Array | null; // null if terminal
};

export type ReplayBuffer = {
  buffer: (Transition | null)[];
  capacity: number;
  position: number;
  size: number;
};

export type AdamState = {
  m: DQNWeights;
  v: DQNWeights;
  t: number;
  beta1: number;
  beta2: number;
  eps: number;
};

type TrainingScratch = {
  gradients: DQNWeights;
  activations: Float32Array[];
  preActivations: Float32Array[];
  deltas: Float32Array[];
};

export type DQNAgent = {
  config: DQNConfig;
  policy: DQNWeights;
  target: DQNWeights;
  replay: ReplayBuffer;
  stepCount: number;
  adam: AdamState;
  scratch: TrainingScratch;
};

export type SerializedLayerWeights = {
  weights: number[];
  biases: number[];
  inDim: number;
  outDim: number;
};

export type SerializedDQNWeights = {
  layers: SerializedLayerWeights[];
};

// ── Initialization ────────────────────────────────────────────────────────────

function heInit(fanIn: number): number {
  // He initialization: N(0, sqrt(2/fanIn))
  const u1 = Math.random();
  const u2 = Math.random();
  const normal =
    Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return normal * Math.sqrt(2 / fanIn);
}

export function createDQNWeights(layerSizes: number[]): DQNWeights {
  const layers: LayerWeights[] = [];
  for (let l = 0; l < layerSizes.length - 1; l++) {
    const inDim = layerSizes[l];
    const outDim = layerSizes[l + 1];
    const weights = new Float32Array(outDim * inDim);
    const biases = new Float32Array(outDim);
    for (let i = 0; i < weights.length; i++) {
      weights[i] = heInit(inDim);
    }
    // biases initialized to 0
    layers.push({ weights, biases, inDim, outDim });
  }
  return { layers };
}

function createZeroWeights(layerSizes: number[]): DQNWeights {
  const layers: LayerWeights[] = [];
  for (let l = 0; l < layerSizes.length - 1; l++) {
    const inDim = layerSizes[l];
    const outDim = layerSizes[l + 1];
    layers.push({
      weights: new Float32Array(outDim * inDim),
      biases: new Float32Array(outDim),
      inDim,
      outDim,
    });
  }
  return { layers };
}

export function deepCopyWeights(source: DQNWeights): DQNWeights {
  return {
    layers: source.layers.map((layer) => ({
      weights: new Float32Array(layer.weights),
      biases: new Float32Array(layer.biases),
      inDim: layer.inDim,
      outDim: layer.outDim,
    })),
  };
}

export function createReplayBuffer(capacity: number): ReplayBuffer {
  return {
    buffer: new Array(capacity).fill(null),
    capacity,
    position: 0,
    size: 0,
  };
}

function createAdamState(layerSizes: number[]): AdamState {
  return {
    m: createZeroWeights(layerSizes),
    v: createZeroWeights(layerSizes),
    t: 0,
    beta1: 0.9,
    beta2: 0.999,
    eps: 1e-8,
  };
}

function createTrainingScratch(layerSizes: number[]): TrainingScratch {
  const activations: Float32Array[] = new Array(layerSizes.length);
  const preActivations: Float32Array[] = new Array(layerSizes.length - 1);
  const deltas: Float32Array[] = new Array(layerSizes.length - 1);

  activations[0] = new Float32Array(layerSizes[0]);
  for (let l = 0; l < layerSizes.length - 1; l++) {
    const outDim = layerSizes[l + 1];
    activations[l + 1] = new Float32Array(outDim);
    preActivations[l] = new Float32Array(outDim);
    deltas[l] = new Float32Array(outDim);
  }

  return {
    gradients: createZeroWeights(layerSizes),
    activations,
    preActivations,
    deltas,
  };
}

export function createDQNAgent(config: DQNConfig): DQNAgent {
  const policy = createDQNWeights(config.layerSizes);
  const target = deepCopyWeights(policy);
  return {
    config,
    policy,
    target,
    replay: createReplayBuffer(config.replayCapacity),
    stepCount: 0,
    adam: createAdamState(config.layerSizes),
    scratch: createTrainingScratch(config.layerSizes),
  };
}

// ── Forward Pass ──────────────────────────────────────────────────────────────

export function forward(
  weights: DQNWeights,
  input: Float32Array,
): Float32Array {
  const activations: Float32Array[] = [input];
  const preActivations: Float32Array[] = [];

  for (let l = 0; l < weights.layers.length; l++) {
    const layer = weights.layers[l];
    activations.push(new Float32Array(layer.outDim));
    preActivations.push(new Float32Array(layer.outDim));
  }

  return forwardInto(weights, input, activations, preActivations);
}

// Forward pass that stores intermediate activations for backprop
type ForwardCache = {
  preActivations: Float32Array[]; // z values before ReLU
  activations: Float32Array[]; // a values after ReLU (or linear for output)
};

function forwardWithCache(
  weights: DQNWeights,
  input: Float32Array,
): ForwardCache {
  const preActivations: Float32Array[] = [];
  const activations: Float32Array[] = [input]; // a[0] = input

  for (let l = 0; l < weights.layers.length; l++) {
    const layer = weights.layers[l];
    preActivations.push(new Float32Array(layer.outDim));
    activations.push(new Float32Array(layer.outDim));
  }

  forwardInto(weights, input, activations, preActivations);
  return { preActivations, activations };
}

function forwardInto(
  weights: DQNWeights,
  input: Float32Array,
  activations: Float32Array[],
  preActivations: Float32Array[],
): Float32Array {
  activations[0] = input;

  for (let l = 0; l < weights.layers.length; l++) {
    const layer = weights.layers[l];
    const prev = activations[l];
    const z = preActivations[l];
    const out = activations[l + 1];
    const isHiddenLayer = l < weights.layers.length - 1;

    for (let i = 0; i < layer.outDim; i++) {
      let sum = layer.biases[i];
      const rowOffset = i * layer.inDim;
      for (let j = 0; j < layer.inDim; j++) {
        sum += layer.weights[rowOffset + j] * prev[j];
      }
      z[i] = sum;
      out[i] = isHiddenLayer && sum < 0 ? 0 : sum;
    }
  }

  return activations[weights.layers.length];
}

// ── Action Selection ──────────────────────────────────────────────────────────

export type BotDecisionMode = "explore" | "exploit";

export function chooseAction(
  policyWeights: DQNWeights,
  state: Float32Array,
  epsilon: number,
): { actionIndex: number; mode: BotDecisionMode } {
  if (Math.random() < epsilon) {
    return {
      actionIndex: Math.floor(Math.random() * 8),
      mode: "explore",
    };
  }

  const qValues = forward(policyWeights, state);
  let bestIndex = 0;
  let bestValue = qValues[0];
  for (let i = 1; i < qValues.length; i++) {
    if (qValues[i] > bestValue) {
      bestValue = qValues[i];
      bestIndex = i;
    }
  }
  return { actionIndex: bestIndex, mode: "exploit" };
}

// ── Replay Buffer ─────────────────────────────────────────────────────────────

export function pushTransition(
  replay: ReplayBuffer,
  transition: Transition,
): void {
  replay.buffer[replay.position] = transition;
  replay.position = (replay.position + 1) % replay.capacity;
  if (replay.size < replay.capacity) {
    replay.size++;
  }
}

export function sampleBatch(
  replay: ReplayBuffer,
  batchSize: number,
): Transition[] {
  const batch: Transition[] = [];
  for (let i = 0; i < batchSize; i++) {
    const index = Math.floor(Math.random() * replay.size);
    batch.push(replay.buffer[index]!);
  }
  return batch;
}

function zeroWeights(weights: DQNWeights): void {
  for (const layer of weights.layers) {
    layer.weights.fill(0);
    layer.biases.fill(0);
  }
}

// ── Backward Pass (Backpropagation) ───────────────────────────────────────────

export type GradientResult = {
  gradients: DQNWeights;
  loss: number;
};

export function backpropBatch(
  policy: DQNWeights,
  target: DQNWeights,
  batch: Transition[],
  gamma: number,
): GradientResult {
  const numLayers = policy.layers.length;
  const grads = createZeroWeights(
    policy.layers
      .map((l) => l.inDim)
      .concat([policy.layers[numLayers - 1].outDim]),
  );
  let totalLoss = 0;

  for (const transition of batch) {
    // Forward pass through policy network
    const cache = forwardWithCache(policy, transition.state);
    const qValues = cache.activations[numLayers]; // output layer activations

    // Compute target Q-value
    let targetQ: number;
    if (transition.nextState === null) {
      targetQ = transition.reward;
    } else {
      const nextQValues = forward(target, transition.nextState);
      let maxNextQ = nextQValues[0];
      for (let i = 1; i < nextQValues.length; i++) {
        if (nextQValues[i] > maxNextQ) maxNextQ = nextQValues[i];
      }
      targetQ = transition.reward + gamma * maxNextQ;
    }

    // Loss for this sample: (Q(s,a) - target)^2
    const predicted = qValues[transition.action];
    const error = predicted - targetQ;
    totalLoss += error * error;

    // Backward pass
    // dL/dOutput: zeros except at the chosen action
    let delta = new Float32Array(policy.layers[numLayers - 1].outDim);
    delta[transition.action] = 2 * error; // d/dq (q - target)^2 = 2(q - target)

    // Backprop through each layer (reverse order)
    for (let l = numLayers - 1; l >= 0; l--) {
      const layer = policy.layers[l];
      const inputActivation = cache.activations[l];
      const gradLayer = grads.layers[l];

      // If not the output layer, apply ReLU derivative
      if (l < numLayers - 1) {
        const z = cache.preActivations[l];
        for (let i = 0; i < delta.length; i++) {
          if (z[i] <= 0) delta[i] = 0;
        }
      }

      // Accumulate weight gradients: dL/dW[l] += outer(delta, input)
      for (let i = 0; i < layer.outDim; i++) {
        const rowOffset = i * layer.inDim;
        for (let j = 0; j < layer.inDim; j++) {
          gradLayer.weights[rowOffset + j] += delta[i] * inputActivation[j];
        }
        gradLayer.biases[i] += delta[i];
      }

      // Propagate delta to previous layer: delta_prev = W[l]^T * delta
      if (l > 0) {
        const prevDelta = new Float32Array(layer.inDim);
        for (let i = 0; i < layer.outDim; i++) {
          const rowOffset = i * layer.inDim;
          for (let j = 0; j < layer.inDim; j++) {
            prevDelta[j] += layer.weights[rowOffset + j] * delta[i];
          }
        }
        delta = prevDelta;
      }
    }
  }

  // Average gradients over batch
  const batchSize = batch.length;
  for (const layer of grads.layers) {
    for (let i = 0; i < layer.weights.length; i++) {
      layer.weights[i] /= batchSize;
    }
    for (let i = 0; i < layer.biases.length; i++) {
      layer.biases[i] /= batchSize;
    }
  }

  return { gradients: grads, loss: totalLoss / batchSize };
}

// ── Adam Optimizer ────────────────────────────────────────────────────────────

export function adamUpdate(
  weights: DQNWeights,
  gradients: DQNWeights,
  adam: AdamState,
  learningRate: number,
  weightDecay: number = 0,
  gradientScale: number = 1,
): void {
  adam.t += 1;
  const bc1 = 1 - Math.pow(adam.beta1, adam.t);
  const bc2 = 1 - Math.pow(adam.beta2, adam.t);

  for (let l = 0; l < weights.layers.length; l++) {
    const wLayer = weights.layers[l];
    const gLayer = gradients.layers[l];
    const mLayer = adam.m.layers[l];
    const vLayer = adam.v.layers[l];

    // Update weights (with AdamW-style decoupled weight decay)
    for (let i = 0; i < wLayer.weights.length; i++) {
      const g = gLayer.weights[i] * gradientScale;
      mLayer.weights[i] = adam.beta1 * mLayer.weights[i] + (1 - adam.beta1) * g;
      vLayer.weights[i] =
        adam.beta2 * vLayer.weights[i] + (1 - adam.beta2) * g * g;
      const mHat = mLayer.weights[i] / bc1;
      const vHat = vLayer.weights[i] / bc2;
      wLayer.weights[i] -=
        learningRate *
        (mHat / (Math.sqrt(vHat) + adam.eps) + weightDecay * wLayer.weights[i]);
    }

    // Update biases (no weight decay on biases)
    for (let i = 0; i < wLayer.biases.length; i++) {
      const g = gLayer.biases[i] * gradientScale;
      mLayer.biases[i] = adam.beta1 * mLayer.biases[i] + (1 - adam.beta1) * g;
      vLayer.biases[i] =
        adam.beta2 * vLayer.biases[i] + (1 - adam.beta2) * g * g;
      const mHat = mLayer.biases[i] / bc1;
      const vHat = vLayer.biases[i] / bc2;
      wLayer.biases[i] -= (learningRate * mHat) / (Math.sqrt(vHat) + adam.eps);
    }
  }
}

function backpropReplayBatch(agent: DQNAgent): number {
  const { batchSize, gamma } = agent.config;
  const { gradients, activations, preActivations, deltas } = agent.scratch;
  const numLayers = agent.policy.layers.length;
  zeroWeights(gradients);

  let totalLoss = 0;

  for (let sampleIndex = 0; sampleIndex < batchSize; sampleIndex++) {
    const transition =
      agent.replay.buffer[Math.floor(Math.random() * agent.replay.size)]!;

    let targetQ = transition.reward;
    if (transition.nextState !== null) {
      const nextQValues = forwardInto(
        agent.target,
        transition.nextState,
        activations,
        preActivations,
      );
      let maxNextQ = nextQValues[0];
      for (let i = 1; i < nextQValues.length; i++) {
        if (nextQValues[i] > maxNextQ) {
          maxNextQ = nextQValues[i];
        }
      }
      targetQ += gamma * maxNextQ;
    }

    const qValues = forwardInto(
      agent.policy,
      transition.state,
      activations,
      preActivations,
    );
    const predicted = qValues[transition.action];
    const error = predicted - targetQ;
    totalLoss += error * error;

    const outputDelta = deltas[numLayers - 1];
    outputDelta.fill(0);
    outputDelta[transition.action] = 2 * error;

    let delta = outputDelta;

    for (let l = numLayers - 1; l >= 0; l--) {
      const layer = agent.policy.layers[l];
      const inputActivation = activations[l];
      const gradLayer = gradients.layers[l];

      if (l < numLayers - 1) {
        const z = preActivations[l];
        for (let i = 0; i < delta.length; i++) {
          if (z[i] <= 0) {
            delta[i] = 0;
          }
        }
      }

      for (let i = 0; i < layer.outDim; i++) {
        const d = delta[i];
        if (d === 0) {
          continue;
        }
        const rowOffset = i * layer.inDim;
        for (let j = 0; j < layer.inDim; j++) {
          gradLayer.weights[rowOffset + j] += d * inputActivation[j];
        }
        gradLayer.biases[i] += d;
      }

      if (l > 0) {
        const prevDelta = deltas[l - 1];
        prevDelta.fill(0);
        for (let i = 0; i < layer.outDim; i++) {
          const d = delta[i];
          if (d === 0) {
            continue;
          }
          const rowOffset = i * layer.inDim;
          for (let j = 0; j < layer.inDim; j++) {
            prevDelta[j] += layer.weights[rowOffset + j] * d;
          }
        }
        delta = prevDelta;
      }
    }
  }

  return totalLoss / batchSize;
}

// ── Training Step ─────────────────────────────────────────────────────────────

export function trainStep(agent: DQNAgent): number {
  if (agent.replay.size < agent.config.batchSize) return 0;

  const loss = backpropReplayBatch(agent);
  adamUpdate(
    agent.policy,
    agent.scratch.gradients,
    agent.adam,
    agent.config.learningRate,
    agent.config.weightDecay,
    1 / agent.config.batchSize,
  );
  agent.stepCount++;

  if (agent.stepCount % agent.config.targetUpdateFreq === 0) {
    syncTargetNetwork(agent);
  }

  return loss;
}

export function syncTargetNetwork(agent: DQNAgent): void {
  for (let l = 0; l < agent.policy.layers.length; l++) {
    agent.target.layers[l].weights.set(agent.policy.layers[l].weights);
    agent.target.layers[l].biases.set(agent.policy.layers[l].biases);
  }
}

// ── Serialization ─────────────────────────────────────────────────────────────

export function serializeDQNWeights(weights: DQNWeights): SerializedDQNWeights {
  return {
    layers: weights.layers.map((layer) => ({
      weights: Array.from(layer.weights),
      biases: Array.from(layer.biases),
      inDim: layer.inDim,
      outDim: layer.outDim,
    })),
  };
}

export function deserializeDQNWeights(data: SerializedDQNWeights): DQNWeights {
  return {
    layers: data.layers.map((layer) => ({
      weights: new Float32Array(layer.weights),
      biases: new Float32Array(layer.biases),
      inDim: layer.inDim,
      outDim: layer.outDim,
    })),
  };
}

// ── Gradient Check (for testing) ──────────────────────────────────────────────

export function numericalGradientCheck(
  weights: DQNWeights,
  input: Float32Array,
  actionIndex: number,
  targetQ: number,
  epsilon = 1e-4,
): { maxRelError: number; passed: boolean } {
  const fakeTransition: Transition = {
    state: input,
    action: actionIndex,
    reward: targetQ, // nextState=null means targetQ = reward
    nextState: null,
  };

  // Use a dummy target network (not used when nextState is null)
  const { gradients } = backpropBatch(weights, weights, [fakeTransition], 0);

  let maxRelError = 0;

  for (let l = 0; l < weights.layers.length; l++) {
    const layer = weights.layers[l];
    const gradLayer = gradients.layers[l];

    // Check a subset of weight gradients
    const checkCount = Math.min(20, layer.weights.length);
    for (let i = 0; i < checkCount; i++) {
      const idx = Math.floor((i * layer.weights.length) / checkCount);
      const original = layer.weights[idx];

      layer.weights[idx] = original + epsilon;
      const lossPlus = Math.pow(
        forward(weights, input)[actionIndex] - targetQ,
        2,
      );

      layer.weights[idx] = original - epsilon;
      const lossMinus = Math.pow(
        forward(weights, input)[actionIndex] - targetQ,
        2,
      );

      layer.weights[idx] = original;

      const numerical = (lossPlus - lossMinus) / (2 * epsilon);
      const analytical = gradLayer.weights[idx];
      const denom = Math.max(Math.abs(numerical), Math.abs(analytical), 1e-8);
      const relError = Math.abs(numerical - analytical) / denom;
      if (relError > maxRelError) maxRelError = relError;
    }
  }

  return { maxRelError, passed: maxRelError < 0.01 };
}
