import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

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

function readPostFile(lang: Lang, file: string): Post | null {
  const fullPath = path.join(BLOG_DIR, lang, file);
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);

  if (!data.title || !data.date) return null;

  const wordCount = countWords(content);
  return {
    slug,
    lang,
    title: data.title,
    date: data.date,
    description: data.description ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    translationKey: data.translationKey,
    seriesId: data.seriesId,
    seriesOrder: data.seriesOrder,
    body: content,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / READING_WPM)),
  };
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
      const post = readPostFile(lang, file);
      if (post) posts.push(post);
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
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
 * the on-screen text agree — no more mixed "DEGISIM" / "DÖNÜŞÜM" rows.
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

/** Display form — diacritics stripped, spaces preserved. */
export function tagDisplay(tag: string): string {
  return asciiizeTag(tag);
}

let seriesCache: Series[] | null = null;

export function getAllSeries(): Series[] {
  if (seriesCache) return seriesCache;

  const seriesData: SeriesJson = JSON.parse(
    fs.readFileSync(SERIES_FILE, "utf-8")
  );

  const series: Series[] = [];
  for (const [id, meta] of Object.entries(seriesData)) {
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
