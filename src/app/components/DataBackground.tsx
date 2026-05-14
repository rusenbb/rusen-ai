"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import AsciiDataBackground from "./AsciiDataBackground";
import { isBgDisabled, subscribeBgToggle } from "./bgToggle";

// Index pages where the full ambient noise field is welcome. Anywhere else
// keeps the DATA pulse + click ripples but drops the noise so dense content
// pages (CV, individual demos, individual bulletin pages) read cleaner.
const NOISE_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/demos",
  "/nerdy-stuff",
  "/bulletin",
]);

export default function DataBackground() {
  const pathname = usePathname();
  const disabled = useSyncExternalStore<boolean>(
    subscribeBgToggle,
    isBgDisabled,
    () => false,
  );

  if (disabled) return null;
  if (
    pathname === "/embedding-explorer" ||
    pathname === "/game-of-life" ||
    pathname?.startsWith("/game-of-life/")
  ) {
    return null;
  }

  // Next can yield both "/demos" and "/demos/"; normalize before lookup.
  const normalized = (pathname ?? "/").replace(/\/+$/, "") || "/";
  const noise = NOISE_PATHS.has(normalized);

  return <AsciiDataBackground noise={noise} />;
}
