import type { MetadataRoute } from "next";

import { getAllPosts, getAllSeries, getAllTags, tagSlug } from "@/lib/blog";
import { getProjectPath, PROJECTS } from "@/lib/projects";
import { SITE_ORIGIN } from "@/lib/social-metadata";

export const dynamic = "force-static";

const STATIC_PATHS = [
  "/",
  "/demos",
  "/nerdy-stuff",
  "/bulletin",
  "/photos",
  "/blogs",
  "/cv",
  "/cv/tr",
  "/cv/ja",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}) => {
    entries.set(path, { url: new URL(path, SITE_ORIGIN).toString(), ...extra });
  };

  STATIC_PATHS.forEach((path) => add(path));
  PROJECTS.filter((project) => project.status === "live")
    .forEach((project) => add(getProjectPath(project)));
  getAllPosts().forEach((post) => add(`/blogs/${post.slug}`, {
    lastModified: new Date(post.date),
  }));
  getAllSeries().forEach((series) => add(`/blogs/series/${series.id}`));
  getAllTags().forEach(({ tag }) => add(`/blogs/tag/${tagSlug(tag)}`));

  return Array.from(entries.values());
}
