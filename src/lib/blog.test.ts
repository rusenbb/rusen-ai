import { describe, expect, it } from "vitest";
import { dropRepeatedOpening, getAllPosts, getAllSeries, getPostSigil, getTranslation } from "./blog";
import { buildSigil } from "./blog-sigil";

describe("blog content contracts", () => {
  it("shares every translation pair's Turkish sigil without changing the original", () => {
    const originals = getAllPosts().filter((post) => post.lang === "tr" && post.translationKey);
    expect(originals.length).toBeGreaterThan(0);
    for (const original of originals) {
      const translation = getTranslation(original)!;
      const existingSigil = buildSigil(original.body);
      expect(getPostSigil(original)).toEqual(existingSigil);
      expect(getPostSigil(translation)).toEqual(existingSigil);
    }
    expect(new Set(originals.map((post) => JSON.stringify(getPostSigil(post).rows))).size)
      .toBe(originals.length);
  });

  it("keeps an untranslated post's own sigil in either language", () => {
    for (const post of getAllPosts()) {
      const standalone = { ...post, translationKey: undefined };
      expect(getPostSigil(standalone)).toEqual(buildSigil(post.body));
    }
  });

  it("loads complete, route-safe post metadata", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(new Set(posts.map((post) => post.slug)).size).toBe(posts.length);
    for (const post of posts) {
      expect(post.title.trim()).not.toBe("");
      expect(post.description.trim()).not.toBe("");
      expect(post.tags.length).toBeGreaterThan(0);
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps translation pairs and series positions coherent", () => {
    for (const post of getAllPosts()) {
      if (post.translationKey) {
        const translation = getTranslation(post);
        expect(translation?.translationKey).toBe(post.translationKey);
        expect(translation?.lang).not.toBe(post.lang);
      }
    }

    for (const series of getAllSeries()) {
      for (const lang of ["en", "tr"] as const) {
        const orders = series.posts
          .filter((post) => post.lang === lang)
          .map((post) => post.seriesOrder);
        expect(orders).toEqual(
          Array.from({ length: orders.length }, (_, index) => index + 1),
        );
      }
    }
  });
});

describe("dropRepeatedOpening", () => {
  const desc = "First line. Second line.";
  it("drops the title heading and an italic lede that repeats the description", () => {
    const body = "\n# Title\n\n*First line. Second line.*\n\nReal start.";
    expect(dropRepeatedOpening(body, "Title", desc)).toBe("\nReal start.");
  });
  it("keeps a different heading and first paragraph", () => {
    const body = "# Other\n\nSomething else.\n\nMore.";
    expect(dropRepeatedOpening(body, "Title", desc)).toBe("# Other\n\nSomething else.\n\nMore.");
  });
});
