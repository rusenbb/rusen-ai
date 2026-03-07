// Port of Sampler.hx — samples individual bits and patterns from the quadtree

import { Graph } from "./graph";
import { Frames } from "./frames";

const PERIOD = 35328;

function fabricatePrevPattern(pattern: number): number {
  const now = (pattern >> 4) & 1;
  const prev = now ^ ((pattern >> 9) & 1);
  return (7 & -now) | (16 & -prev);
}

export class Sampler {
  constructor(
    readonly graph: Graph,
    readonly frames: Frames
  ) {}

  sampleLocation(pattern: number): {
    x: number;
    y: number;
    time: number;
    pattern: number;
  } {
    const loc = this.frames.location;
    const index = loc.indices[pattern];
    const index2 = Math.floor(Math.random() * 64);
    const posTime = loc.posTimes[index][index2];
    const parentPattern = loc.patterns[index2];
    return {
      x: posTime[0],
      y: posTime[1],
      time: posTime[2],
      pattern: parentPattern,
    };
  }

  samplePattern(
    time: number,
    x: number,
    y: number,
    patterns: (number | null)[]
  ): number {
    const centerPrev =
      time > 0
        ? this.sampleBit(time - 1, x, y, patterns[4]!)
        : this.sampleBit(
            PERIOD - 1,
            x,
            y,
            fabricatePrevPattern(patterns[4]!)
          );
    let bit = centerPrev;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        const p = patterns[((cy >> 11) + 1) * 3 + ((cx >> 11) + 1)]!;
        bit |= this.sampleBit(time, cx, cy, p) << ((dy + 1) * 3 + (dx + 1));
      }
    }
    bit ^= ((bit >> 4) & 1) << 9;
    return bit;
  }

  sampleBit(time: number, x: number, y: number, pattern: number): number {
    if (time === -1) {
      time += PERIOD;
      pattern = fabricatePrevPattern(pattern);
    }
    x = x & 2047;
    y = y & 2047;
    const tx = x >> 9;
    const ty = y >> 9;
    const nodeIndex = this.frames.getTile(time, pattern, tx, ty);
    return this.graph.getBit(9, nodeIndex, x & 511, y & 511);
  }

  getTiles(time: number, pattern: number): number[] {
    if (time === -1) {
      time += PERIOD;
      pattern = fabricatePrevPattern(pattern);
    }
    return this.frames.getTiles(time, pattern);
  }

  getTile(
    time: number,
    pattern: number,
    tileX: number,
    tileY: number
  ): number {
    if (time === -1) {
      time += PERIOD;
      pattern = fabricatePrevPattern(pattern);
    }
    return this.frames.getTile(time, pattern, tileX, tileY);
  }
}
