import { notFound } from "next/navigation";
import Link from "next/link";
import CopyMarkdown from "../components/CopyMarkdown";
import { postMarkdown } from "@/lib/blog-markdown";
import JsonLd from "../../components/JsonLd";
import { PERSON } from "@/lib/agent-docs";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";

import {
  dropRepeatedOpening,
  getAllPosts,
  getPostBySlug,
  getTranslation,
  getPrevNextInSeries,
  getAllSeries,
  extractHeadings,
  formatDate,
  readUnit,
  tagSlug,
  tagDisplay,
} from "@/lib/blog";
import { blogPostImagePath, buildSocialMetadata, SITE_ORIGIN } from "@/lib/social-metadata";
import TableOfContents from "../components/TableOfContents";
import ArticleAudio from "../components/ArticleAudio";

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
  const sibling = getTranslation(post);
  const languages = {
    [post.lang]: `/blogs/${post.slug}`,
    ...(sibling ? { [sibling.lang]: `/blogs/${sibling.slug}` } : {}),
  };
  const meta = buildSocialMetadata({
    title: `${post.title} · rusen.ai`,
    description: post.description,
    path: `/blogs/${post.slug}`,
    image: blogPostImagePath(post.slug),
    imageAlt: `${post.title} — rusen.ai blog`,
    type: "article",
    locale: post.lang === "tr" ? "tr_TR" : "en_US",
    languages,
    article: {
      publishedTime: post.date,
      authors: [PERSON.name],
      tags: post.tags,
    },
  });
  // Point agents at the Markdown twin written by scripts/blog-md-export.ts.
  return {
    ...meta,
    alternates: { ...meta.alternates, types: { "text/markdown": `/blogs/${post.slug}.md` } },
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

  const body = dropRepeatedOpening(post.body, post.title, post.description);
  const headings = extractHeadings(body);
  const tocLabel = post.lang === "tr" ? "İçindekiler" : "Contents";

  const { content } = await compileMDX({
    source: escapeForMdx(body),
    components: {
      // Demote body h1 to h2 - frontmatter title is the only real h1 on the page.
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
    <div className="post-shell" data-no-ripple lang={post.lang}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          inLanguage: post.lang,
          keywords: post.tags.join(", "),
          wordCount: post.wordCount,
          url: `${SITE_ORIGIN}/blogs/${post.slug}`,
          author: { "@type": "Person", name: PERSON.name, url: PERSON.url },
          ...(series ? { isPartOf: { "@type": "CreativeWorkSeries", name: series.title[post.lang] } } : {}),
        }}
      />
      {headings.length >= 2 && (
        <TableOfContents headings={headings} label={tocLabel} />
      )}

      <h1 className="post-title" data-allow-select>
        {post.title}
      </h1>
      <p className="post-meta">
        <span>{formatDate(post.date, post.lang)}</span>
        {series && (
          <span>
            <Link href={`/blogs/series/${series.id}`}>{series.title[post.lang]}</Link>
            {seriesTotal > 1 && ` ${seriesOrder}/${seriesTotal}`}
          </span>
        )}
        <span>
          {post.readingMinutes} {readUnit(post.lang)}
        </span>
      </p>
      <div className="post-actions">
        <span className="lang-switch" aria-label={post.lang === "tr" ? "Dil" : "Language"}>
          <span className="on" aria-current="true">{post.lang.toUpperCase()}</span>
          {sibling && (
            <Link href={`/blogs/${sibling.slug}`} hrefLang={sibling.lang} lang={sibling.lang}>
              {sibling.lang.toUpperCase()}
            </Link>
          )}
        </span>
        <CopyMarkdown markdown={postMarkdown(post)} lang={post.lang} />
      </div>
      <p className="post-subtitle" data-allow-select>
        {post.description}
      </p>

      {post.audio && <ArticleAudio key={post.audio.src} audio={post.audio} lang={post.lang} />}

      <article className="post-prose" data-allow-select draggable={false}>
        {content}
      </article>

      <p className="post-tags">
        {post.tags.map((t) => (
          <Link key={t} href={`/blogs/tag/${tagSlug(t)}`}>
            #{tagDisplay(t)}
          </Link>
        ))}
      </p>

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
    </div>
  );
}
