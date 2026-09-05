import { expect, it } from "vitest";
import { containedImageStyle, maskProbabilities } from "./maps";

it("letterboxes masks exactly like the source image", () => {
  for (const [aspect, expected] of [[2 / 3, [50, 100, 25, 0]], [8 / 3, [100, 50, 0, 25]]] as const) {
    const style = containedImageStyle(aspect);
    [style.width, style.height, style.left, style.top].forEach((value, index) => expect(parseFloat(value)).toBeCloseTo(expected[index]));
  }
});

it("does not stretch uniformly weak masks into a strong detection", () => {
  const result = maskProbabilities(new Float32Array([-10, -9, 0]));
  expect(result[1]).toBeLessThan(0.001);
  expect(result[2]).toBe(0.5);
});
