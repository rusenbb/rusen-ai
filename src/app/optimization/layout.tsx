import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("optimization");

export default function OptimizationLayout({ children }: { children: ReactNode }) {
  return children;
}
