/** Placement of an object-contain image inside the demos' 4:3 viewport. */
export function containedImageStyle(aspect: number) {
  const width = Math.min(100, (100 * aspect) / (4 / 3));
  const height = Math.min(100, (100 * (4 / 3)) / aspect);
  return {
    width: `${width}%`,
    height: `${height}%`,
    left: `${(100 - width) / 2}%`,
    top: `${(100 - height) / 2}%`,
  };
}

export function maskProbabilities(raw: Float32Array): Float32Array {
  return Float32Array.from(raw, (value) => 1 / (1 + Math.exp(-value)));
}
