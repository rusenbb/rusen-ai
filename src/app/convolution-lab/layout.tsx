import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("convolution-lab");

export default function ConvolutionLabLayout({ children }: { children: ReactNode }) {
  return children;
}
