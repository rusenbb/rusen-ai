import type { AbilityAction, MoveAction } from "./game";

export const CONTROL_BUTTONS: Array<{
  label: string;
  action: MoveAction;
}> = [
  { label: "W / ↑", action: "move-up" },
  { label: "S / ↓", action: "move-down" },
  { label: "A / ←", action: "move-left" },
  { label: "D / →", action: "move-right" },
];

export const ABILITY_BUTTONS: Array<{
  label: string;
  action: AbilityAction;
  hint: string;
}> = [
  { label: "Attack", action: "attack", hint: "J" },
  { label: "Guard", action: "guard", hint: "K" },
  { label: "Dash", action: "dash", hint: "L" },
];

export const ARENA_LEGEND = [
  {
    label: "You",
    detail: "Your cyan unit. Stay alive longer than the bot to win the round.",
    swatch: "bg-cyan-300",
  },
  {
    label: "Bot",
    detail:
      "The opponent. Each difficulty loads a different trained checkpoint.",
    swatch: "bg-orange-400",
  },
  {
    label: "Health",
    detail: "Orange pickup. Restores health when you step onto it.",
    swatch: "bg-orange-500",
  },
  {
    label: "Energy",
    detail: "Green pickup. Refills dash energy so you can reposition harder.",
    swatch: "bg-lime-400",
  },
  {
    label: "Cover",
    detail:
      "Teal cover tile. Breaks line of sight and reduces direct pressure.",
    swatch: "bg-sky-900",
  },
  {
    label: "Hazard",
    detail: "The center cross. Standing on it burns health over time.",
    swatch: "bg-amber-900",
  },
] as const;

export function getKeycapClass(): string {
  return "border-white/10 bg-white/[0.04] text-neutral-200";
}

export function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">
        {label}
      </div>
      <div
        className="mt-2 text-xl font-semibold text-neutral-100"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function FullscreenCornersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
