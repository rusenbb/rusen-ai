import { describe, expect, it } from "vitest";

import { processedDimensions } from "./raster";

describe("convolution image raster sizing", () => {
  it("keeps the source aspect ratio while capping the working edge", () => {
    expect(processedDimensions(800, 600, 144)).toEqual({ width: 144, height: 108 });
    expect(processedDimensions(80, 200, 144)).toEqual({ width: 58, height: 144 });
  });

  it("does not enlarge already-small images", () => {
    expect(processedDimensions(64, 40, 144)).toEqual({ width: 64, height: 40 });
  });
});
