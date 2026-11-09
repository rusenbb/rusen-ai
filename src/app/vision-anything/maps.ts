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

/** Overlay opacity is score² × this, so weak regions stay clear. */
export const OVERLAY_ALPHA = 190;
/** Below this opacity (out of 255) a tint is hard to see on a photo. */
const MIN_VISIBLE_ALPHA = 25;

/** True when at least one pixel is strong enough to show as a tint. */
export function hasVisibleRegion(probabilities: Float32Array): boolean {
  const threshold = Math.sqrt(MIN_VISIBLE_ALPHA / OVERLAY_ALPHA);
  return probabilities.some((value) => value >= threshold);
}
