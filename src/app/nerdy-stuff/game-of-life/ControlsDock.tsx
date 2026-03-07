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

function openSiteTerminal(): void {
  window.dispatchEvent(new Event("open-site-terminal"));
}

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
    <div className="fixed bottom-4 right-4 z-[85] w-[min(92vw,22rem)] ui-card border border-neutral-300/70 dark:border-neutral-700/70 rounded-xl p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-mono tracking-[0.14em] text-neutral-500">GAME OF LIFE CONTROLS</div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {collapsed ? "Maximize" : "Minimize"}
        </button>
      </div>
      {!collapsed && (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => dispatchBgControl("toggle-bg-nav")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Nav: {state.bgNavMode ? "On" : "Off"}
        </button>
        <button
          type="button"
          onClick={() => dispatchBgControl("toggle-auto-zoom")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          AutoZoom: {state.autoZoomEnabled ? "On" : "Off"}
        </button>
        <button
          type="button"
          onClick={() => dispatchBgControl("autozoom-speed-down")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          AutoZoom -
        </button>
        <button
          type="button"
          onClick={() => dispatchBgControl("autozoom-speed-up")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          AutoZoom +
        </button>
        <button
          type="button"
          onClick={() => dispatchBgControl("speed-down")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Speed -
        </button>
        <button
          type="button"
          onClick={() => dispatchBgControl("speed-up")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Speed +
        </button>
        <button
          type="button"
          onClick={() => dispatchBgControl("toggle-animation-pause")}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 col-span-2"
        >
          {state.animationPaused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={() => setFullscreenMode((v) => !v)}
          className="px-2.5 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 col-span-2"
        >
          {fullscreenMode ? "Show Navigation Bar" : "Hide Navigation Bar"}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-300">
        <span>Speed: {state.speedDigit} | AutoZoom: {state.autoZoomSpeedDigit}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatchBgControl("toggle-help")}
            className="underline underline-offset-2 hover:opacity-80"
          >
            {state.showHelp ? "Hide Help" : "Help"}
          </button>
          <button
            type="button"
            onClick={openSiteTerminal}
            className="underline underline-offset-2 hover:opacity-80"
          >
            Terminal
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
