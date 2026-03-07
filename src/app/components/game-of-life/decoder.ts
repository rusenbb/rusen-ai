// Port of Decoder.hx — decodes pre-computed PNG pixel data into Graph + Frames

import { Graph } from "./graph";
import { Frames } from "./frames";

const PERIOD = 35328;

export class Decoder {
  readonly graph = new Graph();
  readonly frames = new Frames();

  decodeGraph(pixels: number[]): void {
    let len = pixels.length;
    while ((pixels[len - 1] & 0xffffff) === 0) len--;

    const ints: number[] = [];
    for (let i = 0; i < len; i++) {
      const num = pixels[i] & 0x7ffff;
      const count = ((pixels[i] >> 19) & 31) + 1;
      for (let j = 0; j < count; j++) {
        ints.push(num);
      }
    }

    const numNodes = ints.length >> 2;
    let level = 3;
    for (let i = 0; i < numNodes; i++) {
      if (i > 0 && ints[i - 1] !== 0 && ints[i] === 0) level++;
      this.graph.add(level, [
        ints[i],
        ints[i + numNodes],
        ints[i + numNodes * 2],
        ints[i + numNodes * 3],
      ]);
    }
  }

  decodeAnim(pixels: number[]): void {
    let p = 0;
    const read = () => pixels[p++] & 0xffffff;
    const peek = () => pixels[p] & 0xffffff;

    const numPatterns = read();
    for (let i = 0; i < numPatterns; i++) {
      const pattern: number[] = [];
      let sum = 0;
      while (sum < 1024) {
        if (peek() === 0) {
          pattern.push(read());
          sum++;
        } else {
          const pos = read();
          const len = read();
          pattern.push(pos);
          pattern.push(len);
          sum += len;
        }
      }
      this.frames.addPattern(pattern);
    }

    const patternIndices: number[][] = [];
    for (let i = 0; i < PERIOD; i++) {
      const row: number[] = [];
      for (let j = 0; j < 16; j++) {
        row.push(read());
      }
      patternIndices.push(row);
    }

    for (let i = 0; i < PERIOD; i++) {
      this.frames.addFrame();
      for (let j = 0; j < 16; j++) {
        const patternIndex = patternIndices[i][j];
        const numPlaceholders =
          this.frames.patterns[patternIndex].numPlaceholders;
        const indices: number[] = [];
        for (let k = 0; k < numPlaceholders; k++) {
          indices.push(read());
        }
        this.frames.addTileToLastFrame(patternIndex, indices);
      }
    }
  }

  decodeLocation(pixels: number[]): void {
    let p = 0;
    for (let i = 0; i < 64; i++) {
      this.frames.addPatternForLocation(pixels[p++] & 0xffffff);
    }
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const xy = pixels[p++] & 0xffffff;
        const time = pixels[p++] & 0xffffff;
        this.frames.addLocation(i, xy & 0xfff, xy >> 12, time);
      }
    }
  }
}
