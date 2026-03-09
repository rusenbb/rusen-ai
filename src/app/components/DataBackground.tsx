"use client";

import { usePathname } from "next/navigation";
import LegacyDataGridBackground from "./LegacyDataGridBackground";

export default function DataBackground() {
  const pathname = usePathname();

  if (pathname === "/embedding-explorer") {
    return null;
  }

  return <LegacyDataGridBackground />;
}
