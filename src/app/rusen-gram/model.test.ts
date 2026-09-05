import { expect, it } from "vitest";
import { inspectNgram, trainNgram, generateNgram, extractBook } from "./model";

it("shows actual context counts and backs off only when the context has no continuations", () => {
  const found = inspectNgram(
    trainNgram("a cat sleeps . a cat runs . a dog runs .", 3),
    "a cat",
    0,
  );
  expect(found.trace).toEqual([{ context: ["a", "cat"], total: 2 }]);
  expect(
    found.distribution.find((row) => row.token === "runs")?.probability,
  ).toBe(0.5);
  const unseen = inspectNgram(
    trainNgram("a cat sleeps .", 3),
    "unknown cat",
    0.5,
  );
  expect(unseen.trace).toEqual([
    { context: ["unknown", "cat"], total: 0 },
    { context: ["cat"], total: 1 },
  ]);
  expect(
    unseen.distribution.reduce((sum, row) => sum + row.probability, 0),
  ).toBeCloseTo(1);
  expect(unseen.distribution.every((row) => row.probability > 0)).toBe(true);
});

it("keeps paragraph boundaries and preserves reproducible generation", () => {
  const model = trainNgram("a cat sleeps\n\nbird sings", 3);
  expect(inspectNgram(model, "sleeps", 0).trace[0].total).toBe(0);
  expect(generateNgram(model, "a cat", 0, 42, 1)).toBe("sleeps");
  expect(generateNgram(model, "a cat", 0.01, 42, 80)).toBe(
    generateNgram(model, "a cat", 0.01, 42, 80),
  );
  expect(
    extractBook(
      "header\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\npoem\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nlicense",
    ),
  ).toBe("poem");
});
