import { describe, expect, it } from "vitest";
import { getCvData, getCvLabels } from "./cv";
import { renderCvMarkdown } from "./cv-markdown";

describe("public CV Markdown", () => {
  it("exports research and professional contributions as separate, linked prose sections in every language", () => {
    for (const locale of ["en", "tr", "ja"] as const) {
      const labels = getCvLabels(locale);
      const cv = getCvData(locale);
      const text = renderCvMarkdown(cv, labels, locale);
      const researchStart = text.indexOf(`## ${labels.research}`);
      const projectsStart = text.indexOf(`## ${labels.projects}`);
      const professionalStart = text.indexOf(`## ${labels.experience}`);
      expect(text.indexOf(`## ${labels.education}`)).toBeLessThan(researchStart);
      expect(text.indexOf(`## ${labels.awards}`)).toBeGreaterThan(text.indexOf(`## ${labels.education}`));
      expect(text.indexOf(`## ${labels.awards}`)).toBeLessThan(researchStart);
      expect(researchStart).toBeGreaterThan(0);
      expect(projectsStart).toBeGreaterThan(researchStart);
      expect(professionalStart).toBeGreaterThan(projectsStart);
      const research = text.slice(researchStart, projectsStart);
      expect(research).toContain("SIGTURK 2027");
      expect(research).toContain("LlamaTurk2");
      expect(research).toContain("[METU NLP Connect](https://www.youtube.com/@metunlpconnect)");
      expect(research).not.toContain("CyberQuote");
      expect(text.slice(professionalStart)).toContain("CyberQuote");
      expect(text).toContain(cv.projects[0].description);
      expect(text).not.toContain(`- ${cv.projects[0].description}`);
      expect(text).toContain("https://huggingface.co/spaces/rusen/diacritize-tr");
    }
  });

  it("does not expose retired personal fields or stale footer content", () => {
    for (const locale of ["en", "tr", "ja"] as const) {
      const labels = getCvLabels(locale);
      const text = renderCvMarkdown(getCvData(locale), labels, locale);
      expect(text).not.toContain("26/08/2002");
      expect(text).not.toContain(`**${labels.status}:**`);
      expect(text).not.toContain(`**${labels.lic}:**`);
      expect(text).not.toContain("References available upon request");
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("\u2014");
      expect(JSON.stringify(getCvData(locale))).not.toContain("\u2014");
    }
  });
});
