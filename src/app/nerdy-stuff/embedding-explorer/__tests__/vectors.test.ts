import { describe, expect, it } from "vitest";
import {
  arithmetic,
  computeAxis,
  findNearest,
  normalizePoints,
  projectTo2D,
  projectVectorTo2D,
} from "../utils/vectors";
import {
  buildExplorerShareUrl,
  decodeExplorerState,
  encodeExplorerState,
  readExplorerState,
  type ExplorerUrlState,
} from "../utils/urlState";

describe("embedding explorer vector utilities", () => {
  it("computes a normalized axis from positive minus negative", () => {
    const cache = new Map<string, number[]>([
      ["warm", [1, 1]],
      ["cold", [0, 1]],
    ]);

    const axis = computeAxis(cache, "warm", "cold");

    expect(axis).not.toBeNull();
    expect(axis?.[0]).toBeCloseTo(1, 5);
    expect(axis?.[1]).toBeCloseTo(0, 5);
  });

  it("projects words and raw vectors onto 2D coordinates", () => {
    const cache = new Map<string, number[]>([
      ["alpha", [1, 0]],
      ["beta", [0, 1]],
    ]);

    const points = projectTo2D(["alpha", "beta"], cache, [1, 0], [0, 1]);
    const resultPoint = projectVectorTo2D([0.4, 0.7], [1, 0], [0, 1]);

    expect(points).toEqual([
      { word: "alpha", x: 1, y: 0 },
      { word: "beta", x: 0, y: 1 },
    ]);
    expect(resultPoint).toEqual({ x: 0.4, y: 0.7 });
  });

  it("computes vector arithmetic and nearest neighbors", () => {
    const cache = new Map<string, number[]>([
      ["queen", [0.9, 0.9]],
      ["princess", [0.8, 0.7]],
      ["car", [-0.5, 0.1]],
      ["banana", [-0.7, -0.4]],
    ]);

    const result = arithmetic([1, 0.2], [0.2, 0.1], [0.1, 0.8]);
    const nearest = findNearest(result, cache, 2, new Set(["banana"]));

    expect(result[0]).toBeCloseTo(0.9, 5);
    expect(result[1]).toBeCloseTo(0.9, 5);
    expect(nearest.map((candidate) => candidate.word)).toEqual(["queen", "princess"]);
  });

  it("normalizes point clouds without dropping metadata", () => {
    const points = normalizePoints([
      { word: "left", x: -10, y: 0, isHighlighted: true },
      { word: "right", x: 10, y: 20, isArithmeticResult: true },
    ]);

    expect(points[0]).toMatchObject({ word: "left", x: -1, y: -1, isHighlighted: true });
    expect(points[1]).toMatchObject({ word: "right", x: 1, y: 1, isArithmeticResult: true });
  });
});

describe("embedding explorer URL state", () => {
  const state: ExplorerUrlState = {
    projectionMode: "umap",
    words: ["king", "queen", "istanbul"],
    selectedWordSetIds: ["family-royalty", "cities-countries"],
    xAxis: { positive: "woman", negative: "man" },
    yAxis: { positive: "good", negative: "bad" },
    arithmeticMode: "open",
    arithmeticInputs: { a: "king", b: "man", c: "woman" },
    openArithmeticTerms: [
      { operation: "+", value: "king" },
      { operation: "-", value: "man" },
      { operation: "+", value: "woman" },
      { operation: "+", value: "royalty" },
    ],
  };

  it("encodes and decodes explorer state", () => {
    const encoded = encodeExplorerState(state);
    const decoded = decodeExplorerState(encoded);

    expect(decoded).toEqual(state);
  });

  it("reads and writes explorer state in URLs", () => {
    const url = buildExplorerShareUrl("/nerdy-stuff/embedding-explorer", "?foo=bar", state);
    const search = url.split("?")[1] ?? "";
    const decoded = readExplorerState(`?${search}`);

    expect(url).toContain("foo=bar");
    expect(decoded).toEqual(state);
  });

  it("returns null for invalid encoded state", () => {
    expect(decodeExplorerState("not-valid-base64")).toBeNull();
  });
});
