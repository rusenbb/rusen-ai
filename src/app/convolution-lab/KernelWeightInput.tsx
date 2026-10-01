"use client";

import { useState } from "react";

export function KernelWeightInput({ value, label, onChange }: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const valid = text.trim() !== "" && Number.isFinite(Number(text)) && Math.abs(Number(text)) <= 9;
  return (
    <input
      aria-label={label}
      aria-describedby="kernel-input-help"
      aria-invalid={!valid}
      className="w-full min-w-0 bg-transparent text-center font-mono text-sm outline-none"
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next.trim() && Number.isFinite(Number(next)) && Math.abs(Number(next)) <= 9) onChange(Number(next));
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
    />
  );
}
