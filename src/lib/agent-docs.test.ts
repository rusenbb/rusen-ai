import { describe, expect, it } from "vitest";
import { llmsTxt, projectsMarkdown } from "./agent-docs";
import { getAllPosts } from "./blog";
import { PROJECTS } from "./projects";

describe("agent docs", () => {
  it("llms.txt lists every post's Markdown twin with absolute links", () => {
    const txt = llmsTxt();
    expect(txt.startsWith("# ")).toBe(true);
    for (const p of getAllPosts()) expect(txt).toContain(`https://rusen.ai/blogs/${p.slug}.md`);
    for (const [, url] of txt.matchAll(/\]\(([^)]+)\)/g)) expect(url).toMatch(/^https:\/\//);
  });

  it("projects.md covers every project", () => {
    const md = projectsMarkdown();
    for (const p of PROJECTS) expect(md).toContain(`[${p.title}]`);
  });
});
