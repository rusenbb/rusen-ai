#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Glyph = readonly string[];
type RenderMode = "network" | "tiles";

type SocialCreateOptions = {
  word: string;
  width: number;
  height: number;
  density: number;
  messiness: number;
  dotOpacityMax: number;
  lineOpacityMax: number;
  background: string;
  ink: string;
  seed: string;
  renderMode: RenderMode;
};

type ParsedCliArgs = {
  word?: string;
  width?: string;
  height?: string;
  density?: string;
  messiness?: string;
  dotOpacityMax?: string;
  lineOpacityMax?: string;
  background?: string;
  ink?: string;
  seed?: string;
  mode?: string;
  out?: string;
  help?: string;
};

type WordCell = {
  col: number;
  row: number;
  boundary: boolean;
};

type WordLayout = {
  cells: WordCell[];
  totalCols: number;
  totalRows: number;
};

type GraphNodeTier = "anchor" | "flow" | "support" | "ambient" | "noise" | "dust";

type GraphNode = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  tier: GraphNodeTier;
};

type GraphEdge = {
  a: number;
  b: number;
  opacity: number;
  width: number;
  kind: "scaffold" | "filament" | "support" | "ambient" | "bridge" | "noise";
};

type SocialGraphModel = {
  options: SocialCreateOptions;
  layout: WordLayout;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type GridMetrics = {
  cols: number;
  rows: number;
  actualCellWidth: number;
  actualCellHeight: number;
  lineColor: string;
  litColor: string;
  maxLitOpacity: number;
  litCellProbability: number;
};

type Random = () => number;

const GLYPHS: Record<string, Glyph> = {
  " ": [
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
    "...",
  ],
  "-": [
    ".....",
    ".....",
    ".....",
    ".###.",
    ".....",
    ".....",
    ".....",
  ],
  "?": [
    ".###.",
    "#...#",
    "....#",
    "...#.",
    "..#..",
    ".....",
    "..#..",
  ],
  "0": [
    ".###.",
    "#...#",
    "#..##",
    "#.#.#",
    "##..#",
    "#...#",
    ".###.",
  ],
  "1": [
    "..#..",
    ".##..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    ".###.",
  ],
  "2": [
    ".###.",
    "#...#",
    "....#",
    "...#.",
    "..#..",
    ".#...",
    "#####",
  ],
  "3": [
    "#####",
    "....#",
    "...#.",
    "..##.",
    "....#",
    "#...#",
    ".###.",
  ],
  "4": [
    "...#.",
    "..##.",
    ".#.#.",
    "#..#.",
    "#####",
    "...#.",
    "...#.",
  ],
  "5": [
    "#####",
    "#....",
    "####.",
    "....#",
    "....#",
    "#...#",
    ".###.",
  ],
  "6": [
    ".###.",
    "#...#",
    "#....",
    "####.",
    "#...#",
    "#...#",
    ".###.",
  ],
  "7": [
    "#####",
    "....#",
    "...#.",
    "..#..",
    ".#...",
    ".#...",
    ".#...",
  ],
  "8": [
    ".###.",
    "#...#",
    "#...#",
    ".###.",
    "#...#",
    "#...#",
    ".###.",
  ],
  "9": [
    ".###.",
    "#...#",
    "#...#",
    ".####",
    "....#",
    "#...#",
    ".###.",
  ],
  A: [
    ".###.",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  B: [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#...#",
    "#...#",
    "####.",
  ],
  C: [
    ".###.",
    "#...#",
    "#....",
    "#....",
    "#....",
    "#...#",
    ".###.",
  ],
  D: [
    "####.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "####.",
  ],
  E: [
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#####",
  ],
  F: [
    "#####",
    "#....",
    "#....",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  G: [
    ".###.",
    "#...#",
    "#....",
    "#.###",
    "#...#",
    "#...#",
    ".###.",
  ],
  H: [
    "#...#",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#",
  ],
  I: [
    ".###.",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    ".###.",
  ],
  J: [
    "..###",
    "...#.",
    "...#.",
    "...#.",
    "#..#.",
    "#..#.",
    ".##..",
  ],
  K: [
    "#...#",
    "#..#.",
    "#.#..",
    "##...",
    "#.#..",
    "#..#.",
    "#...#",
  ],
  L: [
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#####",
  ],
  M: [
    "#...#",
    "##.##",
    "#.#.#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
  ],
  N: [
    "#...#",
    "##..#",
    "#.#.#",
    "#..##",
    "#...#",
    "#...#",
    "#...#",
  ],
  O: [
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  P: [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#....",
    "#....",
    "#....",
  ],
  Q: [
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#..#.",
    ".##.#",
  ],
  R: [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#.#..",
    "#..#.",
    "#...#",
  ],
  S: [
    ".####",
    "#....",
    "#....",
    ".###.",
    "....#",
    "....#",
    "####.",
  ],
  T: [
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  U: [
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###.",
  ],
  V: [
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".#.#.",
    ".#.#.",
    "..#..",
  ],
  W: [
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#.#.#",
    "##.##",
    "#...#",
  ],
  X: [
    "#...#",
    "#...#",
    ".#.#.",
    "..#..",
    ".#.#.",
    "#...#",
    "#...#",
  ],
  Y: [
    "#...#",
    "#...#",
    ".#.#.",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
  ],
  Z: [
    "#####",
    "....#",
    "...#.",
    "..#..",
    ".#...",
    "#....",
    "#####",
  ],
};

const DEFAULT_SOCIAL_CREATE_OPTIONS: Omit<SocialCreateOptions, "word" | "seed"> =
  {
    width: 1200,
    height: 630,
    density: 0.6,
    messiness: 0.48,
    dotOpacityMax: 0.22,
    lineOpacityMax: 0.26,
    background: "#0c0c0f",
    ink: "#ededed",
    renderMode: "network",
  };

const GLYPH_ROWS = 7;
const GLYPH_SPACING = 1;
const GLYPH_LINE_GAP = 2;

const FLAG_ALIASES: Record<string, keyof ParsedCliArgs> = {
  background: "background",
  density: "density",
  "dot-opacity-max": "dotOpacityMax",
  dotopacitymax: "dotOpacityMax",
  help: "help",
  height: "height",
  ink: "ink",
  "line-opacity-max": "lineOpacityMax",
  lineopacitymax: "lineOpacityMax",
  maxdotopacity: "dotOpacityMax",
  maxlineopacity: "lineOpacityMax",
  messiness: "messiness",
  mode: "mode",
  out: "out",
  "render-mode": "mode",
  seed: "seed",
  style: "mode",
  width: "width",
  word: "word",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function formatFloat(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function slugifyWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "social-card";
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): Random {
  return function random() {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function mixHexColors(colorA: string, colorB: string, amount: number): string {
  const normalizedAmount = clamp(amount, 0, 1);
  const parse = (value: string): [number, number, number] => {
    const normalized = value.replace("#", "");
    if (!/^[\da-fA-F]{6}$/.test(normalized)) {
      return [0, 0, 0];
    }
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  };
  const toHex = (channel: number) =>
    Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0");
  const [r1, g1, b1] = parse(colorA);
  const [r2, g2, b2] = parse(colorB);
  return `#${toHex(lerp(r1, r2, normalizedAmount))}${toHex(
    lerp(g1, g2, normalizedAmount),
  )}${toHex(lerp(b1, b2, normalizedAmount))}`;
}

function normalizeWord(word: string): string {
  const normalized = word
    .replaceAll("\\n", "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (normalized.length === 0) {
    throw new Error("Please provide a non-empty word.");
  }
  if (normalized.length > 3) {
    throw new Error("social-create supports at most 3 lines.");
  }
  return normalized
    .map((line) =>
      line
        .toUpperCase()
        .split("")
        .map((char) => (GLYPHS[char] ? char : "?"))
        .join(""),
    )
    .join("\n");
}

function parseCliArgs(args: string[]): ParsedCliArgs {
  const parsed: ParsedCliArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("-")) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }

    const trimmed = token.replace(/^-+/, "");
    const [rawKey, inlineValue] = trimmed.split("=", 2);
    const normalizedKey = rawKey.toLowerCase();
    const targetKey = FLAG_ALIASES[normalizedKey];
    if (!targetKey) {
      throw new Error(`Unknown flag: ${token}`);
    }

    if (targetKey === "help") {
      parsed.help = "true";
      continue;
    }

    const nextValue =
      inlineValue ?? (index + 1 < args.length ? args[index + 1] : undefined);
    if (!nextValue || nextValue.startsWith("-")) {
      throw new Error(`Flag ${token} requires a value.`);
    }

    parsed[targetKey] = nextValue;
    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return parsed;
}

function parseNumberOption(
  label: string,
  rawValue: string | undefined,
  fallback: number,
): number {
  if (rawValue === undefined) {
    return fallback;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${label}: ${rawValue}`);
  }
  return parsed;
}

function parseRenderMode(rawValue: string | undefined): RenderMode {
  if (!rawValue) {
    return DEFAULT_SOCIAL_CREATE_OPTIONS.renderMode;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (
    normalized === "network"
    || normalized === "dot-network"
    || normalized === "dots"
  ) {
    return "network";
  }
  if (
    normalized === "tiles"
    || normalized === "tile"
    || normalized === "grid"
    || normalized === "grid-tiles"
    || normalized === "cells"
  ) {
    return "tiles";
  }

  throw new Error(`Unknown render mode: ${rawValue}`);
}

function resolveOptions(parsed: ParsedCliArgs): {
  options: SocialCreateOptions;
  outputPath: string;
} {
  const word = normalizeWord(parsed.word ?? "");
  const density = clamp(
    parseNumberOption("density", parsed.density, DEFAULT_SOCIAL_CREATE_OPTIONS.density),
    0,
    1,
  );
  const messiness = clamp(
    parseNumberOption(
      "messiness",
      parsed.messiness,
      DEFAULT_SOCIAL_CREATE_OPTIONS.messiness,
    ),
    0,
    1,
  );
  const dotOpacityMax = clamp(
    parseNumberOption(
      "dot opacity max",
      parsed.dotOpacityMax,
      DEFAULT_SOCIAL_CREATE_OPTIONS.dotOpacityMax,
    ),
    0.05,
    1,
  );
  const lineOpacityMax = clamp(
    parseNumberOption(
      "line opacity max",
      parsed.lineOpacityMax,
      DEFAULT_SOCIAL_CREATE_OPTIONS.lineOpacityMax,
    ),
    0.02,
    1,
  );
  const width = Math.max(
    320,
    Math.round(
      parseNumberOption("width", parsed.width, DEFAULT_SOCIAL_CREATE_OPTIONS.width),
    ),
  );
  const height = Math.max(
    180,
    Math.round(
      parseNumberOption("height", parsed.height, DEFAULT_SOCIAL_CREATE_OPTIONS.height),
    ),
  );
  const options: SocialCreateOptions = {
    word,
    width,
    height,
    density,
    messiness,
    dotOpacityMax,
    lineOpacityMax,
    background: parsed.background ?? DEFAULT_SOCIAL_CREATE_OPTIONS.background,
    ink: parsed.ink ?? DEFAULT_SOCIAL_CREATE_OPTIONS.ink,
    seed: parsed.seed ?? word,
    renderMode: parseRenderMode(parsed.mode),
  };
  const outputPath = resolve(
    process.cwd(),
    parsed.out ?? `generated/social/${slugifyWord(word)}.svg`,
  );
  return { options, outputPath };
}

function buildWordLayout(word: string): WordLayout {
  const cells: WordCell[] = [];
  const lines = word.split("\n");
  const lineWidths = lines.map((line) => {
    let cursor = 0;
    for (const char of line) {
      const glyph = GLYPHS[char] ?? GLYPHS["?"];
      const glyphWidth = glyph[0]?.length ?? 0;
      cursor += glyphWidth + GLYPH_SPACING;
    }
    return Math.max(0, cursor - GLYPH_SPACING);
  });
  const totalCols = Math.max(1, ...lineWidths);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const lineWidth = lineWidths[lineIndex] ?? 0;
    const lineOffset = Math.floor((totalCols - lineWidth) / 2);
    const rowOffset = lineIndex * (GLYPH_ROWS + GLYPH_LINE_GAP);
    let cursor = lineOffset;

    for (const char of line) {
      const glyph = GLYPHS[char] ?? GLYPHS["?"];
      const glyphWidth = glyph[0]?.length ?? 0;

      for (let row = 0; row < glyph.length; row += 1) {
        const rowPattern = glyph[row] ?? "";
        for (let col = 0; col < rowPattern.length; col += 1) {
          if (rowPattern[col] !== "#") {
            continue;
          }
          cells.push({
            col: cursor + col,
            row: rowOffset + row,
            boundary: false,
          });
        }
      }

      cursor += glyphWidth + GLYPH_SPACING;
    }
  }

  const occupied = new Set(cells.map((cell) => `${cell.col},${cell.row}`));

  for (const cell of cells) {
    const neighborKeys = [
      `${cell.col - 1},${cell.row}`,
      `${cell.col + 1},${cell.row}`,
      `${cell.col},${cell.row - 1}`,
      `${cell.col},${cell.row + 1}`,
    ];
    cell.boundary = neighborKeys.some((key) => !occupied.has(key));
  }

  return {
    cells,
    totalCols,
    totalRows:
      (lines.length * GLYPH_ROWS) + (Math.max(0, lines.length - 1) * GLYPH_LINE_GAP),
  };
}

function distanceBetween(a: GraphNode, b: GraphNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function createSocialGraphModel(options: SocialCreateOptions): SocialGraphModel {
  const layout = buildWordLayout(options.word);
  const random = mulberry32(hashString(`${options.seed}:${options.word}`));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();
  const anchorByCell = new Map<string, number>();
  const boundaryAnchors: number[] = [];
  const scaffoldSegments: Array<{ from: number; to: number; diagonal: boolean }> = [];

  const padding = Math.min(options.width, options.height) * 0.14;
  const usableWidth = options.width - padding * 2;
  const usableHeight = options.height - padding * 2;
  const cellSize = Math.min(
    usableWidth / layout.totalCols,
    usableHeight / layout.totalRows,
  );
  const wordWidth = layout.totalCols * cellSize;
  const wordHeight = layout.totalRows * cellSize;
  const originX = (options.width - wordWidth) / 2;
  const originY = (options.height - wordHeight) / 2;

  const addNode = (node: GraphNode): number => {
    nodes.push(node);
    return nodes.length - 1;
  };

  const addEdge = (
    a: number,
    b: number,
    kind: GraphEdge["kind"],
    opacity: number,
    width: number,
  ) => {
    if (a === b) {
      return;
    }
    const minIndex = Math.min(a, b);
    const maxIndex = Math.max(a, b);
    const key = `${minIndex}-${maxIndex}-${kind}`;
    if (edgeKeys.has(key)) {
      return;
    }
    edgeKeys.add(key);
    edges.push({
      a: minIndex,
      b: maxIndex,
      kind,
      opacity,
      width,
    });
  };

  for (const cell of layout.cells) {
    const centerX = originX + (cell.col + 0.5) * cellSize;
    const centerY = originY + (cell.row + 0.5) * cellSize;
    const anchorJitter = cellSize * (0.02 + options.messiness * 0.1);
    const anchorIndex = addNode({
      x: centerX + (random() - 0.5) * anchorJitter,
      y: centerY + (random() - 0.5) * anchorJitter,
      radius: cellSize * (0.038 + random() * 0.02),
      opacity: lerp(options.dotOpacityMax * 0.22, options.dotOpacityMax * 0.5, random()),
      tier: "anchor",
    });
    anchorByCell.set(`${cell.col},${cell.row}`, anchorIndex);
    if (cell.boundary) {
      boundaryAnchors.push(anchorIndex);
    }

    const supportCount = Math.max(
      1,
      Math.round(1.1 + options.density * 3.2 + (cell.boundary ? 0.8 : 0)),
    );

    for (let index = 0; index < supportCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const radialDistance =
        cellSize *
        (0.22 + random() * (0.42 + options.messiness * 0.8 + options.density * 0.26));
      const supportIndex = addNode({
        x: nodes[anchorIndex].x + Math.cos(angle) * radialDistance,
        y: nodes[anchorIndex].y + Math.sin(angle) * radialDistance,
        radius: cellSize * (0.02 + random() * 0.018),
        opacity: lerp(options.dotOpacityMax * 0.08, options.dotOpacityMax * 0.32, random()),
        tier: "support",
      });
      addEdge(
        anchorIndex,
        supportIndex,
        "support",
        lerp(options.lineOpacityMax * 0.12, options.lineOpacityMax * 0.36, random()),
        cellSize * (0.008 + random() * 0.009),
      );
    }
  }

  const occupied = new Set(layout.cells.map((cell) => `${cell.col},${cell.row}`));
  const scaffoldOffsets = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
  ] as const;

  for (const cell of layout.cells) {
    const from = anchorByCell.get(`${cell.col},${cell.row}`);
    if (from === undefined) {
      continue;
    }
    for (const [dx, dy] of scaffoldOffsets) {
      const neighborKey = `${cell.col + dx},${cell.row + dy}`;
      if (!occupied.has(neighborKey)) {
        continue;
      }
      const to = anchorByCell.get(neighborKey);
      if (to === undefined) {
        continue;
      }
      scaffoldSegments.push({
        from,
        to,
        diagonal: Math.abs(dx) + Math.abs(dy) === 2,
      });
      addEdge(
        from,
        to,
        "scaffold",
        lerp(options.lineOpacityMax * 0.08, options.lineOpacityMax * 0.2, random()),
        cellSize * (0.008 + random() * 0.009),
      );
    }
  }

  for (const segment of scaffoldSegments) {
    const fromNode = nodes[segment.from];
    const toNode = nodes[segment.to];
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      continue;
    }

    const unitX = dx / length;
    const unitY = dy / length;
    const normalX = -unitY;
    const normalY = unitX;
    const strandCount =
      1
      + (random() < 0.72 + options.density * 0.18 ? 1 : 0)
      + (random() < options.messiness * 0.38 ? 1 : 0);

    for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
      const intermediateCount = Math.max(
        2,
        Math.round(
          (segment.diagonal ? 2.4 : 2.8)
          + options.density * 2.6
          + options.messiness * 1.8
          + (strandIndex > 0 ? 0.6 : 0),
        ),
      );
      const strandBias =
        strandCount === 1 ? 0 : ((strandIndex / (strandCount - 1)) - 0.5) * cellSize * 0.18;

      let previous = segment.from;
      const filamentNodes: number[] = [];

      for (let step = 1; step <= intermediateCount; step += 1) {
        const t = step / (intermediateCount + 1);
        const envelope = Math.sin(t * Math.PI);
        const lateralNoise =
          (random() - 0.5)
          * cellSize
          * (0.22 + options.messiness * 0.92 + options.density * 0.12)
          * envelope;
        const alongNoise =
          (random() - 0.5) * cellSize * (0.08 + options.messiness * 0.16);
        const flowIndex = addNode({
          x:
            lerp(fromNode.x, toNode.x, t)
            + unitX * alongNoise
            + normalX * (lateralNoise + strandBias),
          y:
            lerp(fromNode.y, toNode.y, t)
            + unitY * alongNoise
            + normalY * (lateralNoise + strandBias),
          radius: cellSize * (0.012 + random() * 0.012),
          opacity: lerp(options.dotOpacityMax * 0.04, options.dotOpacityMax * 0.16, random()),
          tier: "flow",
        });
        filamentNodes.push(flowIndex);
        addEdge(
          previous,
          flowIndex,
          "filament",
          lerp(options.lineOpacityMax * 0.36, options.lineOpacityMax * 0.82, random()),
          cellSize * (0.011 + random() * 0.014),
        );
        previous = flowIndex;

        if (random() < 0.42 + options.messiness * 0.18) {
          const sparkAngle = Math.atan2(normalY, normalX) + (random() - 0.5) * 1.6;
          const sparkDistance = cellSize * (0.14 + random() * (0.28 + options.messiness * 0.3));
          const sparkIndex = addNode({
            x: nodes[flowIndex].x + Math.cos(sparkAngle) * sparkDistance,
            y: nodes[flowIndex].y + Math.sin(sparkAngle) * sparkDistance,
            radius: cellSize * (0.01 + random() * 0.01),
            opacity: lerp(options.dotOpacityMax * 0.03, options.dotOpacityMax * 0.12, random()),
            tier: "flow",
          });
          addEdge(
            flowIndex,
            sparkIndex,
            "filament",
            lerp(options.lineOpacityMax * 0.08, options.lineOpacityMax * 0.24, random()),
            cellSize * (0.006 + random() * 0.008),
          );
        }
      }

      addEdge(
        previous,
        segment.to,
        "filament",
        lerp(options.lineOpacityMax * 0.38, options.lineOpacityMax * 0.8, random()),
        cellSize * (0.011 + random() * 0.014),
      );

      for (let index = 1; index < filamentNodes.length; index += 2) {
        const fromIndex = filamentNodes[index - 1];
        const toIndex = filamentNodes[index];
        addEdge(
          fromIndex,
          toIndex,
          "filament",
          lerp(options.lineOpacityMax * 0.18, options.lineOpacityMax * 0.4, random()),
          cellSize * (0.006 + random() * 0.007),
        );
      }
    }
  }

  const ambientCount = Math.round(
    layout.cells.length * (0.65 + options.density * 1.35 + options.messiness * 1.12),
  );
  const ambientBounds = {
    minX: originX - cellSize * 1.3,
    maxX: originX + wordWidth + cellSize * 1.3,
    minY: originY - cellSize * 1.2,
    maxY: originY + wordHeight + cellSize * 1.2,
  };

  const candidateParents = nodes
    .map((node, index) => ({ node, index }))
    .filter(
      ({ node }) =>
        node.tier === "anchor" || node.tier === "support" || node.tier === "flow",
    );

  for (let index = 0; index < ambientCount; index += 1) {
    const ambientNodeIndex = addNode({
      x: lerp(ambientBounds.minX, ambientBounds.maxX, random()),
      y: lerp(ambientBounds.minY, ambientBounds.maxY, random()),
      radius: cellSize * (0.02 + random() * 0.016),
      opacity: lerp(options.dotOpacityMax * 0.08, options.dotOpacityMax * 0.3, random()),
      tier: "ambient",
    });
    const nearestParents = candidateParents
      .map(({ node, index: parentIndex }) => ({
        index: parentIndex,
        distance: distanceBetween(nodes[ambientNodeIndex], node),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 2);

    for (const parent of nearestParents) {
      if (parent.distance > cellSize * (2.7 + options.messiness * 0.9)) {
        continue;
      }
      addEdge(
        ambientNodeIndex,
        parent.index,
        "ambient",
        lerp(options.lineOpacityMax * 0.08, options.lineOpacityMax * 0.28, random()),
        cellSize * (0.008 + random() * 0.01),
      );
    }
  }

  const dustCount = 0;
  for (let index = 0; index < dustCount; index += 1) {
    addNode({
      x: random() * options.width,
      y: random() * options.height,
      radius: cellSize * (0.007 + random() * 0.012),
      opacity: lerp(options.dotOpacityMax * 0.03, options.dotOpacityMax * 0.12, random()),
      tier: "dust",
    });
  }

  const detachedNoiseClusterCount = 0;
  const noiseMargin = cellSize * 1.2;
  const wordBounds = {
    minX: originX - noiseMargin,
    maxX: originX + wordWidth + noiseMargin,
    minY: originY - noiseMargin,
    maxY: originY + wordHeight + noiseMargin,
  };

  const isInsideWordBounds = (x: number, y: number): boolean =>
    x >= wordBounds.minX
    && x <= wordBounds.maxX
    && y >= wordBounds.minY
    && y <= wordBounds.maxY;

  const pickDetachedCenter = (): { x: number; y: number } => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = {
        x: lerp(frameInset(options.width, options.height), options.width - frameInset(options.width, options.height), random()),
        y: lerp(frameInset(options.width, options.height), options.height - frameInset(options.width, options.height), random()),
      };
      if (!isInsideWordBounds(candidate.x, candidate.y)) {
        return candidate;
      }
    }

    return {
      x: random() < 0.5 ? options.width * (0.12 + random() * 0.14) : options.width * (0.74 + random() * 0.14),
      y: random() * options.height,
    };
  };

  for (let clusterIndex = 0; clusterIndex < detachedNoiseClusterCount; clusterIndex += 1) {
    const center = pickDetachedCenter();
    const clusterNodes: number[] = [];
    const nodeCount = Math.max(
      8,
      Math.round(8 + random() * 10 + options.density * 4 + options.messiness * 4),
    );

    for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
      const angle = random() * Math.PI * 2;
      const radialDistance =
        cellSize * (0.18 + random() * (0.84 + options.messiness * 0.52));
      const noiseIndex = addNode({
        x: center.x + Math.cos(angle) * radialDistance,
        y: center.y + Math.sin(angle) * radialDistance,
        radius: cellSize * (0.007 + random() * 0.014),
        opacity: lerp(options.dotOpacityMax * 0.05, options.dotOpacityMax * 0.2, random()),
        tier: "noise",
      });
      clusterNodes.push(noiseIndex);
    }

    const orderedNodes = clusterNodes
      .map((index) => ({
        index,
        angle: Math.atan2(nodes[index].y - center.y, nodes[index].x - center.x),
      }))
      .sort((left, right) => left.angle - right.angle);

    for (let index = 0; index < orderedNodes.length; index += 1) {
      const current = orderedNodes[index]?.index;
      const next = orderedNodes[index + 1]?.index;
      if (current === undefined || next === undefined) {
        continue;
      }
      addEdge(
        current,
        next,
        "noise",
        lerp(options.lineOpacityMax * 0.08, options.lineOpacityMax * 0.24, random()),
        cellSize * (0.004 + random() * 0.005),
      );
    }

    if (orderedNodes.length >= 3 && random() < 0.45 + options.messiness * 0.2) {
      addEdge(
        orderedNodes[0]!.index,
        orderedNodes[orderedNodes.length - 1]!.index,
        "noise",
        lerp(options.lineOpacityMax * 0.05, options.lineOpacityMax * 0.16, random()),
        cellSize * (0.003 + random() * 0.004),
      );
    }

    const crossLinkAttempts = Math.round(2 + random() * 4 + options.messiness * 2);
    for (let attempt = 0; attempt < crossLinkAttempts; attempt += 1) {
      if (orderedNodes.length < 4) {
        break;
      }
      const from = orderedNodes[Math.floor(random() * orderedNodes.length)]?.index;
      const to = orderedNodes[Math.floor(random() * orderedNodes.length)]?.index;
      if (from === undefined || to === undefined || from === to) {
        continue;
      }
      addEdge(
        from,
        to,
        "noise",
        lerp(options.lineOpacityMax * 0.04, options.lineOpacityMax * 0.12, random()),
        cellSize * (0.003 + random() * 0.003),
      );
    }

    const looseDots = Math.round(8 + random() * 10 + options.messiness * 4);
    for (let index = 0; index < looseDots; index += 1) {
      addNode({
        x: center.x + (random() - 0.5) * cellSize * (2.8 + random() * 4.2),
        y: center.y + (random() - 0.5) * cellSize * (2.8 + random() * 4.2),
        radius: cellSize * (0.004 + random() * 0.01),
        opacity: lerp(options.dotOpacityMax * 0.035, options.dotOpacityMax * 0.1, random()),
        tier: "noise",
      });
    }
  }

  const bridgeAttempts = Math.max(
    5,
    Math.round(boundaryAnchors.length * (0.18 + options.density * 0.18)),
  );
  for (let attempt = 0; attempt < bridgeAttempts; attempt += 1) {
    if (boundaryAnchors.length < 2) {
      break;
    }
    const from = boundaryAnchors[Math.floor(random() * boundaryAnchors.length)];
    const candidates = boundaryAnchors
      .filter((candidate) => candidate !== from)
      .map((candidate) => ({
        candidate,
        distance: distanceBetween(nodes[from], nodes[candidate]),
      }))
      .filter(
        ({ distance }) =>
          distance > cellSize * 1.6 && distance < cellSize * (4.8 + options.messiness * 2),
      )
      .sort((left, right) => left.distance - right.distance);

    const target = candidates[Math.floor(random() * Math.min(4, candidates.length))];
    if (!target) {
      continue;
    }
    addEdge(
      from,
      target.candidate,
      "bridge",
      lerp(options.lineOpacityMax * 0.18, options.lineOpacityMax * 0.44, random()),
      cellSize * (0.012 + random() * 0.012),
    );
  }

  const flowNodes = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.tier === "flow");
  const extraChaosConnections = Math.round(flowNodes.length * (0.08 + options.messiness * 0.06));

  for (let attempt = 0; attempt < extraChaosConnections; attempt += 1) {
    if (flowNodes.length < 2) {
      break;
    }
    const from = flowNodes[Math.floor(random() * flowNodes.length)];
    const candidates = flowNodes
      .filter(({ index }) => index !== from.index)
      .map(({ index, node }) => ({
        index,
        distance: distanceBetween(from.node, node),
      }))
      .filter(
        ({ distance }) =>
          distance > cellSize * 0.7 && distance < cellSize * (3.8 + options.messiness * 1.6),
      )
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 6);

    const target = candidates[Math.floor(random() * candidates.length)];
    if (!target) {
      continue;
    }

    addEdge(
      from.index,
      target.index,
      "bridge",
      lerp(options.lineOpacityMax * 0.08, options.lineOpacityMax * 0.24, random()),
      cellSize * (0.004 + random() * 0.006),
    );
  }

  return {
    options,
    layout,
    nodes,
    edges,
  };
}

function renderSvg(model: SocialGraphModel): string {
  const { options, nodes, edges } = model;
  const borderShade = mixHexColors(options.background, "#ffffff", 0.18);
  const visibleCharacterCount = getVisibleCharacterCount(options.word);
  const lengthFactor = clamp((visibleCharacterCount - 3) / 9, 0, 1);
  const lineOpacityBoost = lerp(1, 1.9, lengthFactor);
  const dotOpacityBoost = lerp(1, 1.75, lengthFactor);
  const glowOpacityBoost = lerp(1, 2.1, lengthFactor);
  const isNetworkMode = options.renderMode === "network";

  const lineLayer = !isNetworkMode
    ? ""
    : edges
    .map((edge) => {
      const start = nodes[edge.a];
      const end = nodes[edge.b];
      const strokeOpacity = clamp(edge.opacity * lineOpacityBoost, 0, 0.42);
      return `<line x1="${formatFloat(start.x)}" y1="${formatFloat(start.y)}" x2="${formatFloat(
        end.x,
      )}" y2="${formatFloat(end.y)}" stroke="${options.ink}" stroke-opacity="${formatFloat(
        strokeOpacity,
      )}" stroke-width="${formatFloat(edge.width)}" stroke-linecap="round" />`;
    })
    .join("");

  const glowLayer = !isNetworkMode
    ? ""
    : nodes
    .filter((node) => node.tier !== "dust")
    .map((node) => {
      const glowRadiusMultiplier =
        node.tier === "anchor"
          ? 2.4
          : node.tier === "flow"
            ? 2
            : node.tier === "support"
              ? 1.8
              : node.tier === "noise"
                ? 1.4
              : 1.4;
      const glowOpacity =
        node.tier === "anchor"
          ? node.opacity * 0.12
          : node.tier === "flow"
            ? node.opacity * 0.18
          : node.tier === "support"
            ? node.opacity * 0.1
            : node.tier === "noise"
              ? node.opacity * 0.08
            : node.opacity * 0.07;
      const boostedGlowOpacity = clamp(glowOpacity * glowOpacityBoost, 0, 0.24);
      return `<circle cx="${formatFloat(node.x)}" cy="${formatFloat(
        node.y,
      )}" r="${formatFloat(node.radius * glowRadiusMultiplier)}" fill="${options.ink}" fill-opacity="${formatFloat(
        boostedGlowOpacity,
      )}" />`;
    })
    .join("");

  const dotLayer = !isNetworkMode
    ? ""
    : nodes
    .map((node) => {
      const fillOpacity = clamp(node.opacity * dotOpacityBoost, 0, 0.26);
      return `<circle cx="${formatFloat(node.x)}" cy="${formatFloat(
        node.y,
      )}" r="${formatFloat(node.radius)}" fill="${options.ink}" fill-opacity="${formatFloat(
        fillOpacity,
      )}" />`;
    })
    .join("");

  const frameInset = Math.min(options.width, options.height) * 0.035;
  const backgroundGridLayer =
    options.renderMode === "tiles"
      ? renderTileWordGrid(model, frameInset)
      : renderBackgroundGrid(options, frameInset);
  const trademarkLayer = renderTrademark(options, frameInset);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" role="img" aria-label="${escapeXml(
      `${options.word} rendered as a connected dot-web`,
    )}">`,
    `<rect width="${options.width}" height="${options.height}" fill="${options.background}" />`,
    backgroundGridLayer,
    `<rect x="${formatFloat(frameInset)}" y="${formatFloat(frameInset)}" width="${formatFloat(
      options.width - frameInset * 2,
    )}" height="${formatFloat(options.height - frameInset * 2)}" rx="${formatFloat(
      frameInset * 0.72,
    )}" fill="none" stroke="${borderShade}" stroke-opacity="0.26" stroke-width="1.2" />`,
    lineLayer,
    glowLayer,
    dotLayer,
    trademarkLayer,
    "</svg>",
  ].join("");
}

function getVisibleCharacterCount(word: string): number {
  return word.replace(/\s+/g, "").length;
}

function computeGridMetrics(
  options: SocialCreateOptions,
  inset: number,
): GridMetrics {
  const innerWidth = options.width - inset * 2;
  const innerHeight = options.height - inset * 2;
  const visibleCharacterCount = getVisibleCharacterCount(options.word);
  const lengthFactor = clamp((visibleCharacterCount - 3) / 9, 0, 1);
  const cellSizeScale = lerp(1, 0.72, lengthFactor);
  const maxLitOpacity = lerp(0.24, 0.132, lengthFactor);
  const litCellProbability = lerp(0.15, 0.0675, lengthFactor);
  const cellSize = clamp(
    Math.min(innerWidth / 46, innerHeight / 24) * cellSizeScale,
    12,
    26,
  );
  const cols = Math.max(12, Math.floor(innerWidth / cellSize));
  const rows = Math.max(8, Math.floor(innerHeight / cellSize));
  return {
    cols,
    rows,
    actualCellWidth: innerWidth / cols,
    actualCellHeight: innerHeight / rows,
    lineColor: mixHexColors(options.background, "#ffffff", 0.08),
    litColor: mixHexColors(options.background, options.ink, 0.9),
    maxLitOpacity,
    litCellProbability,
  };
}

function renderBackgroundGrid(options: SocialCreateOptions, inset: number): string {
  const random = mulberry32(hashString(`grid:${options.seed}:${options.word}`));
  const metrics = computeGridMetrics(options, inset);
  let litCells = "";
  let gridPath = "";

  for (let row = 0; row < metrics.rows; row += 1) {
    for (let col = 0; col < metrics.cols; col += 1) {
      if (random() >= metrics.litCellProbability) {
        continue;
      }
      const x = inset + col * metrics.actualCellWidth;
      const y = inset + row * metrics.actualCellHeight;
      const paddingX = metrics.actualCellWidth * (0.08 + random() * 0.1);
      const paddingY = metrics.actualCellHeight * (0.08 + random() * 0.1);
      const opacity = lerp(0.03, metrics.maxLitOpacity, Math.pow(random(), 1.4));
      litCells += `<rect x="${formatFloat(x + paddingX)}" y="${formatFloat(
        y + paddingY,
      )}" width="${formatFloat(metrics.actualCellWidth - paddingX * 2)}" height="${formatFloat(
        metrics.actualCellHeight - paddingY * 2,
      )}" rx="${formatFloat(Math.min(metrics.actualCellWidth, metrics.actualCellHeight) * 0.08)}" fill="${metrics.litColor}" fill-opacity="${formatFloat(
        opacity,
      )}" />`;
    }
  }

  for (let col = 0; col <= metrics.cols; col += 1) {
    const x = inset + col * metrics.actualCellWidth;
    gridPath += `M ${formatFloat(x)} ${formatFloat(inset)} V ${formatFloat(
      options.height - inset,
    )} `;
  }

  for (let row = 0; row <= metrics.rows; row += 1) {
    const y = inset + row * metrics.actualCellHeight;
    gridPath += `M ${formatFloat(inset)} ${formatFloat(y)} H ${formatFloat(
      options.width - inset,
    )} `;
  }

  return `<g><path d="${gridPath.trim()}" stroke="${metrics.lineColor}" stroke-opacity="0.11" stroke-width="1" fill="none" />${litCells}</g>`;
}

function renderTileWordGrid(model: SocialGraphModel, inset: number): string {
  const { options, layout } = model;
  const random = mulberry32(hashString(`tiles:${options.seed}:${options.word}`));
  const metrics = computeGridMetrics(options, inset);
  const visibleCharacterCount = getVisibleCharacterCount(options.word);
  const lengthFactor = clamp((visibleCharacterCount - 3) / 9, 0, 1);
  const wordOpacity = lerp(0.16, 0.24, lengthFactor);
  const wordCoreOpacity = lerp(0.22, 0.34, lengthFactor);
  const startCol = Math.max(1, Math.floor((metrics.cols - layout.totalCols) / 2));
  const startRow = Math.max(1, Math.floor((metrics.rows - layout.totalRows) / 2));
  const wordCells = new Set(
    layout.cells.map((cell) => `${cell.col + startCol},${cell.row + startRow}`),
  );
  const exclusionRadius = 1.75;
  const exclusionCells = new Set<string>();
  let gridPath = "";
  let backgroundCells = "";
  let wordCellRects = "";

  for (const cell of layout.cells) {
    const baseCol = cell.col + startCol;
    const baseRow = cell.row + startRow;
    const minCol = Math.floor(baseCol - exclusionRadius);
    const maxCol = Math.ceil(baseCol + exclusionRadius);
    const minRow = Math.floor(baseRow - exclusionRadius);
    const maxRow = Math.ceil(baseRow + exclusionRadius);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (Math.hypot(col - baseCol, row - baseRow) > exclusionRadius) {
          continue;
        }
        exclusionCells.add(`${col},${row}`);
      }
    }
  }

  for (let row = 0; row < metrics.rows; row += 1) {
    for (let col = 0; col < metrics.cols; col += 1) {
      const x = inset + col * metrics.actualCellWidth;
      const y = inset + row * metrics.actualCellHeight;
      const key = `${col},${row}`;
      const isWordCell = wordCells.has(key);

      if (isWordCell) {
        const outerPaddingX = metrics.actualCellWidth * (0.07 + random() * 0.04);
        const outerPaddingY = metrics.actualCellHeight * (0.07 + random() * 0.04);
        const corePaddingX = metrics.actualCellWidth * (0.18 + random() * 0.04);
        const corePaddingY = metrics.actualCellHeight * (0.18 + random() * 0.04);
        const outerOpacity = clamp(wordOpacity * lerp(0.82, 1.18, random()), 0, 0.3);
        const coreOpacity = clamp(wordCoreOpacity * lerp(0.83, 1.2, random()), 0, 0.42);
        wordCellRects += `<rect x="${formatFloat(x + outerPaddingX)}" y="${formatFloat(
          y + outerPaddingY,
        )}" width="${formatFloat(metrics.actualCellWidth - outerPaddingX * 2)}" height="${formatFloat(
          metrics.actualCellHeight - outerPaddingY * 2,
        )}" rx="${formatFloat(Math.min(metrics.actualCellWidth, metrics.actualCellHeight) * 0.1)}" fill="${metrics.litColor}" fill-opacity="${formatFloat(
          outerOpacity,
        )}" />`;
        wordCellRects += `<rect x="${formatFloat(x + corePaddingX)}" y="${formatFloat(
          y + corePaddingY,
        )}" width="${formatFloat(metrics.actualCellWidth - corePaddingX * 2)}" height="${formatFloat(
          metrics.actualCellHeight - corePaddingY * 2,
        )}" rx="${formatFloat(Math.min(metrics.actualCellWidth, metrics.actualCellHeight) * 0.08)}" fill="${metrics.litColor}" fill-opacity="${formatFloat(
          coreOpacity,
        )}" />`;
        continue;
      }

      if (exclusionCells.has(key)) {
        continue;
      }
      if (random() >= metrics.litCellProbability) {
        continue;
      }
      const paddingX = metrics.actualCellWidth * (0.08 + random() * 0.1);
      const paddingY = metrics.actualCellHeight * (0.08 + random() * 0.1);
      const opacity = lerp(0.03, metrics.maxLitOpacity, Math.pow(random(), 1.4));
      backgroundCells += `<rect x="${formatFloat(x + paddingX)}" y="${formatFloat(
        y + paddingY,
      )}" width="${formatFloat(metrics.actualCellWidth - paddingX * 2)}" height="${formatFloat(
        metrics.actualCellHeight - paddingY * 2,
      )}" rx="${formatFloat(Math.min(metrics.actualCellWidth, metrics.actualCellHeight) * 0.08)}" fill="${metrics.litColor}" fill-opacity="${formatFloat(
        opacity,
      )}" />`;
    }
  }

  for (let col = 0; col <= metrics.cols; col += 1) {
    const x = inset + col * metrics.actualCellWidth;
    gridPath += `M ${formatFloat(x)} ${formatFloat(inset)} V ${formatFloat(
      options.height - inset,
    )} `;
  }

  for (let row = 0; row <= metrics.rows; row += 1) {
    const y = inset + row * metrics.actualCellHeight;
    gridPath += `M ${formatFloat(inset)} ${formatFloat(y)} H ${formatFloat(
      options.width - inset,
    )} `;
  }

  return `<g><path d="${gridPath.trim()}" stroke="${metrics.lineColor}" stroke-opacity="0.11" stroke-width="1" fill="none" />${backgroundCells}${wordCellRects}</g>`;
}

function renderTrademark(options: SocialCreateOptions, inset: number): string {
  const footerText = "rusen.ai | AI and Data Engineering Portfolio";
  const sharedSize = clamp(Math.min(options.width, options.height) * 0.045, 24, 32);
  const fillColor = mixHexColors(options.background, "#ffffff", 0.5);
  const rightEdge = options.width - inset * 2.2;
  const baselineY = options.height - inset * 1.45;

  return `<text x="${formatFloat(rightEdge)}" y="${formatFloat(
    baselineY,
  )}" text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" font-size="${formatFloat(
    sharedSize,
  )}" letter-spacing="0.02em" fill="${fillColor}" fill-opacity="0.4">${footerText}</text>`;
}

function frameInset(width: number, height: number): number {
  return Math.min(width, height) * 0.035;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createSocialModel(options: SocialCreateOptions): SocialGraphModel {
  if (options.renderMode === "tiles") {
    return {
      options,
      layout: buildWordLayout(options.word),
      nodes: [],
      edges: [],
    };
  }

  return createSocialGraphModel(options);
}

export function createSocialCardSvg(options: SocialCreateOptions): string {
  return renderSvg(createSocialModel(options));
}

export function createSocialCardFromParsedArgs(parsed: ParsedCliArgs): {
  svg: string;
  model: SocialGraphModel;
  outputPath: string;
} {
  const { options, outputPath } = resolveOptions(parsed);
  const model = createSocialModel(options);
  return {
    svg: renderSvg(model),
    model,
    outputPath,
  };
}

export {
  DEFAULT_SOCIAL_CREATE_OPTIONS,
  parseCliArgs,
  resolveOptions,
  slugifyWord,
  createSocialGraphModel,
};

function printHelp(): void {
  console.log(`social-create

Usage:
  social-create --word SAM3 --density 0.5 --maxdotopacity 0.3
  social-create -word SAM3 -density 0.5 -maxdotopacity 0.3

Flags:
  --word, -word                     Required. Word to render.
  --density, -density               0..1, default ${DEFAULT_SOCIAL_CREATE_OPTIONS.density}
  --messiness, -messiness           0..1, default ${DEFAULT_SOCIAL_CREATE_OPTIONS.messiness}
  --dot-opacity-max, --maxdotopacity
                                     0..1, default ${DEFAULT_SOCIAL_CREATE_OPTIONS.dotOpacityMax}
  --line-opacity-max, --maxlineopacity
                                     0..1, default ${DEFAULT_SOCIAL_CREATE_OPTIONS.lineOpacityMax}
  --width                           Default ${DEFAULT_SOCIAL_CREATE_OPTIONS.width}
  --height                          Default ${DEFAULT_SOCIAL_CREATE_OPTIONS.height}
  --background                      Default ${DEFAULT_SOCIAL_CREATE_OPTIONS.background}
  --ink                             Default ${DEFAULT_SOCIAL_CREATE_OPTIONS.ink}
  --mode                            network | tiles, default ${DEFAULT_SOCIAL_CREATE_OPTIONS.renderMode}
  --seed                            Defaults to the word itself.
  --out                             Defaults to generated/social/<word>.svg
  --help                            Show this message.
`);
}

function isDirectRun(): boolean {
  if (!process.argv[1]) {
    return false;
  }
  return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function main(): void {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    return;
  }

  const { svg, model, outputPath } = createSocialCardFromParsedArgs(parsed);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, svg, "utf-8");

  console.log(`Wrote ${outputPath}`);
  console.log(
    JSON.stringify(
      {
        word: model.options.word,
        size: `${model.options.width}x${model.options.height}`,
        density: model.options.density,
        messiness: model.options.messiness,
        dotOpacityMax: model.options.dotOpacityMax,
        lineOpacityMax: model.options.lineOpacityMax,
        seed: model.options.seed,
        cells: model.layout.cells.length,
        nodes: model.nodes.length,
        edges: model.edges.length,
      },
      null,
      2,
    ),
  );
}

if (isDirectRun()) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`social-create failed: ${message}`);
    process.exitCode = 1;
  }
}
