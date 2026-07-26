import type { Metadata } from "next";

import socialPages from "@/content/social-pages.json";

export const SITE_NAME = "Rusen.ai";
export const SITE_ORIGIN = "https://rusen.ai";
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

export type SocialPageKey = keyof typeof socialPages;

type LanguageAlternates = Record<string, string>;

type SocialMetadataInput = {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  locale?: string;
  type?: "website" | "article";
  languages?: LanguageAlternates;
};

function imageMimeType(path: string): "image/jpeg" | "image/png" {
  return path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";
}

export function buildSocialMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  locale = "en_US",
  type = "website",
  languages,
}: SocialMetadataInput): Metadata {
  const canonicalUrl = new URL(path, SITE_ORIGIN).toString();

  return {
    title,
    description,
    alternates: {
      canonical: path,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale,
      type,
      images: [
        {
          url: image,
          width: SOCIAL_IMAGE_WIDTH,
          height: SOCIAL_IMAGE_HEIGHT,
          type: imageMimeType(image),
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

export function buildStaticPageMetadata(
  key: SocialPageKey,
  languages?: LanguageAlternates,
): Metadata {
  const page = socialPages[key];
  return buildSocialMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    image: page.image,
    imageAlt: `${page.headline.join(" ")} — ${SITE_NAME}`,
    locale: page.locale,
    languages,
  });
}

export function blogPostImagePath(slug: string): string {
  return `/social/blog/posts/${slug}.png`;
}

export function blogTagImagePath(tagSlug: string): string {
  return `/social/blog/tags/${tagSlug}.png`;
}

export function blogSeriesImagePath(seriesId: string): string {
  return `/social/blog/series/${seriesId}.png`;
}
