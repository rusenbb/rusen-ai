import type { Post } from "./blog";
import { SITE_ORIGIN } from "./social-metadata";

/**
 * A post as one self-contained Markdown document: title, description, a
 * source line, then the body. Root-relative links and images become
 * absolute, so the text still works when pasted elsewhere.
 */
export function postMarkdown(post: Post): string {
  const url = `${SITE_ORIGIN}/blogs/${post.slug}`;
  const body = post.body.trim().replace(/\]\(\//g, `](${SITE_ORIGIN}/`);
  return [
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    `Source: ${url} · ${post.date} · ${post.lang.toUpperCase()}`,
    "",
    body,
    "",
  ].join("\n");
}
