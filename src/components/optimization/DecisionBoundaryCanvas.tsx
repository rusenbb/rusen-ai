"use client";

import { useEffect, useMemo, useRef } from "react";
import { generateTwoMoons, type DecisionBoundarySnapshot } from "@/lib/optimization";

export default function DecisionBoundaryCanvas({
  snapshot,
}: {
  snapshot: DecisionBoundarySnapshot;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samples = useMemo(() => generateTwoMoons(120, 7), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth || 360;
    const height = canvas.clientHeight || 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);

    const gridSize = snapshot.gridSize;
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        const probability = snapshot.decisionGrid[row * gridSize + col] ?? 0.5;
        const hue = 210 - probability * 175;
        const alpha = 0.18 + Math.abs(probability - 0.5) * 0.45;
        context.fillStyle = `hsla(${hue}deg 72% 55% / ${alpha})`;
        context.fillRect(col * cellWidth, row * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }

    for (const sample of samples) {
      const x = ((sample.features[0] + 1.5) / 4) * width;
      const y = height - ((sample.features[1] + 1.4) / 3.2) * height;
      context.fillStyle = sample.label === 0 ? "#0f766e" : "#be123c";
      context.strokeStyle = "rgba(255,255,255,0.8)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, 4.2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    context.strokeStyle = "rgba(100, 116, 139, 0.45)";
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, width - 1, height - 1);
  }, [samples, snapshot]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-[1rem] border border-neutral-200/80 bg-white/85 dark:border-neutral-800/80 dark:bg-neutral-950/60"
      style={{ height: 280 }}
    />
  );
}
