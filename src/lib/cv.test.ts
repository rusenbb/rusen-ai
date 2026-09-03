import { describe, expect, it } from "vitest";

import { getCvData, type CVLocale } from "@/lib/cv";

describe("CV interests", () => {
  it("includes photography in every published locale", () => {
    const locales: CVLocale[] = ["en", "tr", "ja"];

    for (const locale of locales) {
      const photography = getCvData(locale).interests.find(
        (interest) => interest.icon === "camera",
      );
      expect(photography, `missing photography for ${locale}`).toBeDefined();
      expect(photography?.desc).toContain("-");
    }
  });

  it("keeps localized document sections structurally aligned", () => {
    const english = getCvData("en");
    for (const locale of ["tr", "ja"] as const) {
      const localized = getCvData(locale);
      expect(localized.experience).toHaveLength(english.experience.length);
      expect(localized.projects).toHaveLength(english.projects.length);
      expect(localized.interests).toHaveLength(english.interests.length);
      expect(Object.values(localized.skills).map((items) => items.length)).toEqual(
        Object.values(english.skills).map((items) => items.length),
      );
    }
  });
});

describe("CV research affiliation", () => {
  it("presents METU NLP as independent research, not current degree enrollment", () => {
    const expectations = {
      en: {
        role: "Independent Researcher",
        school: "Middle East Technical University",
      },
      tr: {
        role: "Bağımsız Araştırmacı",
        school: "Orta Doğu Teknik Üniversitesi",
      },
      ja: {
        role: "独立研究者",
        school: "中東工科大学",
      },
    } as const;

    for (const locale of ["en", "tr", "ja"] as const) {
      const cv = getCvData(locale);
      expect(cv.experience[0]?.role).toBe(expectations[locale].role);
      expect(
        cv.education.some(
          (education) => education.school === expectations[locale].school,
        ),
      ).toBe(false);
    }
  });
});
