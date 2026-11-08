import Link from "next/link";

import type { Post } from "@/lib/blog";
import { buildSigil } from "@/lib/blog-sigil";
import PostSigil from "./PostSigil";

/**
 * One post in a blog listing (index, series page, tag page): the post's sigil,
 * a mono meta line, the title and the description. Every listing uses this
 * row so the blog pages cannot drift apart.
 */
export default function PostRow({ post, meta }: { post: Post; meta: string }) {
  return (
    <Link href={`/blogs/${post.slug}`} className="post-row" data-post-lang={post.lang} lang={post.lang}>
      <PostSigil sigil={buildSigil(post.body)} />
      <div>
        <span className="entry-meta">{meta}</span>
        <h3>{post.title}</h3>
        <p>{post.description}</p>
      </div>
    </Link>
  );
}
