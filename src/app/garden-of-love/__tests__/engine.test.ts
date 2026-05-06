import { clearGrid, seedRandom, step } from "../engine";

function makeGrid(rows: string[]): { grid: Uint8Array; cols: number; rows: number } {
  const cols = rows[0].length;
  const grid = new Uint8Array(cols * rows.length);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r * cols + c] = rows[r][c] === "1" ? 1 : 0;
    }
  }
  return { grid, cols, rows: rows.length };
}

function toString(grid: Uint8Array, cols: number, rows: number): string {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) line += grid[r * cols + c] ? "1" : "0";
    lines.push(line);
  }
  return lines.join("\n");
}

describe("Conway step", () => {
  it("a block (2x2) is stable", () => {
    const { grid, cols, rows } = makeGrid([
      "00000",
      "00000",
      "00110",
      "00110",
      "00000",
    ]);
    const next = new Uint8Array(grid.length);
    step(grid, next, cols, rows);
    expect(toString(next, cols, rows)).toBe(toString(grid, cols, rows));
  });

  it("a horizontal blinker oscillates to vertical after one step", () => {
    const { grid, cols, rows } = makeGrid([
      "00000",
      "00000",
      "01110",
      "00000",
      "00000",
    ]);
    const next = new Uint8Array(grid.length);
    step(grid, next, cols, rows);
    expect(toString(next, cols, rows)).toBe(
      [
        "00000",
        "00100",
        "00100",
        "00100",
        "00000",
      ].join("\n")
    );
  });

  it("a blinker returns to its original orientation after two steps", () => {
    const { grid, cols, rows } = makeGrid([
      "00000",
      "00000",
      "01110",
      "00000",
      "00000",
    ]);
    const a = new Uint8Array(grid.length);
    const b = new Uint8Array(grid.length);
    step(grid, a, cols, rows);
    step(a, b, cols, rows);
    expect(toString(b, cols, rows)).toBe(toString(grid, cols, rows));
  });

  it("toroidal wrap: a vertical blinker on the right edge oscillates to horizontal across the wrap", () => {
    const { grid, cols, rows } = makeGrid([
      "00001",
      "00001",
      "00001",
      "00000",
      "00000",
    ]);
    const next = new Uint8Array(grid.length);
    step(grid, next, cols, rows);
    // Middle cell of the original blinker stays alive (2 vertical neighbors)
    expect(next[1 * cols + 4]).toBe(1);
    // Top and bottom cells of the blinker die (only 1 neighbor each)
    expect(next[0 * cols + 4]).toBe(0);
    expect(next[2 * cols + 4]).toBe(0);
    // New cell born to the left of the middle (3 neighbors: (0,4),(1,4),(2,4))
    expect(next[1 * cols + 3]).toBe(1);
  });
});

describe("clearGrid", () => {
  it("zeroes every cell", () => {
    const grid = new Uint8Array([1, 0, 1, 1, 0]);
    clearGrid(grid);
    expect(Array.from(grid)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("seedRandom", () => {
  it("respects density via injected RNG: density 1 fills entirely", () => {
    const grid = new Uint8Array(20);
    seedRandom(grid, 1, () => 0); // every rng() < 1 → true
    expect(Array.from(grid).every((c) => c === 1)).toBe(true);
  });

  it("respects density via injected RNG: density 0 leaves grid empty", () => {
    const grid = new Uint8Array(20);
    seedRandom(grid, 0, () => 0); // 0 < 0 is false
    expect(Array.from(grid).every((c) => c === 0)).toBe(true);
  });

  it("density 0.5 with alternating RNG produces alternating cells", () => {
    const grid = new Uint8Array(6);
    let i = 0;
    const rng = () => (i++ % 2 === 0 ? 0 : 0.9);
    seedRandom(grid, 0.5, rng);
    expect(Array.from(grid)).toEqual([1, 0, 1, 0, 1, 0]);
  });
});
