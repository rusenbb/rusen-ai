import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("backprop-microscope");

export default function BackpropMicroscopeLayout({ children }: { children: ReactNode }) {
  return children;
}
