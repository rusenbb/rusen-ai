/**
 * Plain-text views of the site for agents and LLM tools: /llms.txt (a map
 * of the site in the llmstxt.org shape) and /projects.md (every project).
 * Both are built from the same content the pages render, so they cannot
 * drift from the site.
 */

import { getAllPosts, getAllSeries } from "./blog";
import { getProjectPath, getProjectsByCollection, type ProjectCollection } from "./projects";
import { SITE_ORIGIN } from "./social-metadata";

const COLLECTIONS: { id: ProjectCollection; title: string; blurb: string }[] = [
  { id: "demos", title: "Demos", blurb: "Interactive AI tools that run in the browser." },
  { id: "nerdy-stuff", title: "Nerdy Stuff", blurb: "Interactive explanations of how ML ideas work." },
  { id: "bulletin", title: "Bulletin", blurb: "Desktop apps and CLI tools." },
];

export const PERSON = {
  name: "Ruşen Birben",
  url: SITE_ORIGIN,
  jobTitle: "AI & Data Engineer",
  sameAs: [
    "https://github.com/rusenbb",
    "https://linkedin.com/in/rusenbirben",
    "https://x.com/rusen1bb",
    "https://instagram.com/rusen_birben",
  ],
};

export function projectsMarkdown(): string {
  const lines = [`# Projects by ${PERSON.name}`, "", `All projects on ${SITE_ORIGIN}, grouped as on the site.`, ""];
  for (const c of COLLECTIONS) {
    lines.push(`## ${c.title}`, "", c.blurb, "");
    for (const p of getProjectsByCollection(c.id)) {
      lines.push(`### [${p.title}](${SITE_ORIGIN}${getProjectPath(p)})`, "", p.description, "");
      lines.push(`- Tags: ${p.tags.join(", ")}`);
      if (p.tech.length) lines.push(`- Tech: ${p.tech.join(", ")}`);
      if (p.repoUrl) lines.push(`- Source: ${p.repoUrl}`);
      if (p.installCmd) lines.push(`- Install: \`${p.installCmd}\``);
      if (p.status !== "live") lines.push(`- Status: ${p.status}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function llmsTxt(): string {
  const posts = getAllPosts().sort((a, b) => b.date.localeCompare(a.date));
  const series = new Map(getAllSeries().map((s) => [s.id, s.title.en]));
  const lines = [
    `# ${PERSON.name}`,
    "",
    `> ${PERSON.name} is an ${PERSON.jobTitle}. This site holds the CV, interactive ML demos and explainers, software tools, essays and photographs.`,
    "",
    "Every essay and the CV are also available as Markdown at the links below.",
    "",
    "## About",
    "",
    `- [CV (English)](${SITE_ORIGIN}/cv.md): education, research, experience and projects`,
    `- [CV (Türkçe)](${SITE_ORIGIN}/cv.tr.md)`,
    `- [CV (日本語)](${SITE_ORIGIN}/cv.ja.md)`,
    `- [All projects](${SITE_ORIGIN}/projects.md): every demo, explainer and tool with a short description`,
    "",
    "## Essays",
    "",
    ...posts.map((p) => {
      const tag = p.seriesId ? ` (series: ${series.get(p.seriesId)})` : "";
      return `- [${p.title}](${SITE_ORIGIN}/blogs/${p.slug}.md): ${p.date}, ${p.lang.toUpperCase()}${tag}. ${p.description}`;
    }),
    "",
    "## Projects",
    "",
    ...COLLECTIONS.flatMap((c) =>
      getProjectsByCollection(c.id).map((p) => `- [${p.title}](${SITE_ORIGIN}${getProjectPath(p)}): ${p.summary}`),
    ),
    "",
    "## Optional",
    "",
    `- [Photographs](${SITE_ORIGIN}/photos)`,
    ...PERSON.sameAs.map((u) => `- ${u}`),
    "",
  ];
  return lines.join("\n");
}
