type CellKey = `${number},${number}`;

function toKey(x: number, y: number): CellKey {
  return `${x},${y}`;
}

function fromKey(key: CellKey): [number, number] {
  const i = key.indexOf(",");
  return [parseInt(key.slice(0, i), 10), parseInt(key.slice(i + 1), 10)];
}

const NEIGHBOR_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export class GameEngine {
  cells: Set<CellKey> = new Set();
  generation = 0;

  tick(): void {
    const neighborCounts = new Map<CellKey, number>();

    for (const key of this.cells) {
      const [x, y] = fromKey(key);
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const nk = toKey(x + dx, y + dy);
        neighborCounts.set(nk, (neighborCounts.get(nk) ?? 0) + 1);
      }
    }

    const next = new Set<CellKey>();
    for (const [key, count] of neighborCounts) {
      if (count === 3 || (count === 2 && this.cells.has(key))) {
        next.add(key);
      }
    }

    this.cells = next;
    this.generation++;
  }

  isAlive(x: number, y: number): boolean {
    return this.cells.has(toKey(x, y));
  }

  toggle(x: number, y: number): void {
    const key = toKey(x, y);
    if (this.cells.has(key)) {
      this.cells.delete(key);
    } else {
      this.cells.add(key);
    }
  }

  getCellsInBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    for (const key of this.cells) {
      const [x, y] = fromKey(key);
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        result.push([x, y]);
      }
    }
    return result;
  }

  seed(cells: Array<[number, number]>): void {
    for (const [x, y] of cells) {
      this.cells.add(toKey(x, y));
    }
  }

  clear(): void {
    this.cells.clear();
    this.generation = 0;
  }
}
