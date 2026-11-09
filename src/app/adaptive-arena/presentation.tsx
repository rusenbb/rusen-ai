import type { AbilityAction, ArenaAction, MoveAction } from "./game";

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

/** Plain names for the eight actions, used in the bot readout. */
export const ACTION_NAMES: Record<ArenaAction, string> = {
  "move-up": "Up",
  "move-down": "Down",
  "move-left": "Left",
  "move-right": "Right",
  attack: "Attack",
  guard: "Guard",
  dash: "Dash",
  hold: "Hold",
};

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
