"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AbilityAction, MoveAction } from "./game";
import { ABILITY_BUTTONS, CONTROL_BUTTONS, getKeycapClass } from "./presentation";

function HoldButton({ children, label, disabled, onPress, onRelease }: {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onPress: () => void;
  onRelease?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const release = useRef(onRelease);
  const activationTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    release.current = onRelease;
  }, [onRelease]);
  useEffect(() => {
    const stop = () => { window.clearTimeout(activationTimer.current); setPressed(false); release.current?.(); };
    window.addEventListener("blur", stop);
    return () => { window.clearTimeout(activationTimer.current); window.removeEventListener("blur", stop); release.current?.(); };
  }, []);
  useEffect(() => {
    if (disabled) { window.clearTimeout(activationTimer.current); release.current?.(); }
  }, [disabled]);
  if (disabled && pressed) setPressed(false);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={`touch-none select-none rounded-2xl border px-2 py-3 text-center focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-40 ${pressed ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : getKeycapClass()}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        window.clearTimeout(activationTimer.current);
        if (event.pointerType !== "touch") event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        onPress();
      }}
      onPointerUp={() => { setPressed(false); onRelease?.(); }}
      onPointerCancel={() => { setPressed(false); onRelease?.(); }}
      onLostPointerCapture={() => { setPressed(false); onRelease?.(); }}
      onBlur={() => { setPressed(false); onRelease?.(); }}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) { window.clearTimeout(activationTimer.current); setPressed(true); onPress(); }
      }}
      onKeyUp={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        setPressed(false);
        onRelease?.();
      }}
      onClick={(event) => {
        // Assistive technologies may activate a button without pointer/key events.
        if (event.detail !== 0) return;
        onPress();
        if (onRelease) {
          setPressed(true);
          window.clearTimeout(activationTimer.current);
          activationTimer.current = window.setTimeout(() => {
            setPressed(false);
            release.current?.();
          }, 150);
        }
      }}
    >{children}</button>
  );
}

export function ArenaControls({ disabled, onMove, onAbility, compact = false }: {
  disabled: boolean;
  onMove: (action: MoveAction, active: boolean) => void;
  onAbility: (action: AbilityAction) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid ${compact ? "gap-2 sm:grid-cols-2" : "gap-4"}`}>
      {!compact && <p className="text-xs text-neutral-400">Hold a direction to move. Tap an ability, or use the keyboard shortcuts.</p>}
      <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-3"}`}>
        {(compact ? CONTROL_BUTTONS : [null, CONTROL_BUTTONS[0], null, CONTROL_BUTTONS[2], CONTROL_BUTTONS[1], CONTROL_BUTTONS[3]]).map((button, index) => button ? (
          <HoldButton key={button.action} label={button.action.replace("-", " ")} disabled={disabled} onPress={() => onMove(button.action, true)} onRelease={() => onMove(button.action, false)}>
            <span className="text-sm font-semibold">{button.label}</span>
          </HoldButton>
        ) : <div key={index} />)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ABILITY_BUTTONS.map((button) => (
          <HoldButton key={button.action} label={button.label} disabled={disabled} onPress={() => onAbility(button.action)}>
            <span className="block text-xs font-semibold uppercase tracking-[0.12em]">{button.label}</span>
            <span className="mt-1 block text-[10px] text-neutral-400">{button.hint}</span>
          </HoldButton>
        ))}
      </div>
    </div>
  );
}
