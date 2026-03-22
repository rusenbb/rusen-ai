import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("rusenizer");

export default function RusenizerLayout({ children }: { children: ReactNode }) {
  return children;
}
