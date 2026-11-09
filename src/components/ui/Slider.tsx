import { useId, type ReactNode } from "react";

interface SliderProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Text shown for the current value; defaults to the number. */
  display?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A labelled range input with its value on the right. */
export function Slider({ label, value, min, max, step = 1, onChange, display, disabled, className = "" }: SliderProps) {
  const id = useId();
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 font-mono text-[0.7rem] uppercase tracking-[0.08em]">
        <label htmlFor={id} className="text-[var(--muted)]">{label}</label>
        <output htmlFor={id} className="tabular-nums text-[var(--foreground)]">{display ?? value}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="ui-slider w-full"
      />
    </div>
  );
}
