import { describe, expect, it } from "vitest";
import generatedManifest from "@/content/photos.generated.json";
import { allPhotos, heroPhoto, photoRows, photoSeries } from "./photos";

const locales = ["tr", "en", "ja"] as const;

describe("photography collection", () => {
  it("publishes every selected JPEG exactly once", () => {
    expect(new Set(allPhotos.map((photo) => photo.id)).size).toBe(allPhotos.length);
    expect(allPhotos).toHaveLength(generatedManifest.photos.length);
  });

  it("keeps the hero separate from the gallery rows", () => {
    expect(photoRows.flat().some((photo) => photo.id === heroPhoto.id)).toBe(false);
  });

  it("presents the prologue as the double-exposure photograph that began the practice", () => {
    expect(heroPhoto.translations.tr.title).toBe("Bir Başlangıcın Otoportresi");
    expect(heroPhoto.translations.tr.story).toContain("çift pozlamada");
    expect(heroPhoto.translations.en.story).toContain("double exposure");
    expect(heroPhoto.translations.ja.story).toContain("二重露光");
  });

  it("gives every photograph unique editorial copy and versioned Pages URLs", () => {
    expect(new Set(allPhotos.map((photo) => photo.title)).size).toBe(allPhotos.length);
    for (const photo of allPhotos) {
      expect(photo.alt.length).toBeGreaterThan(12);
      expect(photo.title.length).toBeGreaterThan(4);
      expect((photo.story ?? photo.caption)?.length).toBeGreaterThan(20);
      expect(photo.seriesTitle.length).toBeGreaterThan(3);
      expect(photo.sources.thumbnail.url).toMatch(/^\/photos\//);
      expect(photo.sources.display.url).toMatch(/^\/photos\//);
      expect(photo.sources.large.url).toMatch(/^\/photos\//);
    }
  });

  it("publishes each non-hero photograph inside exactly one named series", () => {
    expect(photoSeries).toHaveLength(6);
    expect(new Set(photoSeries.map((series) => series.title)).size).toBe(photoSeries.length);
    expect(photoSeries.flatMap((series) => series.rows).flat()).toEqual(photoRows.flat());
  });

  it("publishes complete, unique editorial copy in Turkish, English, and Japanese", () => {
    for (const locale of locales) {
      expect(new Set(allPhotos.map((photo) => photo.translations[locale].title)).size).toBe(
        allPhotos.length,
      );
      for (const photo of allPhotos) {
        const copy = photo.translations[locale];
        expect(copy.alt.length).toBeGreaterThan(12);
        expect(copy.story ?? copy.caption).toBeTruthy();
        expect((copy.story ?? copy.caption)?.length).toBeGreaterThan(20);
        expect(photo.seriesTitles[locale].length).toBeGreaterThan(1);
      }
      for (const series of photoSeries) {
        expect(series.translations[locale].title.length).toBeGreaterThan(1);
        expect(series.translations[locale].description.length).toBeGreaterThan(30);
      }
    }
  });

  it("keeps the intended narrative order for the pigeon and Rize reflection sequences", () => {
    const neighbours = photoSeries.find((series) => series.id === "neighbours");
    const reflections = photoSeries.find((series) => series.id === "reflections");

    expect(neighbours?.rows[1].map((photo) => photo.id)).toEqual(["dscf2138", "dscf2137"]);
    expect(reflections?.rows[0].map((photo) => photo.id)).toEqual([
      "dscf1662",
      "dscf1690",
      "dscf1669",
    ]);
    expect(
      allPhotos.find((photo) => photo.id === "dscf1669")?.translations.tr.story,
    ).toContain("Rize, bir şehirden fazlası olup bir memlekete dönüşüyor");
  });

  it("keeps the street performance and boat encounter in narrative order", () => {
    const cityStage = photoSeries.find((series) => series.id === "city-stage");
    const encounter = photoSeries.find((series) => series.id === "encounter");

    expect(cityStage?.rows.flat().map((photo) => photo.id)).toEqual([
      "dscf0492",
      "dscf0495",
      "dscf0497",
    ]);
    expect(cityStage?.credit?.href).toBe("https://www.instagram.com/theburaksoylu/");
    expect(encounter?.rows.flat().map((photo) => photo.id)).toEqual([
      "dscf1835",
      "dscf1916",
      "dscf1914",
      "dscf1928",
    ]);
    expect(encounter?.rows.at(-1)?.[0].translations.tr.title).toBe("Yalnız");
  });
});
