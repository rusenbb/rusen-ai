import Link from "next/link";
import type { Metadata } from "next";

import {
  getAllPosts,
  getAllSeries,
  formatDate,
  readUnit,
  type Lang,
  type Post,
} from "@/lib/blog";
import { buildSigil } from "@/lib/blog-sigil";
import LangPicker from "./components/LangPicker";
import BlogSection from "./components/BlogSection";
import PostRow from "./components/PostRow";
import PostSigil from "./components/PostSigil";
import { buildStaticPageMetadata } from "@/lib/social-metadata";

export const metadata: Metadata = buildStaticPageMetadata("blogs");

const LANGS: Lang[] = ["en", "tr"];
const LATEST_COUNT = 3;

/**
 * The blog index in three layers, so it stays readable as posts and series
 * grow: the newest posts, a shelf with one card per series, and a compact
 * archive of everything grouped by year. Each language renders its own
 * copy; the EN/TR picker hides the other.
 */
export default function BlogIndex() {
  const posts = getAllPosts();
  const series = getAllSeries();
  const seriesTitle = new Map(series.map((s) => [s.id, s.title]));
  const byLang = (lang: Lang) =>
    posts.filter((p) => p.lang === lang).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="blog-shell">
      <div className="idx-head">
        <span className="blog-kicker">Writings</span>
        <h1>Essays, organised by argument.</h1>
        <p className="lede">
          Most of what I write builds on what came before. Posts are grouped
          into running series, with standalone pieces in the archive.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <LangPicker />
        </div>
      </div>

      <BlogSection num="01 //" title="Latest" count="">
        {LANGS.map((lang) => (
          <div key={lang} className="latest-list" data-post-lang={lang} lang={lang}>
            {byLang(lang)
              .slice(0, LATEST_COUNT)
              .map((p) => (
                <PostRow
                  key={p.slug}
                  post={p}
                  meta={[
                    formatDate(p.date, lang),
                    `${p.readingMinutes} ${readUnit(lang)}`,
                    ...(p.seriesId ? [seriesTitle.get(p.seriesId)?.[lang] ?? ""] : []),
                  ].join(" · ")}
                />
              ))}
          </div>
        ))}
      </BlogSection>

      <BlogSection
        num="02 //"
        title={
          <>
            <span data-post-lang="en" lang="en">Series</span>
            <span data-post-lang="tr" lang="tr">Seriler</span>
          </>
        }
        count={`${String(series.length).padStart(2, "0")} SERIES`}
      >
        <div className="series-shelf">
          {series.map((s) => (
            <Link key={s.id} href={`/blogs/series/${s.id}`} className="series-card">
              <h3>
                <span data-post-lang="en" lang="en">{s.title.en}</span>
                <span data-post-lang="tr" lang="tr">{s.title.tr}</span>
              </h3>
              {LANGS.map((lang) => {
                const parts = s.posts.filter((p) => p.lang === lang);
                if (parts.length === 0) return null;
                const updated = parts.reduce((d, p) => (p.date > d ? p.date : d), parts[0].date);
                return (
                  <div key={lang} data-post-lang={lang} lang={lang}>
                    <span className="entry-meta">
                      {parts.length} {lang === "tr" ? "bölüm" : parts.length === 1 ? "part" : "parts"} ·{" "}
                      {formatDate(updated, lang)}
                    </span>
                    <div className="series-card__chain" aria-hidden="true">
                      {parts.map((p, i) => (
                        <span key={p.slug} className="series-card__link">
                          {i > 0 && <span className="series-card__dash">──</span>}
                          <PostSigil sigil={buildSigil(p.body)} />
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Link>
          ))}
        </div>
      </BlogSection>

      <BlogSection
        num="03 //"
        title={
          <>
            <span data-post-lang="en" lang="en">Archive</span>
            <span data-post-lang="tr" lang="tr">Arşiv</span>
          </>
        }
        count=""
      >
        {LANGS.map((lang) => (
          <Archive key={lang} lang={lang} posts={byLang(lang)} seriesTitle={seriesTitle} />
        ))}
      </BlogSection>

      <p className="idx-footnote">{posts.length} entries indexed</p>
    </div>
  );
}

function Archive({
  lang,
  posts,
  seriesTitle,
}: {
  lang: Lang;
  posts: Post[];
  seriesTitle: Map<string, { en: string; tr: string }>;
}) {
  const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))];
  return (
    <div className="archive" data-post-lang={lang} lang={lang}>
      {years.map((year) => (
        <div key={year} className="archive-year">
          <span className="archive-year__label">{year}</span>
          <div>
            {posts
              .filter((p) => p.date.startsWith(year))
              .map((p) => (
                <Link key={p.slug} href={`/blogs/${p.slug}`} className="archive-row">
                  <span className="archive-row__date">{formatDate(p.date, lang)}</span>
                  <PostSigil sigil={buildSigil(p.body)} />
                  <span className="archive-row__title">{p.title}</span>
                  <span className="archive-row__series">
                    {p.seriesId ? seriesTitle.get(p.seriesId)?.[lang] : ""}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
