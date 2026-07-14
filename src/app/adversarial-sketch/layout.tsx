import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("adversarial-sketch");

export default function AdversarialSketchLayout({ children }: { children: ReactNode }) {
  return children;
}
