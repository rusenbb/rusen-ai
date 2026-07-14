import type { CVData, CVLabels, CVLocale } from "./cv";

/**
 * Renders the structured CV (src/content/cv*.json) into a plain Markdown
 * document. Served verbatim at /cv.md, /cv.tr.md, /cv.ja.md so that humans -
 * and agents like Claude - can fetch the CV as text without scraping HTML.
 *
 * The JSON files remain the single source of truth: this is a pure projection.
 * Section ordering mirrors the LaTeX/PDF build (scripts/cv-template/cv.tex.j2):
 * Summary → Experience → Projects → Education → Awards → Courses → Skills →
 * Languages → Interests.
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
  out.push(`- **${labels.status}:** ${b.status}`);
  out.push(`- **Email:** <${b.email}>`);
  out.push(`- **Website:** ${b.websiteUrl}`);
  out.push(`- **LinkedIn:** ${b.linkedinUrl}`);
  out.push(`- **GitHub:** ${b.githubUrl}`);
  out.push(`- **${labels.dob}:** ${b.birthday}`);
  out.push(`- **${labels.lic}:** ${b.drivingLicense}`);

  // ── Summary ──────────────────────────────────────────────────────────
  out.push("", `## ${extra.summary}`, "", b.printSummary);

  // ── Experience ───────────────────────────────────────────────────────
  out.push("", `## ${labels.experience}`);
  for (const x of cv.experience) {
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
    out.push(`- **${i.title}** - ${i.desc}`);
  }

  // ── Footer ───────────────────────────────────────────────────────────
  out.push("", "---", "", `*${b.footerNote}*`, "");

  return out.join("\n");
}
