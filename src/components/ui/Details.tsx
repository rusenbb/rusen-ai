import { type ReactNode } from "react";

interface DetailsProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/** Collapsed secondary material: advanced controls, method notes, licences. */
export function Details({ summary, children, defaultOpen = false, className = "" }: DetailsProps) {
  return (
    <details open={defaultOpen} className={`ui-details border-t border-[var(--line)] ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]">
        <span aria-hidden="true" className="ui-details__mark">+</span>
        {summary}
      </summary>
      <div data-allow-select className="pb-4 text-sm text-[var(--muted)]">{children}</div>
    </details>
  );
}
