import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("vision-anything");

export default function VisionAnythingLayout({ children }: { children: ReactNode }) {
  return children;
}
