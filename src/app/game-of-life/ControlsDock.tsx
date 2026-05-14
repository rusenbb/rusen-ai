"use client";

import { useEffect, useState } from "react";

type BgState = {
  bgNavMode: boolean;
  autoZoomEnabled: boolean;
  autoZoomSpeedDigit: number;
  speedDigit: number;
  animationPaused: boolean;
  showHelp: boolean;
};

const DEFAULT_STATE: BgState = {
  bgNavMode: true,
  autoZoomEnabled: true,
  autoZoomSpeedDigit: 3,
  speedDigit: 3,
  animationPaused: false,
  showHelp: false,
};

function dispatchBgControl(action: string): void {
  window.dispatchEvent(new CustomEvent("bg-control", { detail: { action } }));
}

const dockBtn =
  "w-full h-9 px-2.5 text-[11px] font-mono uppercase tracking-[0.06em] " +
  "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] " +
  "hover:bg-[var(--line-strong)] hover:text-[var(--background)] " +
  "transition-colors cursor-pointer";

export default function ControlsDock() {
  const [state, setState] = useState<BgState>(DEFAULT_STATE);
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);

  useEffect(() => {
    document.body.dataset.gameLifeFullscreen = fullscreenMode ? "on" : "off";
    return () => {
      delete document.body.dataset.gameLifeFullscreen;
    };
  }, [fullscreenMode]);

  useEffect(() => {
    const onBgState = (event: Event) => {
      const e = event as CustomEvent<Partial<BgState>>;
      setState((prev) => ({ ...prev, ...e.detail }));
    };

    window.addEventListener("bg-state", onBgState);
    return () => window.removeEventListener("bg-state", onBgState);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[85] w-[min(92vw,22rem)] bg-[var(--surface)] border border-[var(--line-strong)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--sub)]">
          GAME OF LIFE / CONTROLS
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="px-2 py-1 text-[10px] font-mono uppercase tracking-[0.06em] border border-[var(--line-strong)] hover:bg-[var(--line-strong)] hover:text-[var(--background)] transition-colors cursor-pointer"
        >
          {collapsed ? "Maximize" : "Minimize"}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => dispatchBgControl("toggle-bg-nav")} className={dockBtn}>
              Nav: {state.bgNavMode ? "On" : "Off"}
            </button>
            <button type="button" onClick={() => dispatchBgControl("toggle-auto-zoom")} className={dockBtn}>
              AutoZoom: {state.autoZoomEnabled ? "On" : "Off"}
            </button>
            <button type="button" onClick={() => dispatchBgControl("autozoom-speed-down")} className={dockBtn}>
              AutoZoom −
            </button>
            <button type="button" onClick={() => dispatchBgControl("autozoom-speed-up")} className={dockBtn}>
              AutoZoom +
            </button>
            <button type="button" onClick={() => dispatchBgControl("speed-down")} className={dockBtn}>
              Speed −
            </button>
            <button type="button" onClick={() => dispatchBgControl("speed-up")} className={dockBtn}>
              Speed +
            </button>
            <button type="button" onClick={() => dispatchBgControl("toggle-animation-pause")} className={dockBtn}>
              {state.animationPaused ? "Resume" : "Pause"}
            </button>
            <button type="button" onClick={() => setFullscreenMode((v) => !v)} className={dockBtn}>
              {fullscreenMode ? "Show Nav Bar" : "Hide Nav Bar"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.06em] text-[var(--muted)]">
            <span>Speed: {state.speedDigit} | AutoZoom: {state.autoZoomSpeedDigit}</span>
            <button
              type="button"
              onClick={() => dispatchBgControl("toggle-help")}
              className="underline underline-offset-2 hover:text-[var(--foreground)] cursor-pointer"
            >
              {state.showHelp ? "Hide Help" : "Help"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
