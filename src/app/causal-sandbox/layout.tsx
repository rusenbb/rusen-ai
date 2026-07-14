import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("causal-sandbox");

export default function CausalSandboxLayout({ children }: { children: ReactNode }) {
  return children;
}
