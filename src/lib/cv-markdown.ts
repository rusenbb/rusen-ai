import type { CVData, CVLabels, CVLocale } from "./cv";

/**
 * Renders the structured CV (src/content/cv*.json) into a plain Markdown
 * document. Served verbatim at /cv.md, /cv.tr.md, /cv.ja.md so that humans -
 * and agents like Claude - can fetch the CV as text without scraping HTML.
 *
 * The JSON files remain the single source of truth: this is a pure projection.
 * Academic ordering matches the web CV; PDF pagination groups experience
 * on page one and selected projects and supporting information on page two.
 */

/** Section headings missing from CVLabels. Strings mirror the localized
 *  labels in scripts/render_cv.py so translations stay consistent. */
const EXTRA_HEADINGS: Record<CVLocale, { summary: string; skills: string }> = {
  en: { summary: "SUMMARY", skills: "SKILLS" },
  tr: { summary: "ÖZET", skills: "YETENEKLER" },
  ja: { summary: "概要", skills: "スキル" },
};

export function renderCvMarkdown(
  cv: CVData,
  labels: CVLabels,
  locale: CVLocale,
): string {
  const b = cv.basics;
  const extra = EXTRA_HEADINGS[locale];
  const out: string[] = [];

  // ── Identity ─────────────────────────────────────────────────────────
  out.push(`# ${b.name}`);
  out.push("");
  out.push(`**${b.role}** · ${b.locationLong}`);
  out.push("");
  out.push(`- **Email:** <${b.email}>`);
  out.push(`- **Website:** ${b.websiteUrl}`);
  out.push(`- **LinkedIn:** ${b.linkedinUrl}`);
  out.push(`- **GitHub:** ${b.githubUrl}`);

  // ── Summary ──────────────────────────────────────────────────────────
  out.push("", `## ${extra.summary}`, "", b.printSummary);

  // ── Education ─────────────────────────────────────────────────────────
  out.push("", `## ${labels.education}`);
  for (const e of cv.education) {
    out.push("", `### ${e.degree} - ${e.school}`);
    const meta = [`*${e.period}*`];
    if (e.gpa) meta.push(`${labels.gpa}: ${e.gpa}`);
    out.push(meta.join(" · "));
    if (e.note) out.push("", e.note);
  }

  // ── Awards ───────────────────────────────────────────────────────────
  out.push("", `## ${labels.awards}`);
  for (const a of cv.awards) {
    out.push("", `### ${a.title} - ${a.issuer}`);
    if (a.period) out.push(`*${a.period}*`);
    out.push("", a.summary);
  }

  // ── Experience ───────────────────────────────────────────────────────
  out.push("", `## ${labels.research}`);
  for (const x of cv.experience.filter((item) => item.category === "research")) {
    const company = x.link ? `[${x.company}](${x.link})` : x.company;
    out.push("", `### ${x.role} - ${company}`);
    out.push(`*${x.period} · ${x.location}*`, "", x.description);
  }

  // ── Projects ─────────────────────────────────────────────────────────
  out.push("", `## ${labels.projects}`);
  for (const p of cv.projects) {
    out.push("", `### ${p.title} - ${p.subtitle}`);
    out.push(`*${p.period}*`, "", p.description);
    if (p.tags.length) out.push("", `Tags: ${p.tags.join(", ")}`);
    if (p.links.length) {
      const links = p.links.map((l) => `[${l.label}](${l.url})`).join(" · ");
      out.push(`Links: ${links}`);
    }
  }

  // ── Experience ───────────────────────────────────────────────────────
  out.push("", `## ${labels.experience}`);
  for (const x of cv.experience.filter((item) => item.category === "professional")) {
    const company = x.link ? `[${x.company}](${x.link})` : x.company;
    out.push("", `### ${x.role} - ${company}`);
    out.push(`*${x.period} · ${x.location}*`, "", x.description);
  }

  // ── Courses ──────────────────────────────────────────────────────────
  out.push("", `## ${labels.courses}`);
  for (const c of cv.courses) {
    out.push("", `### ${c.title} - ${c.issuer}`, "", c.summary);
    if (c.url) out.push(`<${c.url}>`);
  }

  // ── Skills ───────────────────────────────────────────────────────────
  out.push("", `## ${extra.skills}`, "");
  for (const [category, items] of Object.entries(cv.skills)) {
    out.push(`- **${category}:** ${items.join(", ")}`);
  }

  // ── Languages ────────────────────────────────────────────────────────
  out.push("", `## ${labels.languages}`, "");
  for (const l of cv.languages) {
    out.push(`- **${l.name}** - ${l.level}`);
  }

  // ── Interests ────────────────────────────────────────────────────────
  out.push("", `## ${labels.interests}`, "");
  for (const i of cv.interests) {
    const title = i.link ? `[${i.title}](${i.link.url})` : i.title;
    out.push(`- **${title}** - ${i.desc}`);
  }

  // ── Footer ───────────────────────────────────────────────────────────

  return out.join("\n");
}
