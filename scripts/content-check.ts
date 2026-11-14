#!/usr/bin/env node

import { createHash } from "node:crypto";
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

// The CV PDFs are committed build outputs of scripts/render_cv.py. Recompute the
// hashes it records so a JSON edit without `npm run cv:build` fails the build.
const sha256 = (...parts: Buffer[]) => {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part);
  return hash.digest("hex");
};
const cvLock = JSON.parse(
  readFileSync(resolve(ROOT, "scripts/cv-template/cv-build.lock.json"), "utf8"),
) as Record<string, { source: string; tex: string; pdf: string }>;
const cvInputs = ["scripts/cv-template/cv.tex.j2", "scripts/render_cv.py"].map((path) =>
  readFileSync(resolve(ROOT, path)),
);
const NUL = Buffer.from([0]);
for (const locale of ["en", "tr", "ja"] as const) {
  const base = locale === "en" ? "cv" : `cv.${locale}`;
  const entry = cvLock[locale];
  const json = readFileSync(resolve(ROOT, `src/content/${base}.json`));
  const source = sha256(...[json, ...cvInputs].flatMap((part) => [part, NUL]));
  const tex = sha256(readFileSync(resolve(ROOT, `public/${base}.tex`)));
  const pdf = sha256(readFileSync(resolve(ROOT, `public/${base}.pdf`)));
  if (!entry || entry.source !== source) {
    failures.push(`CV ${locale}: PDF is stale; run \`npm run cv:build\` and commit public/${base}.*`);
  } else if (entry.tex !== tex || entry.pdf !== pdf) {
    failures.push(
      `CV ${locale}: public/${base}.tex or .pdf differs from the last recorded build; run \`npm run cv:build\``,
    );
  }
}

if (failures.length > 0) {
  throw new Error(`Content verification failed:\n- ${failures.join("\n- ")}`);
}

console.log(
  `Verified ${PROJECTS.length} projects, ${posts.length} blog posts, ` +
    `${series.length} blog series, navigation aliases, social routes, CV locale parity, and CV PDF freshness.`,
);
