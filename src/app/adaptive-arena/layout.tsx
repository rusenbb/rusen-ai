import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("adaptive-arena");

export default function AdaptiveArenaLayout({ children }: { children: ReactNode }) {
  return children;
}
