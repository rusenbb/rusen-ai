import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("segment-anything");

export default function SegmentAnythingLayout({ children }: { children: ReactNode }) {
  return children;
}
