import { describe, expect, it } from "vitest";
import { createProjection, HEIGHT, WIDTH } from "./scene";
describe("video volume projection", () => {
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
