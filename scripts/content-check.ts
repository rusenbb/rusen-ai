#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getAllPosts, getAllSeries } from "../src/lib/blog.ts";
import { getCvData } from "../src/lib/cv.ts";
import {
  PROJECTS,
  getProjectPath,
  type ProjectCollection,
} from "../src/lib/projects.ts";

type Navigation = {
  items: Array<{ href: string; routeAliases: string[] }>;
};

const ROOT = process.cwd();
const navigation = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/navigation.json"), "utf8"),
) as Navigation;
const socialPages = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/social-pages.json"), "utf8"),
) as Record<string, { path: string }>;
const failures: string[] = [];

function pageSource(pathname: string): string {
  const route = pathname === "/" ? "" : pathname.replace(/^\//, "");
  return resolve(ROOT, "src/app", route, "page.tsx");
}

for (const project of PROJECTS) {
  if (project.status !== "live") continue;
  const pathname = getProjectPath(project);
  if (!existsSync(pageSource(pathname))) {
    failures.push(`live project ${project.id} has no page at ${pathname}`);
  }
}

for (const collection of ["demos", "nerdy-stuff"] as ProjectCollection[]) {
  const item = navigation.items.find((entry) => entry.href === `/${collection}`);
  const expected = PROJECTS.filter(
    (project) => project.collection === collection && project.status === "live",
  )
    .map(getProjectPath)
    .sort();
  const actual = [...(item?.routeAliases ?? [])].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${collection} navigation aliases do not match its live projects`);
  }
}

for (const page of Object.values(socialPages)) {
  if (!existsSync(pageSource(page.path))) {
    failures.push(`social page ${page.path} has no matching page source`);
  }
}

// Loading these registries runs their structural and locale-parity validators.
const posts = getAllPosts();
const series = getAllSeries();
for (const locale of ["en", "tr", "ja"] as const) getCvData(locale);

if (failures.length > 0) {
  throw new Error(`Content verification failed:\n- ${failures.join("\n- ")}`);
}

console.log(
  `Verified ${PROJECTS.length} projects, ${posts.length} blog posts, ` +
    `${series.length} blog series, navigation aliases, social routes, and CV locale parity.`,
);
