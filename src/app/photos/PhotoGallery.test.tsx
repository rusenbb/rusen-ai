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

  it("keeps sequence copy compact and credits the performer at series level", () => {
    window.localStorage.setItem("photoLanguage", "tr");

    const { container } = render(
      <PhotoGallery hero={heroPhoto} series={photoSeries} photos={allPhotos} />,
    );

    expect(allPhotos).toHaveLength(30);
    expect(photoSeries).toHaveLength(6);
    expect(container).toHaveTextContent("SEÇKİ / 6 BÖLÜM");
    expect(container.querySelectorAll('[data-copy-kind="caption"]')).toHaveLength(7);
    expect(container).toHaveTextContent("Yüzünü saklayan bu yabancıyı herkes tanıyordu.");
    expect(container).toHaveTextContent("Deniz yollarını yeniden ayırdı");
    expect(container.querySelector(".photo-series-credit")).toHaveAttribute(
      "href",
      "https://www.instagram.com/theburaksoylu/",
    );
  });

  it("allows selection only for photo and collection titles and descriptions", () => {
    const { container } = render(
      <PhotoGallery hero={heroPhoto} series={photoSeries} photos={allPhotos} />,
    );

    expect(container.querySelector(".photo-caption h3")).toHaveAttribute("data-allow-select");
    expect(container.querySelector(".photo-caption > p")).toHaveAttribute("data-allow-select");
    expect(container.querySelector(".photo-series-heading h2")).toHaveAttribute(
      "data-allow-select",
    );
    expect(container.querySelector(".photo-series-heading > span")).toHaveAttribute(
      "data-allow-select",
    );

    expect(container.querySelector(".photo-hero-telemetry")).not.toHaveAttribute(
      "data-allow-select",
    );
    expect(container.querySelector(".photo-frame-register")).not.toHaveAttribute(
      "data-allow-select",
    );
    expect(container.querySelector(".photo-series-credit")).not.toHaveAttribute(
      "data-allow-select",
    );
    expect(container.querySelector("button")).not.toHaveAttribute("data-allow-select");
  });
});
