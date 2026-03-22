import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("temperature-playground");

export default function TemperaturePlaygroundLayout({ children }: { children: ReactNode }) {
  return children;
}
