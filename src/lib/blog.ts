import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

const CONTENT_ROOT = path.join(process.cwd(), "src", "content");
const BLOG_DIR = path.join(CONTENT_ROOT, "blog");
const SERIES_FILE = path.join(CONTENT_ROOT, "series.json");

export type Lang = "en" | "tr";

export interface PostFrontmatter {
  title: string;
  date: string;
  description: string;
  tags: string[];
  translationKey?: string;
  seriesId?: string;
  seriesOrder?: number;
}

export interface Post extends PostFrontmatter {
  slug: string;
  lang: Lang;
  body: string;
  wordCount: number;
  readingMinutes: number;
}

export interface Series {
  id: string;
  title: { en: string; tr: string };
  posts: Post[];
}

interface SeriesJson {
  [id: string]: { title: { en: string; tr: string } };
}

const READING_WPM = 220;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function requiredFrontmatterString(
  data: Record<string, unknown>,
  field: string,
  file: string,
): string {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${file}: ${field} must be a non-empty string`);
  }
  return value;
}

function optionalFrontmatterString(
  data: Record<string, unknown>,
  field: string,
  file: string,
): string | undefined {
  const value = data[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${file}: ${field} must be a non-empty string when set`);
  }
  return value;
}

function readPostFile(lang: Lang, file: string): Post {
  const fullPath = path.join(BLOG_DIR, lang, file);
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);

  const title = requiredFrontmatterString(data, "title", fullPath);
  const date = requiredFrontmatterString(data, "date", fullPath);
  const description = requiredFrontmatterString(data, "description", fullPath);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${fullPath}: date must be a valid YYYY-MM-DD value`);
  }
  if (
    !Array.isArray(data.tags) ||
    data.tags.length === 0 ||
    data.tags.some((tag) => typeof tag !== "string" || !tag.trim())
  ) {
    throw new Error(`${fullPath}: tags must be a non-empty string array`);
  }
  const tags = data.tags as string[];
  if (new Set(tags).size !== tags.length) {
    throw new Error(`${fullPath}: tags must be unique`);
  }
  const translationKey = optionalFrontmatterString(data, "translationKey", fullPath);
  const seriesId = optionalFrontmatterString(data, "seriesId", fullPath);
  const seriesOrder = data.seriesOrder;
  if (seriesId && (!Number.isInteger(seriesOrder) || (seriesOrder as number) < 1)) {
    throw new Error(`${fullPath}: seriesOrder must be a positive integer for a series post`);
  }
  if (!seriesId && seriesOrder !== undefined) {
    throw new Error(`${fullPath}: seriesOrder requires seriesId`);
  }

  const wordCount = countWords(content);
  return {
    slug,
    lang,
    title,
    date,
    description,
    tags,
    translationKey,
    seriesId,
    seriesOrder: seriesOrder as number | undefined,
    body: content,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / READING_WPM)),
  };
}

function readSeriesData(): SeriesJson {
  const raw = JSON.parse(fs.readFileSync(SERIES_FILE, "utf-8")) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("series.json must contain an object");
  }
  for (const [id, value] of Object.entries(raw)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(`series.json has invalid id ${id}`);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`series ${id} must be an object`);
    }
    const title = (value as { title?: unknown }).title;
    if (!title || typeof title !== "object" || Array.isArray(title)) {
      throw new Error(`series ${id} must define localized titles`);
    }
    for (const lang of ["en", "tr"] as const) {
      if (typeof (title as Record<string, unknown>)[lang] !== "string") {
        throw new Error(`series ${id} is missing its ${lang} title`);
      }
    }
  }
  return raw as SeriesJson;
}

const SERIES_DATA = readSeriesData();

function validatePosts(posts: Post[]): void {
  const slugs = new Set<string>();
  const translations = new Map<string, Post[]>();
  const seriesOrders = new Set<string>();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`Duplicate blog slug: ${post.slug}`);
    slugs.add(post.slug);
    if (post.translationKey) {
      const group = translations.get(post.translationKey) ?? [];
      group.push(post);
      translations.set(post.translationKey, group);
    }
    if (post.seriesId) {
      if (!SERIES_DATA[post.seriesId]) {
        throw new Error(`${post.slug} references unknown series ${post.seriesId}`);
      }
      const key = `${post.seriesId}:${post.lang}:${post.seriesOrder}`;
      if (seriesOrders.has(key)) throw new Error(`Duplicate series position ${key}`);
      seriesOrders.add(key);
    }
  }
  for (const [key, group] of translations) {
    const languages = new Set(group.map((post) => post.lang));
    if (group.length !== 2 || languages.size !== 2) {
      throw new Error(`Translation ${key} must have exactly one English and one Turkish post`);
    }
  }
}

let postsCache: Post[] | null = null;

export function getAllPosts(): Post[] {
  if (postsCache) return postsCache;

  const posts: Post[] = [];
  for (const lang of ["en", "tr"] as const) {
    const dir = path.join(BLOG_DIR, lang);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue;
      posts.push(readPostFile(lang, file));
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  validatePosts(posts);
  postsCache = posts;
  return posts;
}

export function getPostBySlug(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function getTranslation(post: Post): Post | null {
  if (!post.translationKey) return null;
  return (
    getAllPosts().find(
      (p) => p.translationKey === post.translationKey && p.slug !== post.slug
    ) ?? null
  );
}

export function getAllTags(): Array<{ tag: string; lang: Lang; count: number }> {
  const counts = new Map<string, { lang: Lang; count: number }>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      const key = `${post.lang}::${tag}`;
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { lang: post.lang, count: 1 });
    }
  }
  return Array.from(counts.entries())
    .map(([key, { lang, count }]) => ({ tag: key.split("::")[1], lang, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((p) => p.tags.includes(tag));
}

/**
 * Strip Turkish diacritics (ö ü ş ç ğ via NFD, ı/İ explicitly since they
 * don't decompose). Used by both tagSlug and tagDisplay so the URL and
 * the on-screen text agree - no more mixed "DEGISIM" / "DÖNÜŞÜM" rows.
 */
function asciiizeTag(tag: string): string {
  return tag
    .replace(/[İI]/g, "i")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** URL-safe tag slug. Examples: "dönüşüm" → "donusum", "yapay zeka" → "yapay-zeka". */
export function tagSlug(tag: string): string {
  return asciiizeTag(tag)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Display form - diacritics stripped, spaces preserved. */
export function tagDisplay(tag: string): string {
  return asciiizeTag(tag);
}

let seriesCache: Series[] | null = null;

export function getAllSeries(): Series[] {
  if (seriesCache) return seriesCache;

  const series: Series[] = [];
  for (const [id, meta] of Object.entries(SERIES_DATA)) {
    const posts = getAllPosts()
      .filter((p) => p.seriesId === id)
      .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
    series.push({ id, title: meta.title, posts });
  }

  seriesCache = series;
  return series;
}

export function getSeriesById(id: string): Series | null {
  return getAllSeries().find((s) => s.id === id) ?? null;
}

export function getPrevNextInSeries(
  post: Post
): { prev: Post | null; next: Post | null } {
  if (!post.seriesId) return { prev: null, next: null };
  const sibs = getAllSeries()
    .find((s) => s.id === post.seriesId)
    ?.posts.filter((p) => p.lang === post.lang)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
  if (!sibs) return { prev: null, next: null };
  const idx = sibs.findIndex((p) => p.slug === post.slug);
  return {
    prev: idx > 0 ? sibs[idx - 1] : null,
    next: idx < sibs.length - 1 ? sibs[idx + 1] : null,
  };
}

export function getStandalonePosts(): Post[] {
  return getAllPosts().filter((p) => !p.seriesId);
}

/**
 * Latest posts, deduped by translationKey (so EN+TR of the same essay don't
 * both surface). When a post has a translation, the preferred-language version
 * wins; otherwise the post stands alone.
 */
export function getLatestUniquePosts(n: number, preferLang: Lang = "en"): Post[] {
  const seen = new Set<string>();
  const out: Post[] = [];
  // Walk dates newest-first, but per translation group pick the preferred lang
  // if it exists.
  const byKey = new Map<string, Post[]>();
  for (const p of getAllPosts()) {
    const key = p.translationKey ?? `__solo::${p.slug}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(p);
  }
  // Pick the canonical version per group.
  const canonical: Post[] = [];
  for (const group of byKey.values()) {
    const preferred = group.find((p) => p.lang === preferLang) ?? group[0];
    canonical.push(preferred);
  }
  canonical.sort((a, b) => b.date.localeCompare(a.date));
  for (const p of canonical) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    out.push(p);
    if (out.length >= n) break;
  }
  return out;
}

export interface Heading {
  id: string;
  text: string;
  depth: number;
}

/** Strip inline markdown so heading text matches the rendered (parsed) text. */
function stripInlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .trim();
}

/**
 * Pull ATX headings from raw markdown for the table of contents. IDs are
 * generated with the same github-slugger that rehype-slug uses at render time
 * (one fresh instance per document, walked in order) so the anchors the TOC
 * links to exactly match the `id`s stamped onto the rendered headings -
 * including the `-1`/`-2` suffixes github-slugger adds to duplicate titles.
 * Fenced code blocks are skipped so a commented `# foo` inside code isn't
 * mistaken for a heading.
 */
export function extractHeadings(body: string): Heading[] {
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];
  let fence = "";

  for (const line of body.split("\n")) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (marker === fence) fence = "";
      continue;
    }
    if (fence) continue;

    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = stripInlineMd(m[2]);
    if (!text) continue;
    headings.push({ id: slugger.slug(text), text, depth: m[1].length });
  }

  return headings;
}

export function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (lang === "tr") {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function readUnit(lang: Lang): string {
  return lang === "tr" ? "dk" : "min";
}
