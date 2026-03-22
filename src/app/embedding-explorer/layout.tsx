import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("embedding-explorer");

export default function EmbeddingExplorerLayout({ children }: { children: ReactNode }) {
  return children;
}
