import type { ReactNode } from "react";

import { buildProjectMetadata } from "@/lib/project-metadata";

export const metadata = buildProjectMetadata("emergence");

export default function EmergenceLayout({ children }: { children: ReactNode }) {
  return children;
}
