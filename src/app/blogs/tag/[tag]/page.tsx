import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getAllSeries,
  getAllTags,
  getPostsByTag,
  formatDate,
  readUnit,
  tagSlug,
  tagDisplay,
} from "@/lib/blog";
import LangPicker from "../../components/LangPicker";
import PostRow from "../../components/PostRow";
import {
  blogTagImagePath,
  buildSocialMetadata,
} from "@/lib/social-metadata";

export async function generateStaticParams() {
  // Unique slugs only - different-language tags ("ai" vs "yapay zeka") slug
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
  const allTags = getAllTags();
  const matching = allTags.filter((item) => tagSlug(item.tag) === tag);
  if (matching.length === 0) return {};
  const displayTag = tagDisplay(matching[0].tag);
  const postCount = matching.reduce((sum, item) => sum + item.count, 0);
  const metadataLang = matching[0].lang;
  const description = metadataLang === "tr"
    ? `Rusen.ai üzerinde #${displayTag} etiketiyle yayımlanan ${postCount} yazı.`
    : `${postCount} ${postCount === 1 ? "essay" : "essays"} filed under #${displayTag} on Rusen.ai.`;

  return buildSocialMetadata({
    title: `#${displayTag} | Rusen.ai Blog`,
    description,
    path: `/blogs/tag/${tag}`,
    image: blogTagImagePath(tag),
    imageAlt: `#${displayTag} — Rusen.ai blog archive`,
    locale: metadataLang === "tr" ? "tr_TR" : "en_US",
  });
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
  const seriesTitles = new Map(getAllSeries().map((s) => [s.id, s.title]));

  // A single-language tag is scoped locally rather than mutating the persistent
  // document preference, so leaving the route restores the user's filter.
  const presentLangs = new Set(posts.map((p) => p.lang));
  const forceLang =
    presentLangs.size === 1 ? Array.from(presentLangs)[0] : null;
  const availableLangs = (["en", "tr"] as const).filter((lang) => presentLangs.has(lang));

  return (
    <div
      className="blog-shell"
      data-no-ripple
      data-blog-force-lang={forceLang ?? undefined}
    >
      <div className="idx-head">
        <span className="blog-kicker">Tag</span>
        <div className="tag-header">
          <h1>
            <span className="hash">#</span>
            {tagDisplay(displayTag)}
          </h1>
          <span className="count">
            {String(posts.length).padStart(2, "0")}{" "}
            {posts.length === 1 ? "essay" : "essays"}
          </span>
        </div>
        <LangPicker available={availableLangs} forced={forceLang ?? undefined} />
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

      <div className="post-list">
        {posts.map((p) => (
          <PostRow
            key={p.slug}
            post={p}
            meta={[
              formatDate(p.date, p.lang),
              `${p.readingMinutes} ${readUnit(p.lang)}`,
              ...(p.seriesId
                ? [`${seriesTitles.get(p.seriesId)?.[p.lang] ?? ""} · ${p.lang === "tr" ? "Bölüm" : "Part"} ${String(p.seriesOrder ?? 0).padStart(2, "0")}`]
                : []),
            ].join(" · ")}
          />
        ))}
      </div>
    </div>
  );
}
