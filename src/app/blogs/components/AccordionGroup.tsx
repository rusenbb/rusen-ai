"use client";

import { useEffect, useRef } from "react";

interface Props {
  num: string;
  title: React.ReactNode;
  count: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AccordionGroup({
  num,
  title,
  count,
  defaultOpen = false,
  children,
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    function onClick() {
      const wasOpen = btn!.getAttribute("aria-expanded") === "true";
      // Close every group on the page, then open this one if it wasn't already.
      document.querySelectorAll<HTMLButtonElement>(".acc-toggle").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
      });
      btn!.setAttribute("aria-expanded", wasOpen ? "false" : "true");
    }

    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, []);

  return (
    <section className="acc">
      <button
        ref={btnRef}
        className="acc-toggle"
        aria-expanded={defaultOpen ? "true" : "false"}
        type="button"
      >
        <span className="chevron">▸</span>
        <span className="sec-num">{num}</span>
        <span className="sec-title">{title}</span>
        <span className="dashed-rule" />
        <span className="sec-count">{count}</span>
      </button>
      <div className="acc-body">{children}</div>
    </section>
  );
}
