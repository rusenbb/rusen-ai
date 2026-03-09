"use client";

import { usePathname } from "next/navigation";
import LegacyDataGridBackground from "./LegacyDataGridBackground";

export default function DataBackground() {
  const pathname = usePathname();

  if (pathname === "/nerdy-stuff/embedding-explorer") {
    return null;
  }

  return <LegacyDataGridBackground />;
}
