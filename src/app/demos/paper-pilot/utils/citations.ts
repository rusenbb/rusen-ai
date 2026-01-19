import type { PaperMetadata } from "../types";

/**
 * Generate a BibTeX citation from paper metadata.
 */
export function generateBibTeX(paper: PaperMetadata): string {
  // Create a citation key from first author's last name and year
  const firstAuthor = paper.authors[0]?.split(" ").pop()?.toLowerCase() || "unknown";
  const year = paper.publishedDate?.slice(0, 4) || "unknown";
  const key = `${firstAuthor}${year}`;

  // Escape special BibTeX characters
  const escape = (str: string | null | undefined): string => {
    if (!str) return "";
    return str
      .replace(/[&%$#_{}~^\\]/g, (char) => `\\${char}`)
      .replace(/\n/g, " ");
  };

  // Determine entry type
  const entryType = paper.journal?.toLowerCase().includes("arxiv") || paper.arxivId
    ? "misc"
    : "article";

  const lines: string[] = [`@${entryType}{${key},`];

  // Title
  lines.push(`  title = {${escape(paper.title)}},`);

  // Authors
  if (paper.authors.length > 0) {
    const authors = paper.authors.map(escape).join(" and ");
    lines.push(`  author = {${authors}},`);
  }

  // Year
  if (paper.publishedDate) {
    lines.push(`  year = {${paper.publishedDate.slice(0, 4)}},`);
  }

  // Journal/venue
  if (paper.journal) {
    if (entryType === "misc") {
      lines.push(`  howpublished = {${escape(paper.journal)}},`);
    } else {
      lines.push(`  journal = {${escape(paper.journal)}},`);
    }
  }

  // DOI
  if (paper.doi) {
    lines.push(`  doi = {${paper.doi}},`);
  }

  // arXiv ID
  if (paper.arxivId) {
    lines.push(`  eprint = {${paper.arxivId}},`);
    lines.push(`  archiveprefix = {arXiv},`);
  }

  // URL
  if (paper.url) {
    lines.push(`  url = {${paper.url}},`);
  }

  // Close the entry (remove trailing comma from last field)
  const lastLine = lines[lines.length - 1];
  lines[lines.length - 1] = lastLine.slice(0, -1); // Remove comma
  lines.push("}");

  return lines.join("\n");
}
