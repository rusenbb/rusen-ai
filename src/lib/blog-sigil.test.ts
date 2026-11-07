import { describe, expect, it } from "vitest";
import { getAllPosts } from "./blog";
import { buildSigil, SIGIL_ROWS } from "./blog-sigil";

describe("buildSigil", () => {
  it("records sentence lengths in reading order", () => {
    const sigil = buildSigil("One two three. Four five! Six?");
    expect(sigil.rows.flat()).toEqual([3, 2, 1]);
    expect(sigil.rows).toHaveLength(SIGIL_ROWS);
  });

  it("ignores code blocks and link targets", () => {
    const sigil = buildSigil("Read [the docs](https://example.com/a.b.c). ```\nx = 1. y = 2.\n```");
    expect(sigil.rows.flat()).toEqual([3]);
  });

  it("is deterministic and distinct across real posts", () => {
    const posts = getAllPosts();
    const sigils = posts.map((p) => buildSigil(p.body));
    expect(posts.map((p) => buildSigil(p.body))).toEqual(sigils);
    for (const s of sigils) {
      expect(s.rows.flat().length).toBeGreaterThan(SIGIL_ROWS);
      expect(s.letters.length).toBeGreaterThan(0);
    }
    expect(new Set(sigils.map((s) => JSON.stringify(s.rows))).size).toBe(posts.length);
  });
});
