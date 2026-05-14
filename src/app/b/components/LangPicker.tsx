"use client";

import { useSyncExternalStore } from "react";

type Lang = "all" | "en" | "tr";

// useSyncExternalStore is the canonical way to read non-React state (here,
// the html attribute set by the inline script in /b/layout.tsx). The
// MutationObserver triggers a re-render whenever the attribute changes,
// whether from this picker or from somewhere else (e.g. the tag page's
// force-language script).
function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-blog-lang"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Lang {
  return (document.documentElement.dataset.blogLang as Lang) || "en";
}

function getServerSnapshot(): Lang {
  return "en";
}

function setBlogLang(next: Lang) {
  document.documentElement.dataset.blogLang = next;
  try {
    localStorage.setItem("blogLang", next);
  } catch {}
}

export default function LangPicker() {
  const lang = useSyncExternalStore<Lang>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <div className="lang-pills" role="group" aria-label="Language filter">
      {(["all", "en", "tr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setBlogLang(l)}
          className={lang === l ? "is-active" : ""}
          aria-pressed={lang === l}
        >
          {l === "all" ? "All" : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
