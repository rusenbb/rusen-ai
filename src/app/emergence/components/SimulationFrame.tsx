"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSeededRandom } from "@/lib/random";
import { Button } from "@/components/ui";

const SimulationContext = createContext({ active: true, seed: 42 });

export function useSimulation() {
  const context = useContext(SimulationContext);
  const random = useMemo(() => createSeededRandom(context.seed), [context.seed]);
  return { ...context, random };
}

export default function SimulationFrame({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState(42);
  const [replay, setReplay] = useState(0);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setStarted(true);
    });
    if (root.current) observer.observe(root.current);
    const visibility = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <div ref={root} className="min-h-80">
    <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono">Seed {seed}</span>
      <Button size="sm" onClick={() => setReplay((value) => value + 1)}>Replay seed</Button>
      <Button size="sm" onClick={() => setSeed((value) => value + 1)}>New seed</Button>
      <span className="text-neutral-500">Replay restores this seed and default controls. Offscreen simulations pause.</span>
    </div>
    {started ? <SimulationContext.Provider key={`${seed}-${replay}`} value={{ seed, active: visible && foreground }}>{children}</SimulationContext.Provider> : <p className="text-sm text-neutral-500">Simulation initializes when this section enters the viewport.</p>}
  </div>;
}
