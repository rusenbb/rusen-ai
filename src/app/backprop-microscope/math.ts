export const SAMPLE_INPUT = 0.75;
export const INITIAL_WEIGHT = -0.55;
export const DEFAULT_TARGET = 0.7;
export const LEARNING_RATE = 0.7;

export interface NeuronComputation {
  input: number;
  target: number;
  weight: number;
  prediction: number;
  error: number;
  loss: number;
  localSlope: number;
  gradient: number;
}

export interface TrainingStep {
  before: NeuronComputation;
  after: NeuronComputation;
  weightBefore: number;
  weightAfter: number;
  steps: number;
}

/**
 * A complete one-neuron forward and backward pass for y-hat = tanh(w * x).
 * Keeping one trainable weight makes every part of the chain rule visible.
 */
export function evaluateNeuron(
  input: number,
  target: number,
  weight: number,
): NeuronComputation {
  const prediction = Math.tanh(weight * input);
  const error = prediction - target;
  const localSlope = 1 - prediction * prediction;
  const gradient = error * localSlope * input;

  return {
    input,
    target,
    weight,
    prediction,
    error,
    loss: 0.5 * error * error,
    localSlope,
    gradient,
  };
}

export function takeNeuronStep(
  input: number,
  target: number,
  weight: number,
  learningRate = LEARNING_RATE,
): number {
  const { gradient } = evaluateNeuron(input, target, weight);
  return weight - learningRate * gradient;
}

export function trainNeuron(
  input: number,
  target: number,
  weight: number,
  steps: number,
  learningRate = LEARNING_RATE,
): TrainingStep {
  const before = evaluateNeuron(input, target, weight);
  let nextWeight = weight;

  for (let index = 0; index < steps; index += 1) {
    nextWeight = takeNeuronStep(input, target, nextWeight, learningRate);
  }

  return {
    before,
    after: evaluateNeuron(input, target, nextWeight),
    weightBefore: weight,
    weightAfter: nextWeight,
    steps,
  };
}

export function neuronFiniteDifference(
  input: number,
  target: number,
  weight: number,
  epsilon = 1e-5,
): number {
  const higher = evaluateNeuron(input, target, weight + epsilon).loss;
  const lower = evaluateNeuron(input, target, weight - epsilon).loss;
  return (higher - lower) / (2 * epsilon);
}
