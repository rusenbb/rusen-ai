"use client";

import { useCallback, useEffect, useState } from "react";
import { clamp } from "@/lib/optimization";

export function usePlayback(speed = 0.22, autoPlay = false) {
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setPlayhead((current) => {
        const next = current + speed * 0.03;
        return next >= 1 ? 1 : next;
      });
    }, 30);
    return () => window.clearInterval(interval);
  }, [isPlaying, speed]);

  const setPlayheadClamped = useCallback(
    (next: number) => setPlayhead(clamp(next, 0, 1)),
    [],
  );

  const reset = useCallback(() => {
    setPlayhead(0);
    setIsPlaying(false);
  }, []);

  const replay = useCallback(() => {
    setPlayhead(0);
    setIsPlaying(true);
  }, []);

  return {
    playhead,
    setPlayhead: setPlayheadClamped,
    isPlaying: isPlaying && playhead < 1,
    setIsPlaying,
    reset,
    replay,
  };
}
