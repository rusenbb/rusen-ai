"use client";

import { usePathname } from "next/navigation";
import LegacyDataGridBackground from "./LegacyDataGridBackground";

export default function DataBackground() {
  const pathname = usePathname();

  if (
    pathname === "/embedding-explorer" ||
    pathname === "/optimization" ||
    pathname === "/game-of-life" ||
    pathname?.startsWith("/game-of-life/")
  ) {
    return null;
  }

  return <LegacyDataGridBackground />;
}
