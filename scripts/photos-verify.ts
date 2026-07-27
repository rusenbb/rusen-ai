#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { extname, relative, resolve } from "node:path";

import sharp from "sharp";

type Source = { url: string; width: number };
type GeneratedPhoto = {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurDataUrl: string;
  sources: Record<"thumbnail" | "display" | "large", Source>;
};
type GeneratedManifest = {
  schemaVersion: number;
  baseUrl: string;
  photos: GeneratedPhoto[];
};
type EditorialManifest = {
  heroPhotoId: string;
  locales: Array<{ id: string }>;
  photos: Record<
    string,
    {
      seriesId: string;
      translations: Record<
        string,
        { alt: string; title: string; story?: string; caption?: string }
      >;
    }
  >;
  series: Array<{ id: string; rows: string[][]; translations: Record<string, unknown> }>;
};

const ROOT = process.cwd();
const PUBLIC_DIR = resolve(ROOT, "public");
const PHOTO_DIR = resolve(PUBLIC_DIR, "photos");
const PRUNE = process.argv.includes("--prune");
const DRY_RUN = process.argv.includes("--dry-run");

function webpFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) return webpFiles(filePath);
    return extname(entry.name).toLowerCase() === ".webp" ? [filePath] : [];
  });
}

async function main(): Promise<void> {
  const generated = JSON.parse(
    readFileSync(resolve(ROOT, "src/content/photos.generated.json"), "utf8"),
  ) as GeneratedManifest;
  const editorial = JSON.parse(
    readFileSync(resolve(ROOT, "src/content/photos.json"), "utf8"),
  ) as EditorialManifest;
  const failures: string[] = [];

  if (generated.schemaVersion !== 1 || !Array.isArray(generated.photos)) {
    failures.push("generated photo manifest has an unsupported schema");
  }

  const generatedIds = new Set<string>();
  const expectedFiles = new Set<string>();
  for (const photo of generated.photos) {
    if (generatedIds.has(photo.id)) failures.push(`duplicate generated photo id ${photo.id}`);
    generatedIds.add(photo.id);
    if (!photo.blurDataUrl.startsWith("data:image/webp;base64,")) {
      failures.push(`${photo.id} has an invalid blur placeholder`);
    }
    const expectedRatio = photo.width / photo.height;
    if (Math.abs(expectedRatio - photo.aspectRatio) > 0.00001) {
      failures.push(`${photo.id} has inconsistent dimensions/aspect ratio`);
    }
    for (const [variant, source] of Object.entries(photo.sources)) {
      const filePath = resolve(PUBLIC_DIR, source.url.replace(/^\//, ""));
      if (!filePath.startsWith(`${PHOTO_DIR}/`)) {
        failures.push(`${photo.id}.${variant} escapes public/photos`);
        continue;
      }
      expectedFiles.add(filePath);
      if (!existsSync(filePath)) {
        failures.push(`${photo.id}.${variant} is missing at ${source.url}`);
        continue;
      }
      const metadata = await sharp(filePath).metadata();
      if (metadata.format !== "webp") failures.push(`${source.url} is not WebP`);
      if (metadata.width !== source.width) {
        failures.push(
          `${source.url} is ${metadata.width ?? "?"}px wide; manifest says ${source.width}px`,
        );
      }
    }
  }

  const editorialIds = new Set(Object.keys(editorial.photos));
  for (const id of editorialIds) {
    if (!generatedIds.has(id)) failures.push(`${id} has copy but no generated asset`);
  }
  for (const id of generatedIds) {
    if (!editorialIds.has(id)) failures.push(`${id} has assets but no editorial copy`);
  }
  if (!editorialIds.has(editorial.heroPhotoId)) {
    failures.push(`hero photo ${editorial.heroPhotoId} is not in the editorial registry`);
  }

  const placedIds = new Set<string>([editorial.heroPhotoId]);
  const localeIds = editorial.locales.map((locale) => locale.id);
  for (const series of editorial.series) {
    for (const locale of localeIds) {
      if (!series.translations[locale]) failures.push(`${series.id} is missing ${locale} copy`);
    }
    for (const id of series.rows.flat()) {
      if (placedIds.has(id)) failures.push(`${id} appears more than once in the gallery layout`);
      placedIds.add(id);
      if (editorial.photos[id]?.seriesId !== series.id) {
        failures.push(`${id} is placed in ${series.id} but declares ${editorial.photos[id]?.seriesId ?? "no series"}`);
      }
    }
  }
  for (const [id, photo] of Object.entries(editorial.photos)) {
    if (!placedIds.has(id)) failures.push(`${id} is not placed in the gallery`);
    for (const locale of localeIds) {
      const copy = photo.translations[locale];
      if (!copy?.title?.trim() || !copy.alt?.trim()) {
        failures.push(`${id} is missing ${locale} title or alt text`);
      }
      if (!copy?.story?.trim() && !copy?.caption?.trim()) {
        failures.push(`${id} is missing ${locale} story/caption`);
      }
    }
  }

  const unexpected = webpFiles(PHOTO_DIR).filter((filePath) => !expectedFiles.has(filePath));
  if (unexpected.length > 0 && PRUNE && !DRY_RUN) {
    for (const filePath of unexpected) rmSync(filePath);
  } else if (unexpected.length > 0 && !DRY_RUN) {
    failures.push(
      `${unexpected.length} orphan photo assets found; run photos:prune:dry-run before pruning`,
    );
  }

  if (unexpected.length > 0) {
    const action = PRUNE && !DRY_RUN ? "Pruned" : "Would prune";
    console.log(`${action} ${unexpected.length} orphan photo assets:`);
    for (const filePath of unexpected) console.log(`- ${relative(ROOT, filePath)}`);
  }

  if (failures.length > 0) {
    throw new Error(`Photo verification failed:\n- ${failures.join("\n- ")}`);
  }
  console.log(
    `Verified ${generated.photos.length} photos and ${expectedFiles.size} generated assets` +
      (unexpected.length > 0 && DRY_RUN ? "; dry run made no changes." : "."),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
