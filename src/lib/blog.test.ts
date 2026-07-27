import { describe, expect, it } from "vitest";
import { getAllPosts, getAllSeries, getTranslation } from "./blog";

describe("blog content contracts", () => {
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
