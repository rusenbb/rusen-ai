import { describe, expect, it } from "vitest";
import { createProjection, HEIGHT, WIDTH } from "./scene";
describe("video volume projection", () => {
  it("fits every corner at mobile and desktop sizes across all view limits", () => {
    for (const [width, height] of [
      [326, 340],
      [1150, 560],
    ]) {
      for (const yaw of [-180, -90, 0, 42, 90, 180])
        for (const pitch of [-70, 16, 70])
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

it("zooms around the viewport center without moving the volume center", () => {
  const normal = createProjection(800, 600, 42, 16, 800, 1),
    zoomed = createProjection(800, 600, 42, 16, 800, 2);
  expect(zoomed(WIDTH / 2, HEIGHT / 2, 0.5)).toEqual([400, 300]);
  const a = normal(0, 0, 0),
    b = zoomed(0, 0, 0);
  expect(b[0] - 400).toBeCloseTo((a[0] - 400) * 2);
  expect(b[1] - 300).toBeCloseTo((a[1] - 300) * 2);
});
