import { describe, expect, it } from "vitest";

import {
  dft,
  evaluateFourier,
  makeHeartPath,
  reconstructPath,
  resampleClosedPath,
} from "./math";

describe("Fourier sketch math", () => {
  it("reconstructs a sampled complex path from all DFT terms", () => {
    const samples = makeHeartPath(48);
    const terms = dft(samples);
    samples.forEach((point, index) => {
      const reconstructed = evaluateFourier(terms, index / samples.length);
      expect(reconstructed.x).toBeCloseTo(point.x, 8);
      expect(reconstructed.y).toBeCloseTo(point.y, 8);
    });
  });

  it("resamples a stroke to the requested number of points", () => {
    const resampled = resampleClosedPath([{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], 32);
    expect(resampled).toHaveLength(32);
  });

  it("has one independently useful DFT term per sampled point", () => {
    const samples = resampleClosedPath(makeHeartPath(), 128);
    const terms = dft(samples);
    expect(terms).toHaveLength(128);
    samples.forEach((point, index) => {
      const reconstructed = evaluateFourier(terms, index / samples.length);
      expect(reconstructed.x).toBeCloseTo(point.x, 8);
      expect(reconstructed.y).toBeCloseTo(point.y, 8);
    });
  });

  it("creates a closed reconstruction trace", () => {
    const trace = reconstructPath(dft(makeHeartPath(64)), 120);
    expect(trace).toHaveLength(120);
    expect(Math.hypot(trace[0].x - trace.at(-1)!.x, trace[0].y - trace.at(-1)!.y)).toBeLessThan(0.12);
  });
});
