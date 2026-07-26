import type { Metadata } from "next";
import { buildStaticPageMetadata } from "@/lib/social-metadata";
import "./photos.css";

export const metadata: Metadata = buildStaticPageMetadata("photos");

export default function PhotosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
