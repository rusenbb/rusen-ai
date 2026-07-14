import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("forest-inspector");

export default function ForestInspectorLayout({ children }: { children: ReactNode }) {
  return children;
}
