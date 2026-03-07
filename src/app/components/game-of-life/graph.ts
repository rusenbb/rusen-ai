// Port of Graph.hx — quadtree node storage for OTCA metapixel data

export interface Node {
  indexInLevel: number;
  level: number;
  pop: number;
  children: number[];
}

function popcount16(i: number): number {
  i = (i & 0x5555) + ((i >> 1) & 0x5555);
  i = (i & 0x3333) + ((i >> 2) & 0x3333);
  i = (i & 0x0f0f) + ((i >> 4) & 0x0f0f);
  return (i & 0x00ff) + (i >> 8);
}

export class Graph {
  // nodes[0] = level 3, nodes[1] = level 4, ..., nodes[6] = level 9
  readonly nodes: Node[][] = [[], [], [], [], [], [], []];
  maxPopulation = 0;

  add(level: number, indices: number[]): void {
    const ps = level === 3 ? null : this.nodes[level - 4];
    const ns = this.nodes[level - 3];
    let pop: number;
    if (ps === null) {
      pop = indices.reduce((s, i) => s + popcount16(i), 0);
    } else {
      pop = indices.reduce((s, i) => s + ps[i].pop, 0);
    }
    this.maxPopulation = Math.max(this.maxPopulation, pop);
    ns.push({
      indexInLevel: ns.length,
      level,
      pop,
      children: indices,
    });
  }

  nodesOfLevel(level: number): Node[] {
    return this.nodes[level - 3];
  }

  nodeOfLevel(level: number, index: number): Node {
    return this.nodes[level - 3][index];
  }

  numNodesOfLevel(level: number): number {
    return this.nodes[level - 3].length;
  }

  getBit(level: number, index: number, x: number, y: number): number {
    while (level > 2) {
      const size = 1 << (level - 1);
      const node = this.nodeOfLevel(level, index);
      if (y < size) {
        if (x < size) {
          index = node.children[0];
        } else {
          index = node.children[1];
          x -= size;
        }
      } else {
        y -= size;
        if (x < size) {
          index = node.children[2];
        } else {
          index = node.children[3];
          x -= size;
        }
      }
      level--;
    }
    const bitIndex = 15 ^ ((y << 2) | x);
    return (index >> bitIndex) & 1;
  }
}
