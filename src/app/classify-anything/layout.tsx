import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("classify-anything");

export default function ClassifyAnythingLayout({ children }: { children: ReactNode }) {
  return children;
}
