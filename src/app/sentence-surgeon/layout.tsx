import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("sentence-surgeon");

export default function SentenceSurgeonLayout({ children }: { children: ReactNode }) {
  return children;
}
