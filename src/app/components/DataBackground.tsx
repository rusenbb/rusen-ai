"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import AsciiDataBackground from "./AsciiDataBackground";
import {
  getBackgroundScope,
  isBgDisabled,
  isBgDisabledByDefault,
  subscribeBgToggle,
} from "./backgroundToggle";

// Index pages where the full ambient noise field and DATA pulse are welcome.
// Dense content pages keep only on-demand click ripples, avoiding a continuous
// animation behind material meant for reading or interaction.
const NOISE_PATHS: ReadonlySet<string> = new Set([
  "/",
  "/demos",
  "/nerdy-stuff",
  "/bulletin",
  "/blogs",
]);

// Path prefixes that should also get the full noise field - covers dynamic
// listing-style routes like /blogs/tag/[tag] and /blogs/series/[id].
const NOISE_PREFIXES: readonly string[] = ["/blogs/tag", "/blogs/series"];

// A single post (/blogs/<slug>) is for reading: no background at all.
// Listing routes under /blogs keep it.
function isBlogPost(path: string): boolean {
  const m = /^\/blogs\/([^/]+)$/.exec(path);
  return m !== null && m[1] !== "tag" && m[1] !== "series";
}

export default function DataBackground() {
  const pathname = usePathname();
  const scope = getBackgroundScope(pathname);
  const disabled = useSyncExternalStore<boolean>(
    subscribeBgToggle,
    () => isBgDisabled(scope),
    () => isBgDisabledByDefault(scope),
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

  // Next can yield both "/demos" and "/demos/"; normalize before lookup.
  const normalized = (pathname ?? "/").replace(/\/+$/, "") || "/";

  if (disabled) return null;
  if (
    normalized === "/embedding-explorer" ||
    normalized === "/game-of-life" ||
    normalized.startsWith("/game-of-life/") ||
    (isBlogPost(normalized) && !notFoundActive)
  ) {
    return null;
  }
  const noise =
    notFoundActive ||
    NOISE_PATHS.has(normalized) ||
    NOISE_PREFIXES.some((p) => normalized.startsWith(p + "/"));

  // The DATA pulse echoes the home hero; elsewhere the field stays wordless.
  const word = notFoundActive ? "404" : normalized === "/" ? "DATA" : "";

  return <AsciiDataBackground noise={noise} word={word} />;
}
