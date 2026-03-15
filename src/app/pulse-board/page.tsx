"use client";

import { useEffect, useState } from "react";
import { DemoHeader, DemoPage } from "@/components/ui";
import {
  AnimatedWidget,
  PULSE_WIDGETS,
  ShortcutsModal,
  WIDGET_ORDER,
} from "./widgets";

export default function PulseBoardPage() {
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setLastUpdated(new Date().toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        window.location.reload();
        return;
      }

      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const widgetIndex = parseInt(e.key, 10) - 1;
        if (widgetIndex < WIDGET_ORDER.length) {
          const element = document.getElementById(`widget-${WIDGET_ORDER[widgetIndex]}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
            }, 1000);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DemoPage>
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      <DemoHeader
        eyebrow="Data Engineering / Real-Time"
        title={
          <span className="relative inline-block">
            <span className="relative z-10">Pulse Board</span>
            <span className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse-glow" />
          </span>
        }
        description="Live dashboard showing real-time data from around the world. All data refreshes automatically."
      />

      <p className="-mt-4 mb-8 text-xs text-neutral-500">
        Press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">?</kbd> for keyboard shortcuts
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PULSE_WIDGETS.map((widget, index) => (
          <AnimatedWidget key={widget.id} id={widget.id} index={index}>
            {widget.component}
          </AnimatedWidget>
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-neutral-500">
        Last updated: {lastUpdated}
      </div>
    </DemoPage>
  );
}
