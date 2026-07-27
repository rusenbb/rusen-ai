import { describe, expect, it } from "vitest";

import { buildProjectMetadata } from "@/lib/project-metadata";
import {
  buildSocialMetadata,
  buildStaticPageMetadata,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
} from "@/lib/social-metadata";

function firstOpenGraphImage(metadata: ReturnType<typeof buildSocialMetadata>) {
  const images = metadata.openGraph?.images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("Expected at least one Open Graph image");
  }
  return images[0];
}

describe("social metadata", () => {
  it("publishes a complete, large-card contract for static pages", () => {
    const metadata = buildStaticPageMetadata("photos");
    const image = firstOpenGraphImage(metadata);

    expect(metadata.alternates?.canonical).toBe("/photos");
    expect(metadata.openGraph?.url).toBe("https://rusen.ai/photos");
    expect(image).toMatchObject({
      url: "/social/pages/photos.jpg",
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
      type: "image/jpeg",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("keeps project metadata tied to project data and its generated card", () => {
    const metadata = buildProjectMetadata("emergence");
    const image = firstOpenGraphImage(metadata);

    expect(metadata.title).toBe("Emergence | Rusen.ai");
    expect(metadata.alternates?.canonical).toBe("/emergence");
    expect(image).toMatchObject({
      url: "/social/projects/emergence.png",
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
      type: "image/png",
    });
  });

  it("includes article discovery and translation metadata when supplied", () => {
    const metadata = buildSocialMetadata({
      title: "An essay",
      description: "A translated essay.",
      path: "/blogs/an-essay",
      image: "/social/blog/posts/an-essay.png",
      imageAlt: "An essay",
      type: "article",
      languages: { en: "/blogs/an-essay", tr: "/blogs/bir-yazi" },
      article: {
        publishedTime: "2026-01-02",
        authors: ["Rusen Birben"],
        tags: ["AI"],
      },
    });

    expect(metadata.alternates?.languages).toEqual({
      en: "/blogs/an-essay",
      tr: "/blogs/bir-yazi",
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-01-02",
      authors: ["Rusen Birben"],
      tags: ["AI"],
    });
  });
});
