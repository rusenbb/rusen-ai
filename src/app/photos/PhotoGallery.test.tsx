import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { allPhotos, heroPhoto, photoSeries } from "@/lib/photos";
import PhotoGallery from "./PhotoGallery";

describe("PhotoGallery language scope", () => {
  const storedValues = new Map<string, string>();

  beforeEach(() => {
    storedValues.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storedValues.clear(),
        getItem: (key: string) => storedValues.get(key) ?? null,
        removeItem: (key: string) => storedValues.delete(key),
        setItem: (key: string, value: string) => storedValues.set(key, value),
      },
    });
  });

  afterEach(() => {
    document.documentElement.lang = "en";
  });

  it("keeps the site chrome in English while Turkish remains local to the gallery", () => {
    window.localStorage.setItem("photoLanguage", "tr");
    document.documentElement.lang = "en";

    const { container } = render(
      <PhotoGallery hero={heroPhoto} series={photoSeries} photos={allPhotos} />,
    );

    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(container.querySelector(".photos-page")).toHaveAttribute("lang", "tr");
    expect(container.querySelector(".photo-hero-telemetry")).toHaveAttribute("lang", "en");
    expect(container).toHaveTextContent(
      "Fotoğrafları yan yana getirdikçe aralarında daha önce görmediğim ilişkiler belirdi.",
    );
    expect(container).not.toHaveTextContent("Bir kronoloji değil");
  });
});
