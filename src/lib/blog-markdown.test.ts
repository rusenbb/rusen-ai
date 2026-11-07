import { describe, expect, it } from "vitest";
import { getAllPosts, type Post } from "./blog";
import { postMarkdown } from "./blog-markdown";
import { SITE_ORIGIN } from "./social-metadata";

describe("postMarkdown", () => {
  const post = {
    slug: "demo",
    title: "Demo",
    description: "A short demo.",
    date: "2026-01-02",
    lang: "en",
    body: "Hello [home](/blogs) and ![pic](/img/a.png) and [ext](https://x.org).",
  } as Post;

  it("leads with title, description and source", () => {
    const md = postMarkdown(post);
    expect(md.startsWith("# Demo\n\n> A short demo.\n\nSource: ")).toBe(true);
    expect(md).toContain(`${SITE_ORIGIN}/blogs/demo · 2026-01-02 · EN`);
  });

  it("makes root-relative links absolute and leaves others alone", () => {
    const md = postMarkdown(post);
    expect(md).toContain(`[home](${SITE_ORIGIN}/blogs)`);
    expect(md).toContain(`![pic](${SITE_ORIGIN}/img/a.png)`);
    expect(md).toContain("[ext](https://x.org)");
  });

  it("keeps every real post's body", () => {
    for (const p of getAllPosts()) expect(postMarkdown(p)).toContain(p.body.trim().slice(0, 40).replace(/\]\(\//g, `](${SITE_ORIGIN}/`));
  });
});
