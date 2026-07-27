#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

type SocialManifest = {
  assets: Array<{ route: string; image: string }>;
};

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, "out");
const ORIGIN = "https://rusen.ai";
const MAX_EXPORT_FILES = 20_000;
// Cloudflare Pages rejects assets at 25 MiB. Keep a little operational
// headroom so a dependency update cannot leave deployment balanced on the
// provider's hard edge.
const MAX_EXPORT_FILE_BYTES = 24_000_000;

function findFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = resolve(directory, entry.name);
    return entry.isDirectory() ? findFiles(filePath) : [filePath];
  });
}

function findIndexFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return findIndexFiles(path);
    return entry.name === "index.html" ? [path] : [];
  });
}

function routeForFile(filePath: string): string {
  const relativePath = relative(OUT_DIR, filePath).replaceAll("\\", "/");
  const route = relativePath.replace(/(?:^|\/)index\.html$/, "");
  return route ? `/${route}` : "/";
}

function readMeta(html: string, attribute: "name" | "property", key: string): string | null {
  const tag = html.match(new RegExp(`<meta[^>]+${attribute}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`, "i"))?.[0];
  return tag?.match(/content="([^"]*)"/i)?.[1] ?? null;
}

function readCanonical(html: string): string | null {
  const tag = html.match(/<link[^>]+rel="canonical"[^>]*>/i)?.[0];
  return tag?.match(/href="([^"]*)"/i)?.[1] ?? null;
}

function expectedUrl(path: string): string {
  if (path === "/") return `${ORIGIN}/`;
  return `${ORIGIN}${path}/`;
}

function main(): void {
  const manifest = JSON.parse(
    readFileSync(resolve(ROOT, "public/social/manifest.json"), "utf8"),
  ) as SocialManifest;
  const imageByRoute = new Map(manifest.assets.map((asset) => [asset.route, asset.image]));
  const failures: string[] = [];
  let verified = 0;
  const exportFiles = findFiles(OUT_DIR);
  if (exportFiles.length > MAX_EXPORT_FILES) {
    failures.push(
      `export contains ${exportFiles.length} files; Pages limit is ${MAX_EXPORT_FILES}`,
    );
  }
  for (const filePath of exportFiles) {
    const bytes = statSync(filePath).size;
    if (bytes > MAX_EXPORT_FILE_BYTES) {
      failures.push(
        `${relative(OUT_DIR, filePath)} is ${(bytes / 1_000_000).toFixed(2)} MB; ` +
          `deployment budget is ${(MAX_EXPORT_FILE_BYTES / 1_000_000).toFixed(2)} MB`,
      );
    }
  }

  for (const filePath of findIndexFiles(OUT_DIR)) {
    const route = routeForFile(filePath);
    if (route === "/404" || route === "/_not-found") continue;

    const image = imageByRoute.get(route);
    if (!image) {
      failures.push(`${route}: no generated social card is registered`);
      continue;
    }

    const html = readFileSync(filePath, "utf8");
    const canonical = expectedUrl(route);
    const expectedImage = `${ORIGIN}${image}`;
    const checks: Array<[string, string | null, string]> = [
      ["canonical", readCanonical(html), canonical],
      ["og:url", readMeta(html, "property", "og:url"), canonical],
      ["og:image", readMeta(html, "property", "og:image"), expectedImage],
      ["og:image:width", readMeta(html, "property", "og:image:width"), "1200"],
      ["og:image:height", readMeta(html, "property", "og:image:height"), "630"],
      [
        "og:image:type",
        readMeta(html, "property", "og:image:type"),
        image.endsWith(".jpg") ? "image/jpeg" : "image/png",
      ],
      ["twitter:card", readMeta(html, "name", "twitter:card"), "summary_large_image"],
      ["twitter:image", readMeta(html, "name", "twitter:image"), expectedImage],
    ];

    for (const [name, actual, expected] of checks) {
      if (actual !== expected) failures.push(`${route}: ${name} is ${actual ?? "missing"}; expected ${expected}`);
    }

    for (const [attribute, key] of [
      ["property", "og:title"],
      ["property", "og:description"],
      ["property", "og:image:alt"],
      ["name", "twitter:title"],
      ["name", "twitter:description"],
      ["name", "twitter:image:alt"],
    ] as const) {
      if (!readMeta(html, attribute, key)?.trim()) failures.push(`${route}: ${key} is missing or empty`);
    }
    verified += 1;
  }

  if (failures.length > 0) {
    throw new Error(`Exported metadata verification failed:\n- ${failures.join("\n- ")}`);
  }
  const largest = exportFiles.reduce((current, filePath) =>
    statSync(filePath).size > statSync(current).size ? filePath : current,
  );
  console.log(
    `Verified social metadata for ${verified} exported HTML pages; ` +
      `${exportFiles.length} files fit the deploy budget (largest: ` +
      `${relative(OUT_DIR, largest)}, ${(statSync(largest).size / 1_000_000).toFixed(2)} MB).`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
