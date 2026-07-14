import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("curve-fitter");

export default function CurveFitterLayout({ children }: { children: ReactNode }) {
  return children;
}
