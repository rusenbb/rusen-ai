export interface Point {
  x: number;
  y: number;
}

export interface FourierTerm {
  frequency: number;
  re: number;
  im: number;
  amplitude: number;
  phase: number;
}

function distance(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

/**
 * Evenly samples a path by arc length and closes it. DFT assumes a periodic
 * signal; closing the stroke makes that assumption visible rather than hiding
 * an arbitrary final jump in the sample sequence.
 */
export function resampleClosedPath(points: readonly Point[], count: number): Point[] {
  if (count <= 0 || points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: count }, () => ({ ...points[0] }));

  const segments = points.map((point, index) => ({
    from: point,
    to: points[(index + 1) % points.length],
  }));
  const lengths = segments.map(({ from, to }) => distance(from, to));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return Array.from({ length: count }, () => ({ ...points[0] }));

  const samples: Point[] = [];
  let segmentIndex = 0;
  let traversed = 0;
  for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
    const target = (sampleIndex / count) * total;
    while (
      segmentIndex < segments.length - 1 &&
      traversed + lengths[segmentIndex] < target
    ) {
      traversed += lengths[segmentIndex];
      segmentIndex += 1;
    }
    const segment = segments[segmentIndex];
    const fraction = lengths[segmentIndex] === 0 ? 0 : (target - traversed) / lengths[segmentIndex];
    samples.push({
      x: segment.from.x + (segment.to.x - segment.from.x) * fraction,
      y: segment.from.y + (segment.to.y - segment.from.y) * fraction,
    });
  }
  return samples;
}

/** A direct complex DFT. Coefficients are normalized so amplitudes remain in path units. */
export function dft(points: readonly Point[]): FourierTerm[] {
  const count = points.length;
  if (count === 0) return [];
  const terms: FourierTerm[] = [];
  for (let index = 0; index < count; index += 1) {
    let re = 0;
    let im = 0;
    for (let sample = 0; sample < count; sample += 1) {
      const angle = (-2 * Math.PI * index * sample) / count;
      const point = points[sample];
      re += point.x * Math.cos(angle) - point.y * Math.sin(angle);
      im += point.x * Math.sin(angle) + point.y * Math.cos(angle);
    }
    re /= count;
    im /= count;
    terms.push({
      frequency: index <= count / 2 ? index : index - count,
      re,
      im,
      amplitude: Math.hypot(re, im),
      phase: Math.atan2(im, re),
    });
  }
  return terms.sort((left, right) => right.amplitude - left.amplitude);
}

export function evaluateFourier(terms: readonly FourierTerm[], time: number): Point {
  return terms.reduce<Point>((point, term) => {
    const angle = 2 * Math.PI * term.frequency * time;
    return {
      x: point.x + term.re * Math.cos(angle) - term.im * Math.sin(angle),
      y: point.y + term.re * Math.sin(angle) + term.im * Math.cos(angle),
    };
  }, { x: 0, y: 0 });
}

export function reconstructPath(terms: readonly FourierTerm[], samples = 220): Point[] {
  if (terms.length === 0) return [];
  return Array.from({ length: samples }, (_, index) =>
    evaluateFourier(terms, index / samples),
  );
}

export function makeHeartPath(count = 180): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const t = (2 * Math.PI * index) / count;
    return {
      x: (16 * Math.sin(t) ** 3) / 19,
      y: (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 19,
    };
  });
}

export function makeLissajousPath(count = 180): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const t = (2 * Math.PI * index) / count;
    return { x: 0.82 * Math.sin(3 * t + Math.PI / 2), y: 0.82 * Math.sin(2 * t) };
  });
}

export function makeSpiralPath(count = 180): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const t = (4.5 * Math.PI * index) / (count - 1);
    const radius = 0.12 + (0.78 * index) / (count - 1);
    return { x: radius * Math.cos(t), y: radius * Math.sin(t) };
  });
}
