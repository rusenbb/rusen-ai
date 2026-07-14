#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { PROJECTS } from "../src/lib/projects.ts";
import { createSocialCardFromParsedArgs } from "./social-create.ts";

type ProjectPreset = {
  word?: string;
  seed?: string;
};

const PROJECT_PRESETS: Record<string, ProjectPreset> = {
  "adaptive-arena": { word: "rl\narena" },
  "attention-heatmap": { word: "attention\nheatmap" },
  "classify-anything": { word: "classify\nanything" },
  "embedding-explorer": { word: "embedding\nexplorer" },
  emergence: { word: "emergence" },
  "game-of-life": { word: "game\nof\nlife" },
  "pulse-board": { word: "pulse\nboard" },
  "rusen-gram": { word: "rusen\ngram" },
  rusenizer: { word: "rusenizer" },
  "segment-anything": { word: "segment\nanything" },
  "steering-llms": { word: "steering\nllms" },
  "vision-anything": { word: "vision\nanything" },
  "voice-morph": { word: "voice\nmorph" },
};

const OUTPUT_DIR = resolve(process.cwd(), "generated/social/projects");

function parseModeArg(): "network" | "tiles" {
  const rawMode = process.argv[2]?.trim().toLowerCase();
  if (!rawMode) {
    return "tiles";
  }
  if (rawMode === "network" || rawMode === "tiles") {
    return rawMode;
  }
  throw new Error(`Unknown mode: ${rawMode}`);
}

function defaultWordForTitle(title: string): string {
  const normalized = title
    .replace(/\p{Pd}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const words = normalized.split(" ").filter(Boolean);

  if (words.length <= 1) {
    return normalized;
  }
  if (words.length === 2) {
    return words.join("\n");
  }
  return `${words.slice(0, -1).join(" ")}\n${words.at(-1) ?? ""}`;
}

function rasterizeSvg(svgPath: string, pngPath: string): void {
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], {
    stdio: "ignore",
  });
}

function main(): void {
  const renderMode = parseModeArg();
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = PROJECTS.map((project) => {
    const preset = PROJECT_PRESETS[project.slug] ?? {};
    const word = preset.word ?? defaultWordForTitle(project.title);
    const svgPath = resolve(OUTPUT_DIR, `${project.slug}.svg`);
    const pngPath = resolve(OUTPUT_DIR, `${project.slug}.png`);
    const { svg } = createSocialCardFromParsedArgs({
      mode: renderMode,
      word,
      seed: preset.seed ?? project.slug,
      out: svgPath,
    });

    mkdirSync(dirname(svgPath), { recursive: true });
    writeFileSync(svgPath, svg, "utf-8");
    rasterizeSvg(svgPath, pngPath);

    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      status: project.status,
      renderMode,
      word,
      svgPath,
      pngPath,
    };
  });

  const manifestPath = resolve(OUTPUT_DIR, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");

  console.log(`Generated ${manifest.length} ${renderMode}-mode project cards in ${OUTPUT_DIR}`);
  console.log(manifestPath);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`social-create-all failed: ${message}`);
  process.exitCode = 1;
}
