export type BoundarySegment = [number, number, number, number];
/** Merge collinear pixel-boundary edges exactly. No smoothing or mask interpolation. */
export function maskBoundary(
  data: Uint8Array,
  width: number,
  height: number,
): BoundarySegment[] {
  const segments: BoundarySegment[] = [];
  for (let y = 0; y <= height; y++) {
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const edge =
        x < width &&
        (y > 0 ? data[(y - 1) * width + x] : 0) !==
          (y < height ? data[y * width + x] : 0);
      if (edge && start < 0) start = x;
      if (!edge && start >= 0) {
        segments.push([start, y, x, y]);
        start = -1;
      }
    }
  }
  for (let x = 0; x <= width; x++) {
    let start = -1;
    for (let y = 0; y <= height; y++) {
      const edge =
        y < height &&
        (x > 0 ? data[y * width + x - 1] : 0) !==
          (x < width ? data[y * width + x] : 0);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) {
        segments.push([x, start, x, y]);
        start = -1;
      }
    }
  }
  return segments;
}
