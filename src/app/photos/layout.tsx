import type { Metadata } from "next";
import { heroPhoto } from "@/lib/photos";
import "./photos.css";

export const metadata: Metadata = {
  title: "Photographs — Rusen Birben",
  description: "A personal archive of light, color, shadow, and ordinary things worth noticing.",
  alternates: { canonical: "/photos" },
  openGraph: {
    title: "Photographs — Rusen Birben",
    description: "A personal archive of light, color, shadow, and ordinary things worth noticing.",
    url: "/photos",
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
    title: "Photographs — Rusen Birben",
    description: "A personal archive of light, color, shadow, and ordinary things worth noticing.",
    images: [heroPhoto.sources.large.url],
  },
};

export default function PhotosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
