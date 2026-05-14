import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getAllTags,
  getPostsByTag,
  formatDate,
  readUnit,
  tagSlug,
  tagDisplay,
} from "@/lib/blog";
import LangPicker from "../../components/LangPicker";

export async function generateStaticParams() {
  // Unique slugs only — different-language tags ("ai" vs "yapay zeka") slug
  // differently, so no collision. If two tags slugged identically across
  // languages, we'd return the slug once and let the page show both languages
  // (with the per-row data-tag-lang doing the visual split).
  const slugs = new Set<string>();
  for (const t of getAllTags()) slugs.add(tagSlug(t.tag));
  return Array.from(slugs).map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return {
    title: `#${tagDisplay(tag)} — Blog — rusen.ai`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;

  const allTags = getAllTags();
  const matching = allTags.filter((t) => tagSlug(t.tag) === rawTag);
  if (matching.length === 0) notFound();

  // Find every post that has *any* matching tag string. Different languages
  // might use different tag strings that happen to share the slug.
  const matchingTagStrings = new Set(matching.map((m) => m.tag));
  const posts = Array.from(matchingTagStrings)
    .flatMap((t) => getPostsByTag(t))
    .filter((p, i, arr) => arr.findIndex((q) => q.slug === p.slug) === i)
    .sort((a, b) => b.date.localeCompare(a.date));

  const displayTag = matching[0].tag;

  // If every post under this tag is in one language, force the visible
  // filter to that language for this page only. Prevents the "I clicked
  // a TR tag and saw nothing because my preference is EN" case. We do
  // NOT write to localStorage — the user's global preference is preserved
  // for everywhere else. The script runs as the first body element so
  // CSS attribute selectors apply before any content paints (no flash).
  const presentLangs = new Set(posts.map((p) => p.lang));
  const forceLang =
    presentLangs.size === 1 ? Array.from(presentLangs)[0] : null;

  return (
    <>
      {forceLang && (
        <script
          dangerouslySetInnerHTML={{
            __html: `try { document.documentElement.dataset.blogLang = ${JSON.stringify(
              forceLang
            )}; } catch (_) {}`,
          }}
        />
      )}
      <main className="blog-shell" data-no-ripple>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.78rem",
            letterSpacing: "0.2em",
            color: "var(--sub)",
          }}
        >
          {"// TAGS"}
        </span>
        <span
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.95rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Browse by tag
        </span>
        <span
          style={{
            flex: 1,
            height: "1px",
            opacity: 0.3,
            background:
              "repeating-linear-gradient(90deg, var(--line-strong) 0 6px, transparent 6px 10px)",
          }}
        />
      </div>

      <div className="tag-strip">
        {allTags.map((t) => {
          const slug = tagSlug(t.tag);
          const isActive = slug === rawTag && t.tag === displayTag;
          return (
            <Link
              key={`${t.lang}::${t.tag}`}
              href={`/blogs/tag/${slug}`}
              data-tag-lang={t.lang}
              className={isActive ? "is-active" : ""}
            >
              #{tagDisplay(t.tag)}
              <span className="count">{t.count}</span>
            </Link>
          );
        })}
      </div>

      <div className="tag-header">
        <h1>
          <span className="hash">#</span>
          {tagDisplay(displayTag)}
        </h1>
        <span className="count">
          {String(posts.length).padStart(2, "0")}{" "}
          {posts.length === 1 ? "essay" : "essays"}
        </span>
        <LangPicker />
      </div>

      <div className="entries">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blogs/${p.slug}`}
            className="entry-row"
            data-post-lang={p.lang}
          >
            <span className="date">{formatDate(p.date, p.lang)}</span>
            <div className="body">
              <h3>{p.title}</h3>
              <p className="desc">{p.description}</p>
              <div className="meta">
                {p.seriesId
                  ? `Series · part ${String(p.seriesOrder ?? 0).padStart(2, "0")}`
                  : "Standalone"}{" "}
                · {p.readingMinutes} {readUnit(p.lang)}
              </div>
            </div>
            <span className="lang-badge">{p.lang.toUpperCase()}</span>
          </Link>
        ))}
      </div>
    </main>
    </>
  );
}
