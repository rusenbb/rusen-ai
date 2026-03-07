// Port of Frames.hx — animation frame storage and pattern decompression

export interface Pattern {
  pattern: number[];
  numPlaceholders: number;
}

export interface Tile {
  patternIndex: number;
  nodeIndices: number[];
}

export interface Location {
  patterns: number[];
  indices: number[]; // 1024 entries, -1 if no mapping
  posTimes: number[][][]; // [patternIndex][entryIndex] = [x, y, time]
}

export class Frames {
  readonly patterns: Pattern[] = [];
  readonly frames: Tile[][] = [];
  readonly location: Location = {
    patterns: [],
    indices: new Array(1024).fill(-1),
    posTimes: Array.from({ length: 64 }, () => []),
  };

  addPatternForLocation(pattern: number): void {
    this.location.indices[pattern] = this.location.patterns.length;
    this.location.patterns.push(pattern);
  }

  addLocation(
    patternIndex: number,
    x: number,
    y: number,
    time: number
  ): void {
    this.location.posTimes[patternIndex].push([x, y, time]);
  }

  addPattern(compressedPattern: number[]): void {
    const pattern = this.decompressPattern(compressedPattern);
    this.patterns.push({
      pattern,
      numPlaceholders: compressedPattern.filter((i) => i === 0).length,
    });
  }

  addFrame(): void {
    this.frames.push([]);
  }

  addTileToLastFrame(patternIndex: number, nodeIndices: number[]): void {
    this.frames[this.frames.length - 1].push({ patternIndex, nodeIndices });
  }

  private decompressPattern(compressedPattern: number[]): number[] {
    const p = compressedPattern;
    const res: number[] = [];
    let insertionCount = 0;
    let i = 0;
    while (res.length < 1024) {
      if (p[i] === 0) {
        res.push(insertionCount++);
        i++;
      } else {
        const pos = p[i++] - 1;
        const len = p[i++];
        for (let j = 0; j < len; j++) {
          res.push(res[pos + j]);
        }
      }
    }
    return res;
  }

  restoreFrame(time: number): number[][] {
    const frame = this.frames[time];
    const res: number[][] = [];
    for (const tile of frame) {
      const pattern = this.patterns[tile.patternIndex];
      const p = pattern.pattern;
      const nodeIndices = tile.nodeIndices;
      const indices: number[] = [];
      for (let i = 0; i < 1024; i++) {
        indices.push(nodeIndices[p[i]]);
      }
      res.push(indices);
    }
    return res;
  }

  getTiles(time: number, pattern: number): number[] {
    const frame = this.frames[time];
    const res: number[] = [];
    for (const tile of frame) {
      const p = this.patterns[tile.patternIndex].pattern[pattern];
      res.push(tile.nodeIndices[p]);
    }
    return res;
  }

  getTile(
    time: number,
    pattern: number,
    tileX: number,
    tileY: number
  ): number {
    const tile = this.frames[time][(tileY << 2) | tileX];
    const p = this.patterns[tile.patternIndex].pattern[pattern];
    return tile.nodeIndices[p];
  }
}
