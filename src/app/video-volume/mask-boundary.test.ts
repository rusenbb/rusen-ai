import { expect, it } from "vitest";
import { maskBoundary } from "./mask-boundary";
it("reduces a solid rectangle to four edges and preserves holes and isolated pixels exactly", () => {
  expect(maskBoundary(new Uint8Array(9).fill(1), 3, 3)).toHaveLength(4);
  for (const pixels of [
    [1, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ]) {
    const expected = new Set<string>();
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++)
        if (pixels[y * 3 + x]) {
          if (y === 0 || !pixels[(y - 1) * 3 + x])
            expected.add(`${x},${y},${x + 1},${y}`);
          if (y === 2 || !pixels[(y + 1) * 3 + x])
            expected.add(`${x},${y + 1},${x + 1},${y + 1}`);
          if (x === 0 || !pixels[y * 3 + x - 1])
            expected.add(`${x},${y},${x},${y + 1}`);
          if (x === 2 || !pixels[y * 3 + x + 1])
            expected.add(`${x + 1},${y},${x + 1},${y + 1}`);
        }
    const actual = new Set<string>();
    for (const [x, y, xx, yy] of maskBoundary(Uint8Array.from(pixels), 3, 3)) {
      if (y === yy)
        for (let a = x; a < xx; a++) actual.add(`${a},${y},${a + 1},${y}`);
      else for (let b = y; b < yy; b++) actual.add(`${x},${b},${x},${b + 1}`);
    }
    expect(actual).toEqual(expected);
  }
});
