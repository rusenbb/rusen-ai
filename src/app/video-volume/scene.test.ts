import { describe, expect, it } from "vitest";
import {
  createProjection,
  HEIGHT,
  matchingKinds,
  tracksAt,
  WIDTH,
} from "./scene";

describe("video volume tracks", () => {
  it("keeps identities and contours in frame across the complete sequence", () => {
    const ids = tracksAt(0).map((track) => track.id);
    for (let i = 0; i <= 96; i++) {
      const tracks = tracksAt(i / 96);
      expect(tracks.map((track) => track.id)).toEqual(ids);
      for (const track of tracks) {
        expect(
          track.points.every(
            ([x, y]) => x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT,
          ),
        ).toBe(true);
      }
    }
    expect(tracksAt(0)[2].points).toEqual(tracksAt(1)[2].points);
    expect(tracksAt(0)[0].points).not.toEqual(tracksAt(1)[0].points);
    expect(tracksAt(-1)).toEqual(tracksAt(0));
    expect(tracksAt(2)).toEqual(tracksAt(1));
  });
  it("supports named filters and never silently treats an unknown query as all", () => {
    expect(matchingKinds(" Cars ")).toEqual(["car"]);
    expect(matchingKinds("people")).toEqual(["person"]);
    expect(matchingKinds("yaya")).toEqual(["person"]);
    expect(matchingKinds("")).toEqual(["car", "person"]);
    expect(matchingKinds("bicycle")).toEqual([]);
  });
  it("fits every corner at mobile and desktop sizes across all view limits", () => {
    for (const [width, height] of [
      [326, 340],
      [1150, 560],
    ]) {
      for (const yaw of [15, 42, 70])
        for (const pitch of [-20, 16, 35])
          for (const depth of [400, 1200]) {
            const project = createProjection(width, height, yaw, pitch, depth);
            for (const x of [0, WIDTH])
              for (const y of [0, HEIGHT])
                for (const t of [0, 1]) {
                  const [px, py] = project(x, y, t);
                  expect(px).toBeGreaterThanOrEqual(20);
                  expect(px).toBeLessThanOrEqual(width - 20);
                  expect(py).toBeGreaterThanOrEqual(35);
                  expect(py).toBeLessThanOrEqual(height - 35);
                }
          }
    }
  });
});
