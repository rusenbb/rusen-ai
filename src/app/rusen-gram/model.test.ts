import { expect, it } from "vitest";
import {
  inspectNgram,
  trainNgram,
  generateNgram,
  extractBook,
  sampleNgram,
} from "./model";

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
  expect(
    generateNgram(model, "a cat", 0, 42, 1).map((step) => step.token),
  ).toEqual(["sleeps"]);
  expect(generateNgram(model, "a cat", 0.01, 42, 80)).toEqual(
    generateNgram(model, "a cat", 0.01, 42, 80),
  );
  expect(
    extractBook(
      "header\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\npoem\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nlicense",
    ),
  ).toBe("poem");
});

it("uses the same seeded draws and contexts in batches and single steps", () => {
  const model = trainNgram("a cat sleeps . a dog runs . a cat runs .", 3);
  const batch = generateNgram(model, "a", 0.1, 42, 20);
  const single = [];
  let context = "a";
  for (let offset = 0; offset < 20; offset++) {
    const step = generateNgram(model, context, 0.1, 42, 1, offset)[0];
    single.push(step);
    context += " " + step.token;
  }
  expect(single).toEqual(batch);
  for (const step of batch) {
    expect(step.draw).toBeGreaterThanOrEqual(step.lower);
    expect(step.draw).toBeLessThan(step.upper);
    expect(step.upper - step.lower).toBeCloseTo(step.probability);
  }
});
it("shows exact CDF intervals and permits a different continuation", () => {
  const model = trainNgram("a cat sleeps . a dog runs . a dog runs .", 2);
  const cat = sampleNgram(model, "a", 0, 0.2);
  const dog = sampleNgram(model, "a", 0, 0.8);
  expect(cat.token).toBe("cat");
  expect(cat.lower).toBe(0);
  expect(cat.upper).toBeCloseTo(1 / 3);
  expect(dog.token).toBe("dog");
  expect(dog.lower).toBeCloseTo(1 / 3);
  expect(dog.upper).toBe(1);
  const chosen = sampleNgram(model, "a", 0, 0.8, "cat");
  expect(chosen.token).toBe("cat");
  expect(chosen.draw).toBeNull();
  expect(generateNgram(model, "a cat", 0, 42, 1, 1)[0].token).toBe("sleeps");
  expect(generateNgram(model, "a dog", 0, 42, 1, 1)[0].token).toBe("runs");
  expect(() => sampleNgram(model, "a", 0, 0.2, "absent")).toThrow();
});
