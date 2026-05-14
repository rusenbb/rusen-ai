import { notFound } from "next/navigation";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

import {
  getAllPosts,
  getPostBySlug,
  getTranslation,
  getPrevNextInSeries,
  getAllSeries,
  formatDate,
  readUnit,
  tagSlug,
  tagDisplay,
} from "@/lib/blog";

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

// Escape bare "<" that MDX would otherwise try to parse as JSX (e.g. "<3").
// Skips fenced code blocks and inline code so source code isn't mangled.
function escapeForMdx(source: string): string {
  const fenced = source.split(/(```[\s\S]*?```)/g);
  return fenced
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      const inline = seg.split(/(`[^`]+`)/g);
      return inline
        .map((s, j) => {
          if (j % 2 === 1) return s;
          return s.replace(/<(?![a-zA-Z/!?])/g, "\\<");
        })
        .join("");
    })
    .join("");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — rusen.ai`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      locale: post.lang === "tr" ? "tr_TR" : "en_US",
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const sibling = getTranslation(post);
  const { prev, next } = getPrevNextInSeries(post);
  const series = post.seriesId
    ? getAllSeries().find((s) => s.id === post.seriesId)
    : null;
  const seriesPosts = series?.posts.filter((p) => p.lang === post.lang) ?? [];
  const seriesTotal = seriesPosts.length;
  const seriesOrder = post.seriesOrder ?? 0;

  const { content } = await compileMDX({
    source: escapeForMdx(post.body),
    components: {
      // Demote body h1 to h2 — frontmatter title is the only real h1 on the page.
      h1: (props) => <h2 {...props} />,
    },
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: "github-dark-dimmed",
              keepBackground: false,
            },
          ],
          rehypeKatex,
          rehypeSlug,
        ],
      },
    },
  });

  return (
    <main className="post-shell" data-no-ripple>
      <div className="prompt-line">
        <span className="p">rusen@rusen.ai</span>
        :<span style={{ color: "var(--muted)" }}>/blogs</span>${" "}
        <span className="c">cat {post.slug}.md</span>
      </div>

      <div className="ascii-frame">
        <div className="ascii-frame-head">
          <span>MANIFEST · post.md</span>
          <span>
            <span className="signal-blip-sm" />
            PUBLISHED
          </span>
        </div>
        <div className="ascii-frame-body">
          <dl>
            <dt>Date</dt>
            <dd>{formatDate(post.date, post.lang)}</dd>
            {series && (
              <>
                <dt>Series</dt>
                <dd>
                  <Link
                    href={`/blogs/series/${series.id}`}
                    style={{ color: "var(--foreground)" }}
                  >
                    {series.title[post.lang]}
                  </Link>{" "}
                  · part {String(seriesOrder).padStart(2, "0")} /{" "}
                  {String(seriesTotal).padStart(2, "0")}
                </dd>
              </>
            )}
            <dt>Tags</dt>
            <dd>
              {post.tags.map((t, i) => (
                <span key={t}>
                  {i > 0 && " · "}
                  <Link href={`/blogs/tag/${tagSlug(t)}`}>{tagDisplay(t)}</Link>
                </span>
              ))}
            </dd>
            <dt>Read</dt>
            <dd>
              {post.readingMinutes} {readUnit(post.lang)} · {post.wordCount.toLocaleString()}{" "}
              {post.lang === "tr" ? "kelime" : "words"}
            </dd>
            <dt>Lang</dt>
            <dd>
              {post.lang.toUpperCase()}
              {sibling && (
                <>
                  {" · "}
                  <Link href={`/blogs/${sibling.slug}`}>
                    [ ⇄ {sibling.lang.toUpperCase()} ]
                  </Link>
                </>
              )}
            </dd>
          </dl>
        </div>
      </div>

      <h1 className="post-title" data-allow-select>
        {post.title}
      </h1>
      <p className="post-subtitle" data-allow-select>
        {post.description}
      </p>

      <article className="post-prose" data-allow-select draggable={false}>
        {content}
      </article>

      <div className="post-foot">
        {prev ? (
          <Link href={`/blogs/${prev.slug}`}>← prev · {prev.title}</Link>
        ) : (
          <span>{post.lang === "tr" ? "BAŞLANGIÇ" : "START"}</span>
        )}
        <span>
          <span className="signal-blip-sm" />
          {next ? (
            <Link href={`/blogs/${next.slug}`}>
              next · {next.title.length > 28 ? next.title.slice(0, 28) + "…" : next.title} →
            </Link>
          ) : (
            <>EOF · {String(seriesOrder).padStart(2, "0")} / {String(seriesTotal).padStart(2, "0")}</>
          )}
        </span>
      </div>

      <div className="prompt-line" style={{ marginTop: "1rem" }}>
        <span className="p">rusen@rusen.ai</span>
        :<span style={{ color: "var(--muted)" }}>/blogs</span>${" "}
        <span className="cursor-blink">_</span>
      </div>
    </main>
  );
}
