import { describe, expect, it } from "vitest";

import { classifyPoint, leaveOneOutAccuracy, makeDataset, type Example } from "./math";

describe("nearest-neighbor classification", () => {
  it("replays noisy data for the same seed and keeps it inside the editable plot", () => {
    const points = makeDataset("moons", 0.6, 42);
    expect(makeDataset("moons", 0.6, 42)).toEqual(points);
    expect(makeDataset("moons", 0.6, 43)).not.toEqual(points);
    expect(points.every((point) => Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1)).toBe(true);
  });
  const examples: Example[] = [
    { x: 0, y: 0, label: 0 },
    { x: 1, y: 0, label: 1 },
    { x: 0, y: 1, label: 1 },
  ];

  it("changes from the nearest point to the local majority as k increases", () => {
    expect(classifyPoint({ x: 0.1, y: 0 }, examples, 1)?.label).toBe(0);
    expect(classifyPoint({ x: 0.1, y: 0 }, examples, 3)?.fraction).toBeCloseTo(
      2 / 3,
    );
    expect(classifyPoint({ x: 0.1, y: 0 }, examples, 3)?.label).toBe(1);
    expect(examples[0].label).toBe(0);
  });

  it("resolves tied votes by proximity and handles a smaller or empty dataset", () => {
    expect(
      classifyPoint({ x: 0.9, y: 0 }, examples.slice(0, 2), 9)?.label,
    ).toBe(1);
    expect(classifyPoint({ x: 0, y: 0 }, [], 1)).toBeNull();
  });

  it("holds each point out of its own evaluation", () => {
    expect(leaveOneOutAccuracy(examples.slice(0, 2), 1)).toBe(0);
    expect(leaveOneOutAccuracy(examples.slice(0, 1), 1)).toBeNull();
  });
});
