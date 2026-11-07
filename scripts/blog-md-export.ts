/**
 * Writes each blog post's Markdown twin next to its page in the static
 * export: out/blogs/<slug>.md. Next cannot route "<slug>.md" itself, so this
 * runs after `next build`; the page links to it with rel="alternate".
 */
import fs from "node:fs";
import path from "node:path";

import { getAllPosts } from "../src/lib/blog";
import { postMarkdown } from "../src/lib/blog-markdown";

const outDir = path.join(process.cwd(), "out", "blogs");
if (!fs.existsSync(outDir)) {
  console.error(`blog-md-export: ${outDir} not found; run next build first`);
  process.exit(1);
}
const posts = getAllPosts();
for (const post of posts) {
  fs.writeFileSync(path.join(outDir, `${post.slug}.md`), postMarkdown(post));
}
console.log(`blog-md-export: wrote ${posts.length} Markdown files to out/blogs/`);
