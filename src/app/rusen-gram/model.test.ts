import { expect, it } from "vitest";
import { inspectNgram } from "./model";

it("shows actual context counts and backs off only when the context has no continuations", () => {
  const found = inspectNgram(
    "a cat sleeps . a cat runs . a dog runs .",
    "a cat",
    3,
    0,
  );
  expect(found.trace).toEqual([{ context: ["a", "cat"], total: 2 }]);
  expect(
    found.distribution.find((row) => row.token === "runs")?.probability,
  ).toBe(0.5);
  const unseen = inspectNgram("a cat sleeps .", "unknown cat", 3, 0.5);
  expect(unseen.trace).toEqual([
    { context: ["unknown", "cat"], total: 0 },
    { context: ["cat"], total: 1 },
  ]);
  expect(
    unseen.distribution.reduce((sum, row) => sum + row.probability, 0),
  ).toBeCloseTo(1);
  expect(unseen.distribution.every((row) => row.probability > 0)).toBe(true);
});
