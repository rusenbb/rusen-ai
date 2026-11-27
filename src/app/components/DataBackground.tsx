"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import AsciiDataBackground from "./AsciiDataBackground";
import {
  isBgDisabled,
  subscribeBgToggle,
} from "./backgroundToggle";

/** The ambient ASCII field belongs to the home page only; every other page
 *  keeps a plain background so its own content (live covers, posts, photos)
 *  is the focus. The 404 page keeps its "404" field. */
export function hasBackground(pathname: string | null, notFound: boolean): boolean {
  // Next can yield both "/demos" and "/demos/"; normalize before comparing.
  const normalized = (pathname ?? "/").replace(/\/+$/, "") || "/";
  return notFound || normalized === "/";
}

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

  if (disabled || !hasBackground(pathname, notFoundActive)) return null;

  return <AsciiDataBackground noise word={notFoundActive ? "404" : "DATA"} />;
}
