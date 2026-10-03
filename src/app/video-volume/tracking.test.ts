import { expect, it } from "vitest";
import { DetectionTracker, parseDetections, type Detection } from "./tracking";
const object = (x: number, label = "car"): Detection => ({
  label,
  score: 0.9,
  box: [x, 0, x + 0.2, 0.2],
});
it("associates by overlap despite reordered detections, with one missed-frame grace", () => {
  const tracker = new DetectionTracker();
  expect(tracker.update([object(0), object(0.7)]).map((o) => o.id)).toEqual([
    1, 2,
  ]);
  expect(tracker.update([object(0.69), object(0.01)]).map((o) => o.id)).toEqual(
    [2, 1],
  );
  tracker.update([]);
  expect(tracker.update([object(0.02)]).map((o) => o.id)).toEqual([1]);
  expect(tracker.update([object(0.02, "person")]).map((o) => o.id)).toEqual([
    3,
  ]);
  tracker.update([]);
  tracker.update([]);
  expect(tracker.update([object(0.02, "person")])[0].id).toBe(4);
});
it("suppresses duplicate boxes and excludes no-object predictions", () => {
  const detections = parseDetections(
    [10, 0, 9, 0, 0, 10],
    [0.5, 0.5, 0.3, 0.3, 0.51, 0.5, 0.3, 0.3, 0.1, 0.1, 0.1, 0.1],
    3,
    2,
    { 0: "bird" },
    "bird",
    0.7,
  );
  expect(detections).toHaveLength(1);
  expect(detections[0].score).toBeGreaterThan(0.99);
});

it("preserves a quarter-second association window at 12 fps without inventing detections", () => {
  const tracker = new DetectionTracker(2);
  expect(tracker.update([object(0)])[0].id).toBe(1);
  expect(tracker.update([])).toEqual([]);
  expect(tracker.update([])).toEqual([]);
  expect(tracker.update([object(0.01)])[0].id).toBe(1);
});
