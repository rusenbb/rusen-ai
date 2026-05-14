"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  "/blogs",
]);

// Path prefixes that should also get the full noise field — covers dynamic
// listing-style routes like /blogs/tag/[tag] and /blogs/series/[id].
const NOISE_PREFIXES: readonly string[] = ["/blogs/tag", "/blogs/series"];

export default function DataBackground() {
  const pathname = usePathname();
  const disabled = useSyncExternalStore<boolean>(
    subscribeBgToggle,
    isBgDisabled,
    () => false,
  );

  // The 404 page doesn't have a stable pathname (it's whatever the user
  // typed), so we detect it via the body flag NotFoundPageFlags already
  // sets. MutationObserver covers SPA transitions in and out of 404.
  const [notFoundActive, setNotFoundActive] = useState(false);
  useEffect(() => {
    const check = () =>
      setNotFoundActive(document.body.dataset.notFoundPage === "on");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-not-found-page"],
    });
    return () => observer.disconnect();
  }, []);

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
  const noise =
    notFoundActive ||
    NOISE_PATHS.has(normalized) ||
    NOISE_PREFIXES.some((p) => normalized.startsWith(p + "/"));

  return <AsciiDataBackground noise={noise} word={notFoundActive ? "404" : "DATA"} />;
}
