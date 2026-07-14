import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("attention-arena");

export default function AttentionArenaLayout({ children }: { children: ReactNode }) {
  return children;
}
