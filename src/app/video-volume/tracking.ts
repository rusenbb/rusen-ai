export type Box = [number, number, number, number];
export type Detection = { label: string; score: number; box: Box };
export type TrackedDetection = Detection & { id: number };
type Memory = TrackedDetection & { missed: number };

export function boxIoU(a: Box, b: Box): number {
  const intersection =
    Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
    Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const union =
    Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]) +
    Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]) -
    intersection;
  return union > 0 ? intersection / union : 0;
}

/** Tracking by detection, not SAM's temporal-memory predictor. */
export class DetectionTracker {
  private nextId = 1;
  private previous: Memory[] = [];
  update(detections: Detection[]): TrackedDetection[] {
    const pairs = detections
      .flatMap((detection, current) =>
        this.previous.flatMap((old, previous) => {
          const iou =
            old.label === detection.label ? boxIoU(old.box, detection.box) : 0;
          return iou >= 0.15 ? [{ current, previous, iou }] : [];
        }),
      )
      .sort((a, b) => b.iou - a.iou);
    const assignments = new Map<number, number>();
    const used = new Set<number>();
    for (const pair of pairs) {
      if (assignments.has(pair.current) || used.has(pair.previous)) continue;
      assignments.set(pair.current, this.previous[pair.previous].id);
      used.add(pair.previous);
    }
    const tracked = detections.map((detection, index) => ({
      ...detection,
      id: assignments.get(index) ?? this.nextId++,
    }));
    this.previous = [
      ...tracked.map((object) => ({ ...object, missed: 0 })),
      ...this.previous
        .filter((old, index) => !used.has(index) && old.missed < 1)
        .map((old) => ({ ...old, missed: old.missed + 1 })),
    ];
    return tracked;
  }
}

export function parseDetections(
  logits: ArrayLike<number>,
  boxes: ArrayLike<number>,
  queries: number,
  classes: number,
  labels: Record<string, string>,
  selected: string,
  threshold = 0.75,
): Detection[] {
  const results: Detection[] = [];
  for (let q = 0; q < queries; q++) {
    let maximum = -Infinity,
      label = 0;
    for (let c = 0; c < classes; c++)
      if (logits[q * classes + c] > maximum) {
        maximum = logits[q * classes + c];
        label = c;
      }
    if (label === classes - 1 || labels[String(label)] !== selected) continue;
    let sum = 0;
    for (let c = 0; c < classes; c++)
      sum += Math.exp(logits[q * classes + c] - maximum);
    const score = 1 / sum;
    if (score < threshold) continue;
    const cx = boxes[q * 4],
      cy = boxes[q * 4 + 1],
      w = boxes[q * 4 + 2],
      h = boxes[q * 4 + 3];
    const box: Box = [
      Math.max(0, cx - w / 2),
      Math.max(0, cy - h / 2),
      Math.min(1, cx + w / 2),
      Math.min(1, cy + h / 2),
    ];
    if (!box.every(Number.isFinite) || box[2] <= box[0] || box[3] <= box[1])
      continue;
    results.push({ label: selected, score, box });
  }
  const kept: Detection[] = [];
  for (const candidate of results.sort((a, b) => b.score - a.score)) {
    if (kept.every((old) => boxIoU(old.box, candidate.box) < 0.6))
      kept.push(candidate);
    if (kept.length === 3) break;
  }
  return kept;
}
