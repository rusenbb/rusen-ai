export interface Point {
  x: number;
  y: number;
}
export interface Example extends Point {
  label: 0 | 1;
}
export type Dataset = "moons" | "rings" | "xor";

/** Euclidean k-NN. Equal votes use the closest neighbor as a deterministic tie break. */
export function classifyPoint(
  query: Point,
  examples: readonly Example[],
  k: number,
) {
  const neighbors = examples
    .map((point, index) => ({
      ...point,
      index,
      distance: Math.hypot(point.x - query.x, point.y - query.y),
    }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)
    .slice(0, k);
  if (neighbors.length === 0) return null;
  const fraction =
    neighbors.filter((point) => point.label === 1).length / neighbors.length;
  const label: 0 | 1 =
    fraction === 0.5 ? neighbors[0].label : fraction > 0.5 ? 1 : 0;
  return { label, fraction, neighbors };
}

export function leaveOneOutAccuracy(
  examples: readonly Example[],
  k: number,
): number | null {
  if (examples.length < 2) return null;
  let correct = 0;
  for (let i = 0; i < examples.length; i++) {
    const others = examples.filter((_, index) => index !== i);
    if (classifyPoint(examples[i], others, k)?.label === examples[i].label)
      correct++;
  }
  return correct / examples.length;
}

/** Fixed synthetic examples keep comparisons reproducible without a random generator. */
export function makeDataset(dataset: Dataset): Example[] {
  return Array.from({ length: 40 }, (_, i) => {
    const label = (i % 2) as 0 | 1;
    const t = Math.floor(i / 2) / 19;
    if (dataset === "moons") {
      const angle = t * Math.PI;
      return label === 0
        ? {
            x: -0.3 + 0.6 * Math.cos(angle),
            y: -0.15 + 0.65 * Math.sin(angle),
            label,
          }
        : {
            x: 0.3 - 0.6 * Math.cos(angle),
            y: 0.15 - 0.65 * Math.sin(angle),
            label,
          };
    }
    if (dataset === "rings") {
      const angle = (Math.floor(i / 2) / 20) * 2 * Math.PI;
      const radius = label === 0 ? 0.3 : 0.8;
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        label,
      };
    }
    const x = ((i % 8) - 3.5) / 4;
    const y = (Math.floor(i / 8) - 2) / 2.5 + 0.06;
    return { x, y, label: x * y >= 0 ? 1 : 0 };
  });
}
