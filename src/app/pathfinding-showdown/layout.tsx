import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("pathfinding-showdown");

export default function PathfindingShowdownLayout({ children }: { children: ReactNode }) {
  return children;
}
