import { describe, expect, it } from "vitest";

import {
  convolve2d,
  convolveRgbDepthwise,
  findResponseAnchor,
  luminanceMatrix,
  maxPool,
  normaliseMatrix,
  receptiveField,
  reluMatrix,
  rgbRasterFromRgba,
} from "./convolution";

describe("convolution lab math", () => {
  it("applies a kernel at every valid input window", () => {
    const output = convolve2d(
      [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      [
        [1, 0],
        [0, -1],
      ],
    );

    expect(output).toEqual([
      [-4, -4],
      [-4, -4],
    ]);
  });

  it("supports zero padding and max pooling", () => {
    expect(convolve2d([[1]], [[1]], { padding: 1 })).toEqual([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]);
    expect(maxPool([
      [1, 3, 2, 0],
      [2, 4, 1, 1],
      [0, 1, 5, 2],
      [2, 3, 4, 6],
    ])).toEqual([
      [4, 2],
      [3, 6],
    ]);
    expect(reluMatrix([
      [-4, 0, 3],
      [2, -1, 5],
    ])).toEqual([
      [0, 0, 3],
      [2, 0, 5],
    ]);
    expect(maxPool(reluMatrix([
      [-8, -2],
      [-5, -1],
    ]))).toEqual([[0]]);
  });

  it("finds genuine positive, negative, and flat response anchors", () => {
    const responses = [
      [3, -7, 0.4],
      [-2, 0.05, 5],
    ];

    expect(findResponseAnchor(responses, "positive")).toEqual({ row: 1, col: 2, value: 5 });
    expect(findResponseAnchor(responses, "negative")).toEqual({ row: 0, col: 1, value: -7 });
    expect(findResponseAnchor(responses, "flat")).toEqual({ row: 1, col: 1, value: 0.05 });
    expect(findResponseAnchor([[-2, 0]], "positive")).toBeNull();
  });

  it("maps output cells back to their receptive field", () => {
    expect(receptiveField(1, 2, 3, 3, 2, 1)).toContainEqual({ row: 1, col: 3 });
    expect(normaliseMatrix([[2, 4]])).toEqual([[0, 1]]);
  });

  it("preserves RGB channels while deriving a luminance image", () => {
    const raster = rgbRasterFromRgba(
      [
        255, 0, 0, 255,
        0, 255, 0, 255,
      ],
      2,
      1,
    );

    expect(luminanceMatrix(raster)[0][0]).toBeCloseTo(54.213);
    expect(luminanceMatrix(raster)[0][1]).toBeCloseTo(182.376);
    expect(convolveRgbDepthwise(raster, [[1]])).toMatchObject({
      width: 2,
      height: 1,
      red: [[255, 0]],
      green: [[0, 255]],
      blue: [[0, 0]],
    });
  });
});
