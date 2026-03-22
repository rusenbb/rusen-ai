import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("pulse-board");

export default function PulseBoardLayout({ children }: { children: ReactNode }) {
  return children;
}
