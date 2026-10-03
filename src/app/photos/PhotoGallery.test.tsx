import { fireEvent, render } from "@testing-library/react";
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

  it("describes gallery and lightbox image widths responsively", () => {
    const { container } = render(
      <PhotoGallery hero={heroPhoto} series={photoSeries} photos={allPhotos} />,
    );

    const gallerySizes = Array.from(
      container.querySelectorAll<HTMLImageElement>(".photo-frame img"),
      (image) => image.sizes,
    );
    expect(gallerySizes.some((sizes) => sizes.includes("100vw - 22rem"))).toBe(true);
    expect(gallerySizes.some((sizes) => sizes.includes("/ 2"))).toBe(true);
    expect(gallerySizes.some((sizes) => sizes.includes("/ 3"))).toBe(true);

    const firstFrame = container.querySelector<HTMLButtonElement>(".photo-frame");
    if (!firstFrame) throw new Error("Expected a gallery photo frame");
    fireEvent.click(firstFrame);
    const lightboxImage = container.querySelector<HTMLImageElement>(
      ".photo-lightbox figure img",
    );
    expect(lightboxImage).toHaveAttribute("srcset");
    expect(lightboxImage).toHaveAttribute(
      "sizes",
      "(max-width: 720px) 100vw, 72vw",
    );
  });
});

describe("PhotoGallery touch gestures", () => {
  function setup() {
    const { container } = render(
      <PhotoGallery hero={heroPhoto} series={photoSeries} photos={allPhotos} />,
    );
    fireEvent.click(container.querySelector(".photo-frame")!);
    const dialog = container.querySelector('[role="dialog"]')!;
    const label = () => dialog.getAttribute("aria-label");
    const initial = label();
    const pointer = (type: string, options: Record<string, unknown> = {}) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: 200, clientY: 100 });
      for (const [key, value] of Object.entries({ pointerType: "touch", pointerId: 1, isPrimary: true, ...options })) {
        Object.defineProperty(event, key, { value });
      }
      fireEvent(dialog, event);
    };
    return { pointer, label, initial, container };
  }

  it.each(["mouse", "pen"])("ignores %s dragging", (pointerType) => {
    const { pointer, label, initial } = setup();
    pointer("pointerdown", { pointerType });
    pointer("pointerup", { pointerType, clientX: 50 });
    expect(label()).toBe(initial);
  });

  it("uses the actual pointer type on hybrid devices and swipes in both directions", () => {
    const { pointer, label, initial } = setup();
    pointer("pointerdown", { pointerType: "mouse" });
    pointer("pointerup", { pointerType: "mouse", clientX: 50 });
    expect(label()).toBe(initial);
    pointer("pointerdown");
    pointer("pointerup", { clientX: 50 });
    expect(label()).not.toBe(initial);
    pointer("pointerdown");
    pointer("pointerup", { clientX: 350 });
    expect(label()).toBe(initial);
  });

  it.each(["cancel", "multitouch", "short", "vertical", "unmatched"])("ignores %s gestures", (kind) => {
    const { pointer, label, initial } = setup();
    pointer("pointerdown");
    if (kind === "cancel") pointer("pointercancel");
    if (kind === "multitouch") pointer("pointerdown", { pointerId: 2, isPrimary: false });
    pointer("pointerup", {
      clientX: kind === "short" ? 170 : 50,
      clientY: kind === "vertical" ? 350 : 100,
      pointerId: kind === "unmatched" ? 2 : 1,
    });
    expect(label()).toBe(initial);
  });

  it("clears unfinished gestures when closed and reopened", () => {
    const { pointer, initial, container } = setup();
    pointer("pointerdown");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(container.querySelector(".photo-frame")!);
    const dialog = container.querySelector('[role="dialog"]')!;
    const up = new MouseEvent("pointerup", { bubbles: true, clientX: 50 });
    Object.defineProperties(up, { pointerType: { value: "touch" }, pointerId: { value: 1 } });
    fireEvent(dialog, up);
    expect(dialog.getAttribute("aria-label")).toBe(initial);
  });
});
