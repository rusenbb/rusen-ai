import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("outguess");

export default function OutguessLayout({ children }: { children: ReactNode }) {
  return children;
}
