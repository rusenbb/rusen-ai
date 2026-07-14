import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("fourier-sketch");

export default function FourierSketchLayout({ children }: { children: ReactNode }) {
  return children;
}
