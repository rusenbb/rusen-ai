import { type ReactNode } from "react";

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** One short line under the value. */
  note?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}

/** A headline number with a mono label. Use for the one result a demo is about. */
export function Stat({ label, value, note, size = "md", className = "" }: StatProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[var(--sub)]">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums text-[var(--foreground)] ${size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl"}`}>
        {value}
      </div>
      {note && <div className="mt-1 text-sm text-[var(--muted)]">{note}</div>}
    </div>
  );
}
