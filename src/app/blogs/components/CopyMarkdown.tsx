"use client";

import { useState } from "react";

/** Copies the whole post as Markdown to the clipboard. */
export default function CopyMarkdown({ markdown, lang }: { markdown: string; lang: "en" | "tr" }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const labels =
    lang === "tr"
      ? { idle: "markdown'ı kopyala", copied: "kopyalandı ✓", failed: "kopyalanamadı" }
      : { idle: "copy markdown", copied: "copied ✓", failed: "copy failed" };

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" className="copy-md" onClick={onClick} aria-live="polite">
      [ {labels[state]} ]
    </button>
  );
}
