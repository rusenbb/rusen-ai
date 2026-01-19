"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TokenProbability } from "../types";

interface SamplingWheelProps {
  probabilities: TokenProbability[];
  selectedTokenId: number;
  animationDuration: number;
  onAnimationComplete: () => void;
  isSpinning: boolean;
}

// Colors for wheel slices (gradient from high to low probability)
const SLICE_COLORS = [
  "#22c55e", // green-500 (highest)
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#6b7280", // gray-500 (lowest)
];

// Calculate pie slice path
function getSlicePath(
  startAngle: number,
  endAngle: number,
  radius: number,
  cx: number,
  cy: number
): string {
  // Convert angles to radians (starting from top, going clockwise)
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  // Large arc flag: 1 if angle > 180 degrees
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

// Get label position for a slice
function getLabelPosition(
  startAngle: number,
  endAngle: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  const midAngle = (startAngle + endAngle) / 2;
  const midRad = ((midAngle - 90) * Math.PI) / 180;
  // Place label at 60% of radius for better visibility
  const labelRadius = radius * 0.6;
  return {
    x: cx + labelRadius * Math.cos(midRad),
    y: cy + labelRadius * Math.sin(midRad),
  };
}

// Easing function for deceleration (ease-out cubic)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function SamplingWheel({
  probabilities,
  selectedTokenId,
  animationDuration,
  onAnimationComplete,
  isSpinning,
}: SamplingWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10; // Leave some padding

  // Calculate slices from probabilities
  const slices = probabilities.map((prob, index) => {
    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += probabilities[i].probability * 360;
    }
    const endAngle = startAngle + prob.probability * 360;
    return {
      ...prob,
      startAngle,
      endAngle,
      color: SLICE_COLORS[Math.min(index, SLICE_COLORS.length - 1)],
    };
  });

  // Find the selected slice
  const selectedSlice = slices.find((s) => s.tokenId === selectedTokenId);
  const selectedMidAngle = selectedSlice
    ? (selectedSlice.startAngle + selectedSlice.endAngle) / 2
    : 0;

  // Animate the wheel spin
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Calculate rotation:
      // - Base spins: 3-5 full rotations (random element for excitement)
      // - Plus offset to land on selected token (pointer is at top = 0°)
      const baseSpins = 4 * 360; // 4 full rotations
      const targetOffset = 360 - selectedMidAngle; // Rotate so selected is at top

      // Use easing for natural deceleration
      const easedProgress = easeOutCubic(progress);
      const currentRotation = easedProgress * (baseSpins + targetOffset);

      setRotation(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setHasLanded(true);
        onAnimationComplete();
      }
    },
    [animationDuration, selectedMidAngle, onAnimationComplete]
  );

  // Start animation when isSpinning becomes true
  useEffect(() => {
    if (isSpinning && !isAnimating && probabilities.length > 0) {
      setIsAnimating(true);
      setHasLanded(false);
      startTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, isAnimating, animate, probabilities.length]);

  // Reset when new probabilities come in
  useEffect(() => {
    if (!isSpinning) {
      setRotation(0);
      setHasLanded(false);
    }
  }, [probabilities, isSpinning]);

  if (probabilities.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
        Waiting for generation...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Pointer (arrow at top) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-neutral-900 dark:border-t-white" />
      </div>

      {/* Wheel */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-lg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isAnimating ? "none" : "transform 0.3s ease-out",
        }}
      >
        {/* Slices */}
        {slices.map((slice, index) => {
          const isSelected = slice.tokenId === selectedTokenId && hasLanded;
          const path = getSlicePath(
            slice.startAngle,
            slice.endAngle,
            radius,
            cx,
            cy
          );
          const labelPos = getLabelPosition(
            slice.startAngle,
            slice.endAngle,
            radius,
            cx,
            cy
          );

          // Only show labels for slices with enough space (> 8%)
          const showLabel = slice.probability > 0.08;

          return (
            <g key={index}>
              {/* Slice path */}
              <path
                d={path}
                fill={slice.color}
                stroke={isSelected ? "#fff" : "#1f2937"}
                strokeWidth={isSelected ? 3 : 1}
                className={isSelected ? "animate-pulse" : ""}
                style={{
                  filter: isSelected ? "brightness(1.2)" : "none",
                }}
              />
              {/* Label */}
              {showLabel && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={slice.probability > 0.15 ? 11 : 9}
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                  style={{
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {slice.token.trim() || "⏎"}
                </text>
              )}
            </g>
          );
        })}

        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={20}
          fill="#1f2937"
          stroke="#fff"
          strokeWidth={2}
        />
      </svg>

      {/* Result display after landing */}
      {hasLanded && selectedSlice && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
          <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full">
            <span className="font-mono text-sm font-bold text-green-800 dark:text-green-200">
              "{selectedSlice.token.trim() || "\\n"}"
            </span>
            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
              {(selectedSlice.probability * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
