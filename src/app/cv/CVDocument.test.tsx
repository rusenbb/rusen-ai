import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCvData, getCvLabels } from "@/lib/cv";
import CVDocument from "./CVDocument";

describe("CV publication venue links", () => {
  it.each(["en", "tr", "ja"] as const)(
    "links the conference names and competition in the %s CV",
    (locale) => {
      const cv = getCvData(locale);
      render(
        <CVDocument cv={cv} labels={getCvLabels(locale)} locale={locale} outputBase="cv" />,
      );

      for (const [name, href] of [
        ["EMNLP 2026", "https://2026.emnlp.org/"],
        ["NeurIPS 2026", "https://neurips.cc/Conferences/2026"],
      ]) {
        const link = screen.getByRole("link", { name });
        expect(link).toHaveAttribute("href", href);
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        expect(link.parentElement?.textContent).toContain(`Workshop @ ${name} - `);
        expect(link.parentElement?.textContent).not.toContain("](https://");
      }

      const agenthon = cv.publications.find((item) => item.tags.includes("Differential Testing"));
      expect(agenthon).toBeTruthy();
      const title = screen.getByRole("heading", { name: agenthon!.title });
      const card = title.closest("div")?.parentElement?.parentElement;
      expect(card).toBeTruthy();
      const publication = within(card!);
      expect(publication.getByText("Differential Testing")).toBeVisible();
      expect(publication.getByRole("link", { name: agenthon!.links[0].label }))
        .toHaveAttribute("href", "https://www.agenthon.net/");
    },
  );
});
