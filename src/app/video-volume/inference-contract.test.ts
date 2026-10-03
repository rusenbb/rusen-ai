import { describe, expect, it } from "vitest";
import { decodeMask, encodeMask, planVideoFrames } from "./inference-contract";

describe("real inference mask boundary", () => {
  it("round-trips empty, full, disconnected and nonbinary foreground masks", () => {
    for (const pixels of [
      [0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1],
      [255, 0, 255, 0, 0, 1],
      [0, 1, 1, 0, 1, 0],
    ]) {
      const data = Uint8Array.from(pixels);
      expect([...decodeMask(encodeMask(data, 3, 2))]).toEqual(
        pixels.map((value) => Number(value > 0)),
      );
    }
  });
  it("rejects malformed, oversized and incomplete inference results", () => {
    for (const counts of [[7], [-1, 7], [1.5, 4.5], [2, 2], [Number.NaN]]) {
      expect(() => decodeMask({ width: 3, height: 2, counts })).toThrow();
    }
    expect(() =>
      decodeMask({ width: 1e8, height: 1, counts: [1e8] }),
    ).toThrow();
    expect(() => encodeMask(new Uint8Array(2), 3, 2)).toThrow();
  });
  it("samples source timestamps and avoids seeking past the last frame", () => {
    expect(planVideoFrames(30, 5, 9, 3)).toEqual([5, 7, 9]);
    const times = planVideoFrames(8, 0, 8, 48);
    expect(times).toHaveLength(48);
    expect(times[47]).toBeLessThan(8);
    expect(new Set(times).size).toBe(48);
    expect(() => planVideoFrames(Infinity, 0, 8, 10)).toThrow();
    expect(() => planVideoFrames(30, 0, 13, 10)).toThrow();
    expect(() => planVideoFrames(30, 0, 8, 1000)).toThrow();
    expect(() => planVideoFrames(8, 7.99, 8, 2)).toThrow();
  });
});
