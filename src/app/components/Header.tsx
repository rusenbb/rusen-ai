"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type BgState = {
  bgNavMode: boolean;
  autoZoomEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  speedDigit: number;
  animationPaused: boolean;
  clearBgMode: boolean;
  routeIsDemoDetail: boolean;
  showHelp: boolean;
};

const DEFAULT_STATE: BgState = {
  bgNavMode: true,
  autoZoomEnabled: true,
  soundEnabled: false,
  soundVolume: 35,
  speedDigit: 3,
  animationPaused: false,
  clearBgMode: false,
  routeIsDemoDetail: false,
  showHelp: false,
};

function dispatchBgControl(action: string): void {
  window.dispatchEvent(new CustomEvent("bg-control", { detail: { action } }));
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bgState, setBgState] = useState<BgState>(DEFAULT_STATE);
  const menuRef = useRef<HTMLDivElement>(null);
  const soundLevelScaled = bgState.soundEnabled ? (bgState.soundVolume / 100) * 5 : 0;
  const soundLevelFullBars = Math.floor(soundLevelScaled);
  const soundLevelPartial = soundLevelScaled - soundLevelFullBars;

  useEffect(() => {
    const updateFromBody = () => {
      const ds = document.body.dataset;
      setBgState((prev) => ({
        ...prev,
        bgNavMode: ds.bgNav !== "off",
        autoZoomEnabled: ds.bgAutozoom !== "off",
        soundEnabled: ds.bgSound !== "off",
        soundVolume: Math.max(0, Math.min(100, Number(ds.bgVolume ?? "35"))),
        speedDigit: Number(ds.bgSpeed ?? "3"),
        animationPaused: ds.bgPaused === "on",
        clearBgMode: ds.bgClear === "on",
      }));
    };
    updateFromBody();

    const onBgState = (event: Event) => {
      const e = event as CustomEvent<Partial<BgState>>;
      setBgState((prev) => ({ ...prev, ...e.detail }));
    };
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("bg-state", onBgState);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("bg-state", onBgState);
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className="ui-surface relative z-[90] border-b border-neutral-200/70 dark:border-neutral-800/70">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold hover:opacity-80 transition">
          rusen.ai
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/demos" className="hover:opacity-80 transition">
            Demos
          </Link>
          <Link href="/nerdy-stuff" className="hover:opacity-80 transition">
            Nerdy Stuff
          </Link>
          <Link href="/cv" className="hover:opacity-80 transition">
            CV
          </Link>

          <span className="h-5 w-px bg-neutral-300/80 dark:bg-neutral-700/80" aria-hidden="true" />

          <button
            type="button"
            onClick={() => dispatchBgControl("toggle-bg-nav")}
            disabled={bgState.clearBgMode}
            className={`inline-flex items-center justify-center w-8 h-8 transition ${
              bgState.bgNavMode
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 dark:text-neutral-400"
            } hover:text-neutral-800 dark:hover:text-neutral-200 ${
              bgState.clearBgMode ? "opacity-45 cursor-not-allowed" : ""
            }`}
            aria-label={`Background navigation ${bgState.bgNavMode ? "on" : "off"}`}
            title={bgState.clearBgMode ? "Disabled while Clear BG is on" : `Background navigation: ${bgState.bgNavMode ? "On" : "Off"}`}
          >
            {bgState.bgNavMode ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M22.39 11.9l-1.3-1.3a1 1 0 0 0-1.41 0L18 12.28V4.5a1.5 1.5 0 0 0-3 0V10h-1V3.5a1.5 1.5 0 0 0-3 0V10h-1V5.5a1.5 1.5 0 0 0-3 0V10h-1V8.5a1.5 1.5 0 0 0-3 0V16a5 5 0 0 0 5 5h7.59a3 3 0 0 0 2.12-.88l3.68-3.68a3 3 0 0 0 0-4.24z" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 12V6a1.5 1.5 0 0 1 3 0v4" />
                <path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10" />
                <path d="M14 10V6a1.5 1.5 0 0 1 3 0v6" />
                <path d="M8 10.5a1.5 1.5 0 0 0-3 0v3.5a6 6 0 0 0 6 6h3a5 5 0 0 0 5-5v-2.2a3.5 3.5 0 0 0-1.02-2.48L16.2 8.55" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => dispatchBgControl("toggle-bg-clear")}
            className={`inline-flex items-center justify-center w-8 h-8 transition ${
              bgState.clearBgMode
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 dark:text-neutral-400"
            } hover:text-neutral-800 dark:hover:text-neutral-200`}
            aria-label={`Clear background ${bgState.clearBgMode ? "on" : "off"}`}
            title={
              bgState.clearBgMode
                ? "Restore animated background"
                : "Hide background and foreground controls"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="13" rx="3.1" ry="3.5" />
              <circle cx="12" cy="8.2" r="1.35" />
              <path d="M10.1 7.5l-1.9-2.2M13.9 7.5l1.9-2.2" />
              <path d="M9.2 11.2l-3.1-1.9M8.9 13.4l-3.8-.2M9.5 15.6l-3.3 1.9" />
              <path d="M14.8 11.2l3.1-1.9M15.1 13.4l3.8-.2M14.5 15.6l3.3 1.9" />
              {bgState.clearBgMode && <line x1="5" y1="19" x2="19" y2="5" />}
            </svg>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center w-8 h-8 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
              aria-label="Open background tools"
              aria-expanded={menuOpen}
              title="Background settings"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="10" x2="12" y2="16" />
                <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-[120] mt-2 w-52 rounded-lg border border-neutral-300/70 dark:border-neutral-700/70 bg-white/95 dark:bg-neutral-900/95 shadow-xl p-2 space-y-1"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span>Speed: {bgState.speedDigit}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => dispatchBgControl("speed-down")}
                      className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Decrease background speed"
                      title="Slower"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchBgControl("toggle-animation-pause")}
                      disabled={bgState.clearBgMode}
                      className={`w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 inline-flex items-center justify-center ${
                        bgState.clearBgMode
                          ? "opacity-45 cursor-not-allowed"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                      aria-label={bgState.animationPaused ? "Resume background animation" : "Pause background animation"}
                      title={
                        bgState.clearBgMode
                          ? "Disabled while Clear BG is on"
                          : bgState.animationPaused
                          ? "Resume background animation"
                          : "Pause background animation"
                      }
                    >
                      {bgState.animationPaused ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      ) : (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <rect x="7" y="5" width="3" height="14" rx="1" />
                          <rect x="14" y="5" width="3" height="14" rx="1" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchBgControl("speed-up")}
                      className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Increase background speed"
                      title="Faster"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span>BG Music</span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-end gap-0.5 pr-1" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className="w-1 rounded-[1px] transition bg-neutral-300 dark:bg-neutral-700"
                          style={{
                            height: `${4 + (step + 1) * 2}px`,
                            opacity:
                              step < soundLevelFullBars
                                ? 1
                                : step === soundLevelFullBars && soundLevelPartial > 0
                                ? 0.25 + soundLevelPartial * 0.75
                                : 0.2,
                            backgroundColor:
                              step < soundLevelFullBars ||
                              (step === soundLevelFullBars && soundLevelPartial > 0)
                                ? "currentColor"
                                : undefined,
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatchBgControl("music-vol-down")}
                      className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Decrease background music volume"
                      title="Lower volume"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchBgControl("toggle-sound")}
                      className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center justify-center"
                      aria-label={bgState.soundEnabled ? "Mute background music" : "Unmute background music"}
                      title={bgState.soundEnabled ? "Mute music" : "Unmute music"}
                    >
                      {bgState.soundEnabled ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                          <path d="M18.5 6a9 9 0 0 1 0 12" />
                        </svg>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatchBgControl("music-vol-up")}
                      className="w-6 h-6 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Increase background music volume"
                      title="Raise volume"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatchBgControl("toggle-auto-zoom")}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Gently zoom in automatically"
                >
                  Auto Zoom: {bgState.autoZoomEnabled ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  onClick={() => dispatchBgControl("toggle-help")}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Show control cheat sheet"
                >
                  {bgState.showHelp ? "Hide Help" : "Show Help"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatchBgControl("open-terminal");
                    setMenuOpen(false);
                  }}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Open command palette"
                >
                  Open Command Palette
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
