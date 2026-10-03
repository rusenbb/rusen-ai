import { expect, it } from "vitest";
import { selectPersistentTracks } from "../../../scripts/video-gallery-selection.mjs";
it("drops only short tracks and never fills gaps or changes retained model masks", () => {
  const mask = { width: 1, height: 1, counts: [0, 1] };
  const first = { id: 1, label: "giraffe", mask },
    short = { id: 2, label: "giraffe", mask };
  const data = {
    frames: [
      { objects: [first, short] },
      { objects: [] },
      { objects: [first] },
    ],
  };
  const result = selectPersistentTracks(data, 2);
  expect(
    result.frames.map((frame: { objects: unknown[] }) => frame.objects.length),
  ).toEqual([1, 0, 1]);
  expect(result.frames[0].objects[0]).toBe(first);
  expect(result.trackSelection.excluded).toEqual([
    { id: 2, label: "giraffe", observations: 1 },
  ]);
});
