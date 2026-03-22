import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("game-of-life");

export default function GameOfLifeLayout({ children }: { children: ReactNode }) {
  return children;
}
