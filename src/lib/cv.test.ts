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
});
