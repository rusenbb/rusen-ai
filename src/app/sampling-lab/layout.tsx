import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("sampling-lab");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
