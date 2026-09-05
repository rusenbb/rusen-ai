import { expect, it } from "vitest";
import { createSeededRandom } from "@/lib/random";
import { distribution, sampleToken } from "./sampling";

it("uses identical draws for zero intervention and increases the targeted token mass", () => {
  const logits = [1, 2, 3];
  const targets = new Set([0]);
  const baseline = distribution(logits, targets, 0, 1, 3);
  const steered = distribution(logits, targets, 3, 1, 3);
  const left = createSeededRandom(42),
    right = createSeededRandom(42);
  for (let step = 0; step < 20; step++)
    expect(sampleToken(baseline, left())).toBe(
      sampleToken(distribution(logits, targets, 0, 1, 3), right()),
    );
  expect(steered.find((token) => token.id === 0)!.probability).toBeGreaterThan(
    baseline.find((token) => token.id === 0)!.probability,
  );
  expect(
    steered.reduce((sum, token) => sum + token.probability, 0),
  ).toBeCloseTo(1);
  expect(logits).toEqual([1, 2, 3]);
});
