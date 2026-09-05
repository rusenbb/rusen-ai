"use client";

import { useState } from "react";

import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";

import { aliasFrequency, sineAt } from "./math";

const PRESETS = [
  { label: "Enough samples", frequency: 3, sampleRate: 24, phase: 0 },
  { label: "A false frequency", frequency: 9, sampleRate: 12, phase: 0 },
  { label: "The Nyquist edge", frequency: 6, sampleRate: 12, phase: 0 },
];

export default function SamplingLab() {
  const [signal, setSignal] = useState(PRESETS[1]);
  const [showAlias, setShowAlias] = useState(true);
  const { frequency, sampleRate, phase } = signal;
  const radians = (phase * Math.PI) / 180;
  const alias = aliasFrequency(frequency, sampleRate);
  const undersampled = sampleRate < 2 * frequency;
  const atNyquist = sampleRate === 2 * frequency;
  const path = (hz: number) =>
    Array.from({ length: 801 }, (_, i) => {
      const t = i / 800;
      return `${40 + t * 720},${170 - sineAt(t, hz, radians) * 110}`;
    }).join(" ");

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Signals · interactive lab"
        title="Sampling Lab"
        description="The dots are all a digital system gets. Change how often you sample a wave and watch a different frequency pass through exactly the same dots."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="secondary"
            size="sm"
            onClick={() => setSignal(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <DemoPanel
        title="One second of signal"
        description="Cyan: original wave. Dots: measured samples. Dashed amber: a baseband wave with the same samples."
      >
        <svg
          viewBox="0 0 800 350"
          className="w-full"
          role="img"
          aria-label={`${frequency} Hz signal sampled at ${sampleRate} Hz; baseband frequency ${Math.abs(alias)} Hz`}
        >
          {[60, 170, 280].map((y, i) => (
            <g key={y}>
              <line x1="40" x2="760" y1={y} y2={y} stroke="var(--line)" />
              <text
                x="25"
                y={y + 4}
                textAnchor="end"
                fill="currentColor"
                fontSize="12"
              >
                {1 - i}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={40 + t * 720}
                x2={40 + t * 720}
                y1="45"
                y2="290"
                stroke="var(--line)"
              />
              <text
                x={40 + t * 720}
                y="315"
                textAnchor="middle"
                fill="currentColor"
                fontSize="12"
              >
                {t}s
              </text>
            </g>
          ))}
          <polyline
            points={path(frequency)}
            fill="none"
            stroke="#0891b2"
            strokeWidth="2.5"
          />
          {showAlias && (
            <polyline
              points={path(alias)}
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeDasharray="7 5"
            />
          )}
          {Array.from({ length: sampleRate + 1 }, (_, n) => {
            const x = 40 + (n / sampleRate) * 720;
            const y = 170 - sineAt(n / sampleRate, frequency, radians) * 110;
            return (
              <g key={n}>
                <line
                  x1={x}
                  x2={x}
                  y1="170"
                  y2={y}
                  stroke="currentColor"
                  opacity="0.25"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="var(--foreground)"
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>
        <div className="grid gap-5 sm:grid-cols-3">
          {(
            [
              {
                key: "frequency",
                label: "Signal frequency",
                min: 1,
                max: 20,
                unit: "Hz",
              },
              {
                key: "sampleRate",
                label: "Sample rate",
                min: 4,
                max: 64,
                unit: "Hz",
              },
              { key: "phase", label: "Phase", min: 0, max: 360, unit: "°" },
            ] as const
          ).map((control) => (
            <label key={control.key} className="text-sm">
              <span className="flex justify-between gap-2">
                {control.label}
                <strong className="font-mono">
                  {signal[control.key]} {control.unit}
                </strong>
              </span>
              <input
                className="mt-3 w-full accent-cyan-600"
                type="range"
                min={control.min}
                max={control.max}
                step="1"
                value={signal[control.key]}
                onChange={(event) =>
                  setSignal({
                    ...signal,
                    [control.key]: Number(event.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showAlias}
            onChange={(event) => setShowAlias(event.target.checked)}
          />
          Show the baseband wave
        </label>
      </DemoPanel>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <DemoPanel
          title={
            atNyquist
              ? "At the boundary"
              : undersampled
                ? "Different waves, identical samples"
                : "Inside the sampling limit"
          }
        >
          <p className="text-sm leading-relaxed" aria-live="polite">
            {atNyquist
              ? "Exactly two samples per cycle is a boundary case. At zero phase every dot is zero; rotate the phase to see why the original amplitude and phase cannot be uniquely recovered."
              : undersampled
                ? `Your ${frequency} Hz wave looks like a ${Math.abs(alias)} Hz wave to this sampler. The original oscillates between measurements, where the sampler cannot see it.`
                : "The sample rate is greater than twice the signal frequency. With the assumption that no frequencies reach half the sample rate, ideal reconstruction can recover the original wave."}
          </p>
        </DemoPanel>
        <DemoPanel title="Read the numbers">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt>Nyquist frequency</dt>
            <dd className="text-right font-mono">{sampleRate / 2} Hz</dd>
            <dt>Baseband frequency</dt>
            <dd className="text-right font-mono">{Math.abs(alias)} Hz</dd>
            <dt>Samples per cycle</dt>
            <dd className="text-right font-mono">
              {(sampleRate / frequency).toFixed(2)}
            </dd>
          </dl>
          <p className="mt-4 text-xs text-neutral-500">
            The dashed curve is an analytically constructed alias, not an
            interpolation of this finite window. Negative signed frequencies
            reverse the sine&apos;s direction to keep its phase consistent.
          </p>
        </DemoPanel>
      </div>
      <DemoFootnote>
        Ideal, noise-free sampling of a single sine wave. All calculations run
        locally.
      </DemoFootnote>
    </DemoPage>
  );
}
