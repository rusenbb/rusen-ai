import type { ReactNode } from "react";
import { buildProjectMetadata } from "@/lib/project-metadata";
export const metadata = buildProjectMetadata("rusen-gram");
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
