#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import sharp from "sharp";

import { getAllPosts, getAllSeries, getAllTags, tagDisplay, tagSlug } from "../src/lib/blog.ts";
import { getProjectPath, PROJECTS } from "../src/lib/projects.ts";

type StaticSocialPage = {
  path: string;
  title: string;
  description: string;
  locale: string;
  label: string;
  headline: string[];
  detail: string;
  image: string;
};

type CardSpec = {
  route: string;
  output: string;
  label: string;
  title: string[];
  description: string;
  register: string;
  seed: string;
  variant: "system" | "project" | "editorial" | "document";
};

type GeneratedAsset = {
  route: string;
  image: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

type PhotoEditorialManifest = {
  heroPhotoId: string;
  photos: Record<string, unknown>;
};

type PhotoGeneratedManifest = {
  photos: Array<{
    id: string;
    sources: { large: { url: string } };
  }>;
};

const ROOT = process.cwd();
const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 1_500_000;

const STATIC_PAGES = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/social-pages.json"), "utf8"),
) as Record<string, StaticSocialPage>;

const PHOTO_EDITORIAL = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/photos.json"), "utf8"),
) as PhotoEditorialManifest;

const PHOTO_GENERATED = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/photos.generated.json"), "utf8"),
) as PhotoGeneratedManifest;

const PHOTO_HERO = PHOTO_GENERATED.photos.find(
  (photo) => photo.id === PHOTO_EDITORIAL.heroPhotoId,
);

if (!PHOTO_HERO) {
  throw new Error(`Photo hero ${PHOTO_EDITORIAL.heroPhotoId} is missing from the generated manifest`);
}

const PHOTO_SOURCE = resolve(ROOT, "public", PHOTO_HERO.sources.large.url.replace(/^\//, ""));
const PHOTO_COUNT = Object.keys(PHOTO_EDITORIAL.photos).length;

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || current.length === 0) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  const consumedWords = lines.join(" ").split(/\s+/).length;
  if (consumedWords < words.length && lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].replace(/[.,;:!?]?$/, "")}…`;
  }
  return lines.slice(0, maxLines);
}

function titleFontSize(lines: string[]): number {
  const longest = Math.max(...lines.map((line) => line.length));
  if (lines.length >= 3 || longest > 24) return 62;
  if (longest > 18) return 70;
  return 80;
}

function signalCells(seed: string): string {
  const seedValue = hash(seed);
  const cells: string[] = [];
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const active = ((seedValue >>> ((row * 5 + column) % 24)) & 1) === 1;
      const x = 925 + column * 43;
      const y = 152 + row * 43;
      cells.push(
        `<rect x="${x}" y="${y}" width="29" height="29" rx="2" fill="${active ? "#79f29b" : "none"}" fill-opacity="${active ? "0.24" : "0"}" stroke="#79f29b" stroke-opacity="${active ? "0.48" : "0.14"}"/>`,
      );
    }
  }
  return cells.join("");
}

function titleMarkup(lines: string[], fontSize: number): string {
  const lineHeight = Math.round(fontSize * 1.02);
  const startY = lines.length === 3 ? 198 : 226;
  return lines
    .map(
      (line, index) =>
        `<text x="78" y="${startY + index * lineHeight}" class="title" font-size="${fontSize}">${xml(line)}</text>`,
    )
    .join("");
}

function descriptionMarkup(description: string, titleLines: string[], fontSize: number): string {
  const lines = wrapText(description, 70, 2);
  const lineHeight = 31;
  const titleStart = titleLines.length === 3 ? 198 : 226;
  const titleEnd = titleStart + (titleLines.length - 1) * Math.round(fontSize * 1.02);
  const startY = Math.max(426, titleEnd + 62);
  return lines
    .map(
      (line, index) =>
        `<text x="80" y="${startY + index * lineHeight}" class="description">${xml(line)}</text>`,
    )
    .join("");
}

function renderCardSvg(spec: CardSpec): Buffer {
  const fontSize = titleFontSize(spec.title);
  const code = String(hash(spec.seed) % 1000).padStart(3, "0");
  const variantCode = {
    system: "SYS",
    project: "RUN",
    editorial: "TXT",
    document: "DOC",
  }[spec.variant];

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0b0e0c"/>
          <stop offset="1" stop-color="#050706"/>
        </linearGradient>
        <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#79f29b" stop-opacity="0.78"/>
          <stop offset="0.42" stop-color="#79f29b" stop-opacity="0.14"/>
          <stop offset="1" stop-color="#79f29b" stop-opacity="0"/>
        </linearGradient>
        <style>
          text { font-family: "Geist Mono", "SFMono-Regular", Menlo, Consolas, monospace; }
          .micro { fill: #a6aca8; font-size: 16px; font-weight: 600; letter-spacing: 3px; }
          .title { fill: #f2f4ef; font-weight: 700; letter-spacing: -2px; }
          .description { fill: #b9bfba; font-size: 24px; font-weight: 450; letter-spacing: -0.25px; }
          .register { fill: #79f29b; font-size: 17px; font-weight: 650; letter-spacing: 2px; }
        </style>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <rect x="38" y="38" width="1124" height="554" rx="2" fill="none" stroke="#b9c1ba" stroke-opacity="0.2"/>
      <path d="M38 106H1162" stroke="#b9c1ba" stroke-opacity="0.18"/>
      <path d="M38 536H1162" stroke="#b9c1ba" stroke-opacity="0.18"/>
      <rect x="38" y="105" width="760" height="2" fill="url(#rail)"/>
      <rect x="72" y="68" width="10" height="10" rx="1" fill="#79f29b"/>
      <text x="98" y="79" class="micro">${xml(spec.label.toUpperCase())}</text>
      <text x="1124" y="79" class="micro" text-anchor="end">${variantCode}::${code}</text>
      <g aria-hidden="true">${signalCells(spec.seed)}</g>
      <path d="M902 137V437H1147" fill="none" stroke="#79f29b" stroke-opacity="0.12"/>
      <text x="1034" y="462" class="micro" text-anchor="middle" fill-opacity="0.42">0 · 1 · 0</text>
      ${titleMarkup(spec.title, fontSize)}
      ${descriptionMarkup(spec.description, spec.title, fontSize)}
      <text x="78" y="570" class="register">[ ${xml(spec.register.toUpperCase())} ]</text>
      <text x="1124" y="570" class="micro" text-anchor="end">${xml(spec.route)}</text>
    </svg>
  `);
}

async function writePng(spec: CardSpec): Promise<void> {
  const outputPath = resolve(ROOT, `public${spec.output}`);
  mkdirSync(dirname(outputPath), { recursive: true });
  await sharp(renderCardSvg(spec))
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toFile(outputPath);
}

async function writePhotoCard(page: StaticSocialPage): Promise<void> {
  const outputPath = resolve(ROOT, `public${page.image}`);
  mkdirSync(dirname(outputPath), { recursive: true });
  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#020403" stop-opacity="0.88"/>
          <stop offset="0.5" stop-color="#020403" stop-opacity="0.24"/>
          <stop offset="1" stop-color="#020403" stop-opacity="0.08"/>
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.58" stop-color="#000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.54"/>
        </linearGradient>
        <style>
          text { font-family: "Geist Mono", "SFMono-Regular", Menlo, Consolas, monospace; }
          .micro { fill: #f2f4ef; font-size: 15px; font-weight: 600; letter-spacing: 3px; }
          .title { fill: #f7f6ef; font-size: 76px; font-weight: 700; letter-spacing: -2px; }
          .detail { fill: #e2e2dc; font-size: 20px; font-weight: 500; letter-spacing: 0.5px; }
          .register { fill: #79f29b; font-size: 17px; font-weight: 650; letter-spacing: 2px; }
        </style>
      </defs>
      <rect width="1200" height="630" fill="url(#shade)"/>
      <rect width="1200" height="630" fill="url(#floor)"/>
      <rect x="38" y="38" width="1124" height="554" rx="2" fill="none" stroke="#fff" stroke-opacity="0.28"/>
      <path d="M38 106H1162" stroke="#fff" stroke-opacity="0.22"/>
      <path d="M38 536H1162" stroke="#fff" stroke-opacity="0.22"/>
      <rect x="72" y="68" width="10" height="10" rx="1" fill="#79f29b"/>
      <text x="98" y="79" class="micro">${xml(page.label)}</text>
      <text x="1124" y="79" class="micro" text-anchor="end">FRAME::01/${String(PHOTO_COUNT).padStart(2, "0")}</text>
      <text x="72" y="332" class="title">${xml(page.headline[0])}</text>
      <text x="72" y="408" class="title">${xml(page.headline[1] ?? "")}</text>
      <text x="76" y="458" class="detail">${xml(page.detail)}</text>
      <text x="72" y="570" class="register">[ VIEW ARCHIVE ]</text>
      <text x="1124" y="570" class="micro" text-anchor="end">${xml(page.path)}</text>
    </svg>
  `);

  await sharp(PHOTO_SOURCE)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .composite([{ input: overlay }])
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(outputPath);
}

function staticSpecs(): CardSpec[] {
  return Object.values(STATIC_PAGES)
    .filter((page) => page.image.endsWith(".png"))
    .map((page) => ({
      route: page.path,
      output: page.image,
      label: page.label,
      title: page.headline,
      description: page.description,
      register: page.detail,
      seed: page.path,
      variant: page.path.startsWith("/cv") ? "document" : "system",
    }));
}

function projectSpecs(): CardSpec[] {
  return PROJECTS.map((project) => ({
    route: getProjectPath(project),
    output: `/social/projects/${project.slug}.png`,
    label: `${project.collection.replace("-", " ")} / ${project.status}`,
    title: wrapText(project.title.toUpperCase(), 22, 3),
    description: project.summary,
    register: project.capabilities.slice(0, 2).join(" / ") || "INTERACTIVE PROJECT",
    seed: project.slug,
    variant: "project",
  }));
}

function blogSpecs(): CardSpec[] {
  const postSpecs: CardSpec[] = getAllPosts().map((post) => ({
    route: `/blogs/${post.slug}`,
    output: `/social/blog/posts/${post.slug}.png`,
    label: `BLOG / ${post.lang.toUpperCase()} / ${post.date}`,
    title: wrapText(post.title.toUpperCase(), 27, 3),
    description: post.description,
    register: `${post.readingMinutes} MIN READ / ARTICLE`,
    seed: post.slug,
    variant: "editorial",
  }));

  const seenTagSlugs = new Set<string>();
  const tagSpecs: CardSpec[] = [];
  for (const tag of getAllTags()) {
    const slug = tagSlug(tag.tag);
    if (seenTagSlugs.has(slug)) continue;
    seenTagSlugs.add(slug);
    const matching = getAllTags().filter((item) => tagSlug(item.tag) === slug);
    const count = matching.reduce((sum, item) => sum + item.count, 0);
    const display = tagDisplay(tag.tag);
    tagSpecs.push({
      route: `/blogs/tag/${slug}`,
      output: `/social/blog/tags/${slug}.png`,
      label: "BLOG ARCHIVE / TAG",
      title: wrapText(`#${display.toUpperCase()}`, 24, 3),
      description: `${count} ${count === 1 ? "essay" : "essays"} filed under this signal.`,
      register: "BROWSE TAG",
      seed: `tag:${slug}`,
      variant: "editorial",
    });
  }

  const seriesSpecs: CardSpec[] = getAllSeries().map((series) => ({
    route: `/blogs/series/${series.id}`,
    output: `/social/blog/series/${series.id}.png`,
    label: "BLOG ARCHIVE / SERIES",
    title: wrapText(series.title.en.toUpperCase(), 26, 3),
    description: `${series.posts.length} connected essays; each part builds on what came before.`,
    register: "READ SERIES",
    seed: `series:${series.id}`,
    variant: "editorial",
  }));

  return [...postSpecs, ...tagSpecs, ...seriesSpecs];
}

function expectedAssets(): Array<{ route: string; image: string }> {
  const specs = [...staticSpecs(), ...projectSpecs(), ...blogSpecs()];
  return [
    ...specs.map((spec) => ({ route: spec.route, image: spec.output })),
    { route: STATIC_PAGES.photos.path, image: STATIC_PAGES.photos.image },
  ];
}

async function verifyAssets(): Promise<GeneratedAsset[]> {
  const failures: string[] = [];
  const assets: GeneratedAsset[] = [];
  for (const expected of expectedAssets()) {
    const filePath = resolve(ROOT, `public${expected.image}`);
    if (!existsSync(filePath)) {
      failures.push(`missing ${expected.image} for ${expected.route}`);
      continue;
    }
    const metadata = await sharp(filePath).metadata();
    const bytes = statSync(filePath).size;
    if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
      failures.push(
        `${expected.image} is ${metadata.width ?? "?"}x${metadata.height ?? "?"}; expected ${WIDTH}x${HEIGHT}`,
      );
    }
    if (metadata.format !== "png" && metadata.format !== "jpeg") {
      failures.push(`${expected.image} uses unsupported ${metadata.format ?? "unknown"} format`);
    }
    if (bytes > MAX_BYTES) {
      failures.push(`${expected.image} is ${(bytes / 1_000_000).toFixed(2)} MB; limit is 1.50 MB`);
    }
    assets.push({
      route: expected.route,
      image: expected.image,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      bytes,
      format: metadata.format ?? "unknown",
    });
  }
  if (failures.length > 0) {
    throw new Error(`Social preview verification failed:\n- ${failures.join("\n- ")}`);
  }
  return assets;
}

async function build(): Promise<void> {
  const specs = [...staticSpecs(), ...projectSpecs(), ...blogSpecs()];
  await Promise.all(specs.map(writePng));
  await writePhotoCard(STATIC_PAGES.photos);
  const assets = await verifyAssets();
  const manifestPath = resolve(ROOT, "public/social/manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({ assets }, null, 2)}\n`);
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  console.log(
    `Built and verified ${assets.length} social cards (${(totalBytes / 1_000_000).toFixed(2)} MB total).`,
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--verify")) {
    const assets = await verifyAssets();
    console.log(`Verified ${assets.length} social cards.`);
    return;
  }
  await build();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
