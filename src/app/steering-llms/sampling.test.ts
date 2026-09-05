import { expect, it } from "vitest";
import { createSeededRandom } from "@/lib/random";
import { distribution, sampleToken } from "./sampling";
it("samples reproducibly without modifying model logits", () => {
  const logits = [1, 2, 3];
  const probabilities = distribution(logits, 1, 3);
  const left = createSeededRandom(42),
    right = createSeededRandom(42);
  for (let i = 0; i < 20; i++)
    expect(sampleToken(probabilities, left())).toBe(
      sampleToken(distribution(logits, 1, 3), right()),
    );
  expect(probabilities.reduce((s, p) => s + p.probability, 0)).toBeCloseTo(1);
  expect(distribution(logits, 0, 1)[0].id).toBe(2);
  expect(logits).toEqual([1, 2, 3]);
});
