import { describe, expect, it } from "vitest";

import {
  attackDigit,
  classifyDigit,
  createDigitSplit,
  loadDigitSamples,
  minimumFlipEpsilon,
  probabilityOfEight,
  randomNudge,
  trainDigitClassifier,
  vulnerableHeldOutSamples,
} from "./model";

describe("Pixel Nudge model", () => {
  const split = createDigitSplit();
  const classifier = trainDigitClassifier(split.training, split.testing);

  it("uses real normalized 8 by 8 3 and 8 images with a disjoint held-out split", () => {
    const samples = loadDigitSamples();
    const trainingIds = new Set(split.training.map((sample) => sample.sourceIndex));
    const testingIds = new Set(split.testing.map((sample) => sample.sourceIndex));

    expect(samples).toHaveLength(357);
    expect(samples.every((sample) => sample.label === 3 || sample.label === 8)).toBe(true);
    expect(samples.every((sample) => sample.pixels.length === 64 && sample.pixels.every((pixel) => pixel >= 0 && pixel <= 1))).toBe(true);
    expect([...trainingIds].some((id) => testingIds.has(id))).toBe(false);
  });

  it("trains a local logistic classifier that generalizes to the held-out images", () => {
    expect(classifier.trainingLoss).toBeLessThan(0.08);
    expect(classifier.testAccuracy).toBeGreaterThan(0.95);
  });

  it("chooses correctly classified held-out examples and finds a genuine gradient-sign flip budget", () => {
    const candidates = vulnerableHeldOutSamples(classifier, split.testing);
    const vulnerable = candidates.find((candidate) => candidate.minimumEpsilon !== null);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => split.testing.some((sample) => sample.sourceIndex === candidate.sample.sourceIndex))).toBe(true);
    expect(candidates.every((candidate) => classifyDigit(probabilityOfEight(classifier, candidate.sample.pixels)) === candidate.sample.label)).toBe(true);
    expect(vulnerable).toBeDefined();

    const minimum = vulnerable!.minimumEpsilon!;
    const below = attackDigit(classifier, vulnerable!.sample, Math.max(0, minimum - 0.002));
    const atMinimum = attackDigit(classifier, vulnerable!.sample, minimum + 0.002);
    expect(below.attackedLabel).toBe(vulnerable!.sample.label);
    expect(atMinimum.attackedLabel).not.toBe(vulnerable!.sample.label);
    expect(minimumFlipEpsilon(classifier, vulnerable!.sample)).not.toBeNull();
  });

  it("keeps same-size random noise bounded without pretending it is gradient-directed", () => {
    const sample = vulnerableHeldOutSamples(classifier, split.testing)[0].sample;
    const epsilon = 0.12;
    const random = randomNudge(sample, epsilon);

    expect(random).toHaveLength(sample.pixels.length);
    expect(random.every((pixel) => pixel >= 0 && pixel <= 1)).toBe(true);
    expect(Math.max(...random.map((pixel, index) => Math.abs(pixel - sample.pixels[index])))).toBeLessThanOrEqual(epsilon);
  });
});
