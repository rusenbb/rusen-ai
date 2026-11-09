import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /** Pressed state for toggle chips (presets, labels, samples). */
  selected?: boolean;
  /** Shows a small × that calls this instead of onClick. */
  onRemove?: () => void;
}

/**
 * Small outlined token: a preset, a label, a filter. Selected chips invert.
 * With `onRemove` it renders as a removable label.
 */
export function Chip({ children, selected = false, onRemove, className = "", ...props }: ChipProps) {
  const base =
    "inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] transition-colors disabled:opacity-50";
  const tone = selected
    ? "border-[var(--line-strong)] bg-[var(--line-strong)] text-[var(--background)]"
    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--foreground)]";

  if (onRemove) {
    return (
      <span className={`${base} ${tone} ${className}`}>
        {children}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${typeof children === "string" ? children : "item"}`}
          className="-mr-1 px-1 leading-none opacity-60 hover:opacity-100 cursor-pointer"
          {...props}
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <button type="button" aria-pressed={selected} className={`${base} ${tone} cursor-pointer ${className}`} {...props}>
      {children}
    </button>
  );
}
