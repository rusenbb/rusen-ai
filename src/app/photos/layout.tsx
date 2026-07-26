import type { Metadata } from "next";
import editorialManifest from "@/content/photos.json";
import { heroPhoto } from "@/lib/photos";
import "./photos.css";

const { metadata: photoMetadata } = editorialManifest;

export const metadata: Metadata = {
  title: photoMetadata.title,
  description: photoMetadata.description,
  alternates: { canonical: photoMetadata.canonical },
  openGraph: {
    title: photoMetadata.title,
    description: photoMetadata.description,
    url: photoMetadata.canonical,
    type: "website",
    images: [
      {
        url: heroPhoto.sources.large.url,
        width: heroPhoto.sources.large.width,
        height: Math.round(heroPhoto.sources.large.width / heroPhoto.aspectRatio),
        alt: heroPhoto.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: photoMetadata.title,
    description: photoMetadata.description,
    images: [heroPhoto.sources.large.url],
  },
};

export default function PhotosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
