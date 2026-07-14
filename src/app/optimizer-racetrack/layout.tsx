import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("optimizer-racetrack");

export default function OptimizerRacetrackLayout({ children }: { children: ReactNode }) {
  return children;
}
