// Port of Level.hx — recursive level hierarchy for infinite zoom

import { Sampler } from "./sampler";

const PERIOD = 35328;

type Parent =
  | { type: "level"; level: Level }
  | { type: "undetermined"; time: number; pattern: number };

function div(x: number): number {
  return x >> 11;
}

function mod(x: number): number {
  return x & 2047;
}

// Manual stack-based recursion elimination constants
const GET_PATTERN = 0;
const GET_PATTERN1 = 1;
// GET_PATTERN2..GET_PATTERN10 = 2..10
const GET_PATTERN10 = 10;
const GET_BIT = 11;
const GET_BIT1 = 12;

const DIFF_X = [0, 1, -1, 0, 1, -1, 0, 1, 0];
const DIFF_Y = [-1, -1, 0, 0, 0, 1, 1, 1, 0];

export class Level {
  posX: number;
  posY: number;
  time: number;
  private parent: Parent;
  private readonly patternCache = new Map<number, number>();
  private readonly sampler: Sampler;

  constructor(
    posX: number,
    posY: number,
    time: number,
    parent: Parent,
    sampler: Sampler
  ) {
    this.posX = posX;
    this.posY = posY;
    this.time = time;
    this.parent = parent;
    this.sampler = sampler;
  }

  static generateRandomLevel(sampler: Sampler): Level {
    const index = Math.floor(Math.random() * 64);
    const loc = sampler.sampleLocation(
      sampler.frames.location.patterns[index]
    );
    return new Level(
      loc.x,
      loc.y,
      0,
      { type: "undetermined", time: loc.time, pattern: loc.pattern },
      sampler
    );
  }

  translate(dx: number, dy: number): void {
    Level.translateImpl(this, dx, dy);
  }

  private static translateImpl(
    startLevel: Level,
    dx: number,
    dy: number
  ): void {
    const levels: Level[] = [];
    const deltas: number[] = [];
    let level = startLevel;
    let depth = 0;

    while (true) {
      levels.push(level);
      const px = level.posX;
      const py = level.posY;
      level.posX += dx;
      level.posY += dy;
      dx = div(level.posX);
      dy = div(level.posY);
      level.posX = mod(level.posX);
      level.posY = mod(level.posY);
      deltas.push(level.posY - py);
      deltas.push(level.posX - px);
      depth++;
      if (dx === 0 && dy === 0) break;
      level = level.getParent();
    }

    let dxTotal = 0;
    let dyTotal = 0;
    const newCache: number[] = [];
    let cut = false;

    while (deltas.length > 0) {
      depth--;
      const lvl = levels.pop()!;
      const ddx = deltas.pop()!;
      const ddy = deltas.pop()!;

      if (!cut) {
        dxTotal -= ddx;
        dyTotal -= ddy;
        if (depth < 1000) {
          for (const [key, value] of lvl.patternCache) {
            const x = ((key & 0xffff) << 16) >> 16;
            const y = key >> 16;
            const newX = x + dxTotal;
            const newY = y + dyTotal;
            if (
              newX >= -2048 &&
              newX < 2048 &&
              newY >= -2048 &&
              newY < 2048
            ) {
              const newKey = (newX & 0xffff) | ((newY & 0xffff) << 16);
              newCache.push(value);
              newCache.push(newKey);
            }
          }
        }
      }

      lvl.patternCache.clear();

      if (!cut) {
        while (newCache.length > 0) {
          const nk = newCache.pop()!;
          const nv = newCache.pop()!;
          lvl.patternCache.set(nk, nv);
        }
        dxTotal *= 2048;
        dyTotal *= 2048;
        if (Math.abs(dxTotal) + Math.abs(dyTotal) > 10000) cut = true;
      }
    }
  }

  getParent(): Level {
    if (this.parent.type === "level") {
      return this.parent.level;
    }
    const loc = this.sampler.sampleLocation(this.parent.pattern);
    const level = new Level(
      loc.x,
      loc.y,
      this.parent.time,
      { type: "undetermined", time: loc.time, pattern: loc.pattern },
      this.sampler
    );
    this.parent = { type: "level", level };
    return level;
  }

  makeSubLevel(x: number, y: number, time: number): Level {
    return new Level(x, y, time, { type: "level", level: this }, this.sampler);
  }

  private getParentTime(): number {
    if (this.parent.type === "level") {
      return this.parent.level.time;
    }
    return this.parent.time;
  }

  getPatternOfCell(relX: number, relY: number): number {
    return Level.getPatternOfCellImpl(this, relX, relY, this.sampler);
  }

  // Manual stack-based recursion elimination — direct port from Haxe
  private static getPatternOfCellImpl(
    level: Level,
    relX: number,
    relY: number,
    sampler: Sampler
  ): number {
    const stackI: number[] = [];
    const stackL: Level[] = [];

    stackL.push(level);
    stackI.push(relY);
    stackI.push(relX);
    stackI.push(GET_PATTERN);

    let ret = -1;

    while (stackL.length > 0) {
      const lvl = stackL.pop()!;
      const op = stackI.pop()!;

      if (op === GET_PATTERN) {
        const rx = stackI.pop()!;
        const ry = stackI.pop()!;
        const key = (rx & 0xffff) | ((ry & 0xffff) << 16);
        if (lvl.patternCache.has(key)) {
          ret = lvl.patternCache.get(key)!;
        } else {
          stackL.push(lvl);
          stackI.push(0);
          stackI.push(ry);
          stackI.push(rx);
          stackI.push(GET_PATTERN1);
          stackL.push(lvl);
          stackI.push(0); // prev = false
          stackI.push(ry - 1);
          stackI.push(rx - 1);
          stackI.push(GET_BIT);
        }
      } else if (op >= GET_PATTERN1 && op <= GET_PATTERN1 + 8) {
        const step = op - GET_PATTERN1;
        const rx = stackI.pop()!;
        const ry = stackI.pop()!;
        const bit = stackI.pop()! | (ret << step);
        stackL.push(lvl);
        stackI.push(bit);
        stackI.push(ry);
        stackI.push(rx);
        stackI.push(GET_PATTERN1 + 1 + step);
        stackL.push(lvl);
        stackI.push(step === 8 ? 1 : 0); // prev flag for last iteration
        stackI.push(ry + DIFF_Y[step]);
        stackI.push(rx + DIFF_X[step]);
        stackI.push(GET_BIT);
      } else if (op === GET_PATTERN10) {
        const rx = stackI.pop()!;
        const ry = stackI.pop()!;
        const key = (rx & 0xffff) | ((ry & 0xffff) << 16);
        let bit = stackI.pop()! | (ret << 9);
        bit ^= ((bit >> 4) & 1) << 9;
        lvl.patternCache.set(key, bit);
        ret = bit;
      } else if (op === GET_BIT) {
        const rx = stackI.pop()!;
        const ry = stackI.pop()!;
        const prev = stackI.pop()!;
        const x = lvl.posX + rx;
        const y = lvl.posY + ry;
        const px = div(x);
        const py = div(y);
        if (
          lvl.parent.type === "undetermined" &&
          px === 0 &&
          py === 0
        ) {
          ret = sampler.sampleBit(
            lvl.getParentTime() - prev,
            mod(x),
            mod(y),
            lvl.parent.pattern
          );
        } else {
          stackL.push(lvl);
          stackI.push(prev);
          stackI.push(mod(y));
          stackI.push(mod(x));
          stackI.push(GET_BIT1);
          stackL.push(lvl.getParent());
          stackI.push(py);
          stackI.push(px);
          stackI.push(GET_PATTERN);
        }
      } else if (op === GET_BIT1) {
        const modX = stackI.pop()!;
        const modY = stackI.pop()!;
        const prev = stackI.pop()!;
        ret = sampler.sampleBit(
          lvl.getParentTime() - prev,
          modX,
          modY,
          ret
        );
      }
    }

    return ret;
  }

  forward(delta: number): boolean {
    this.patternCache.clear();
    this.time += delta;
    const pt = Math.floor(this.time / PERIOD);
    if (pt !== 0) {
      this.time -= pt * PERIOD;
      this.getParent().forward(pt);
      return true;
    }
    return false;
  }
}
