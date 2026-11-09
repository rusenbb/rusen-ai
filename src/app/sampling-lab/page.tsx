"use client";

import { useState, type ReactNode } from "react";

import { Chip, DemoHeader, DemoPage, Details, Segmented, Slider } from "@/components/ui";

import { aliasFrequency, reconstructSamples, sineAt, verdict } from "./math";

const PRESETS = {
  captured: { label: "Captured", frequency: 3, sampleRate: 24, phase: 0 },
  aliased: { label: "Aliased", frequency: 9, sampleRate: 12, phase: 0 },
  vanishes: { label: "Vanishes", frequency: 6, sampleRate: 12, phase: 0 },
} as const;
type PresetId = keyof typeof PRESETS;

const VIEW_W = 1000;
const VIEW_H = 290;
const LEFT = 40;
const WIDTH = 870;
const MID = 140;
const AMP = 100;
const POINTS = 801;

/** SVG coordinate with fixed precision so server and client markup match. */
const fixed = (value: number) => Number(value.toFixed(2));
const x = (t: number) => fixed(LEFT + t * WIDTH);
const y = (value: number) => fixed(MID - value * AMP);
const curve = (valueAt: (t: number) => number) =>
  Array.from({ length: POINTS }, (_, i) => {
    const t = i / (POINTS - 1);
    return `${x(t)},${y(valueAt(t))}`;
  }).join(" ");

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

/** Direct label at the right end of a curve, in HTML so it stays readable on phones. */
const SHIFT = { above: "-100%", center: "-50%", below: "0%" } as const;
function EndLabel({ y: top, shift, color, children }: { y: number; shift: keyof typeof SHIFT; color: string; children: ReactNode }) {
  return (
    <span
      className="pointer-events-none absolute right-1 font-mono text-xs tabular-nums sm:right-2"
      style={{ top: `${(top / VIEW_H) * 100}%`, transform: `translateY(${SHIFT[shift]})`, color }}
    >
      {children}
    </span>
  );
}

/** The verdict sentence with each frequency in its curve's colour. */
function Verdict({ frequency, sampleRate, alias }: { frequency: number; sampleRate: number; alias: number }) {
  const sentence = verdict(frequency, sampleRate, alias);
  const head = `${frequency} Hz`;
  const tail = ` ${Math.abs(alias)} Hz.`;
  const colourTail = Math.abs(alias) !== frequency && alias !== 0 && sentence.endsWith(tail);
  const middle = sentence.slice(head.length, colourTail ? -tail.length : undefined);
  return (
    <>
      <span className="text-accent">{head}</span>
      {middle}
      {colourTail && (
        <>
          {" "}
          <span style={{ color: "var(--accent-2)" }}>{tail.trim()}</span>
        </>
      )}
    </>
  );
}

export default function SamplingLab() {
  const [preset, setPreset] = useState<PresetId | null>("aliased");
  const [signal, setSignal] = useState<{ frequency: number; sampleRate: number; phase: number }>(PRESETS.aliased);
  const [selectedSample, setSelectedSample] = useState(0);
  const [showReconstruction, setShowReconstruction] = useState(false);
  const { frequency, sampleRate, phase } = signal;
  const radians = (phase * Math.PI) / 180;
  const samples = Array.from({ length: sampleRate + 1 }, (_, n) => sineAt(n / sampleRate, frequency, radians));
  const sampleIndex = Math.min(selectedSample, sampleRate);
  const alias = aliasFrequency(frequency, sampleRate);
  const showAlias = Math.abs(alias) !== frequency;
  const update = (patch: Partial<typeof signal>) => {
    setPreset(null);
    setSignal({ ...signal, ...patch });
  };

  const originalEnd = sineAt(1, frequency, radians);
  const aliasEnd = sineAt(1, alias, radians);
  // Stack the two end labels when the curves finish close together.
  const close = Math.abs(originalEnd - aliasEnd) * AMP < 30;
  const originalShift = close ? (originalEnd >= aliasEnd ? "above" : "below") : "center";
  const aliasShift = close ? (originalEnd >= aliasEnd ? "below" : "above") : "center";

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Signals"
        title="Sampling Lab"
        description="A digital system only sees the dots: drop the sample rate below twice the frequency and a slower wave fits them exactly."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Preset"
          options={Object.entries(PRESETS).map(([value, item]) => ({ value: value as PresetId, label: item.label }))}
          value={preset ?? ("" as PresetId)}
          onChange={(id) => {
            setPreset(id);
            setSignal(PRESETS[id]);
          }}
        />
        <Chip selected={showReconstruction} onClick={() => setShowReconstruction(!showReconstruction)}>
          Sinc reconstruction
        </Chip>
      </div>

      <div className="border border-[var(--line)] bg-[var(--surface)]">
        <p className={`${LABEL} px-3 pt-2`}>{sampleRate + 1} samples in one second</p>
        <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block w-full text-[var(--sub)]"
          role="img"
          aria-label={verdict(frequency, sampleRate, alias)}
        >
          {[1, 0, -1].map((level) => (
            <g key={level}>
              <line x1={LEFT} x2={LEFT + WIDTH} y1={y(level)} y2={y(level)} stroke="var(--line)" />
              <text x={LEFT - 12} y={y(level) + 4} textAnchor="end" fill="currentColor" fontSize="13">
                {level}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1="30" y2="255" stroke="var(--line)" />
              <text x={x(t)} y="278" textAnchor="middle" fill="currentColor" fontSize="13">
                {t}s
              </text>
            </g>
          ))}
          {showReconstruction && (
            <polyline
              points={curve((t) => reconstructSamples(samples, sampleRate, t))}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="1.25"
              opacity="0.45"
            />
          )}
          <polyline points={curve((t) => sineAt(t, frequency, radians))} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
          {showAlias && (
            <polyline
              points={curve((t) => sineAt(t, alias, radians))}
              fill="none"
              stroke="var(--accent-2)"
              strokeWidth="2.5"
              strokeDasharray="7 5"
            />
          )}
          {samples.map((value, n) => (
            <g key={n}>
              <line x1={x(n / sampleRate)} x2={x(n / sampleRate)} y1={MID} y2={y(value)} stroke="var(--foreground)" opacity="0.25" />
              <circle
                cx={x(n / sampleRate)}
                cy={y(value)}
                r={n === sampleIndex ? 6 : 4}
                onClick={() => setSelectedSample(n)}
                className="cursor-pointer"
                fill="var(--foreground)"
                stroke="var(--surface)"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>
        <EndLabel y={y(originalEnd)} shift={originalShift} color="var(--accent)">{frequency} Hz</EndLabel>
        {showAlias && <EndLabel y={y(aliasEnd)} shift={aliasShift} color="var(--accent-2)">{Math.abs(alias)} Hz</EndLabel>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1" aria-live="polite">
        <p className="text-lg font-semibold text-[var(--foreground)]">
          <Verdict frequency={frequency} sampleRate={sampleRate} alias={alias} />
        </p>
        <p className={LABEL}>
          Nyquist {sampleRate / 2} Hz · {(sampleRate / frequency).toFixed(2)} samples per cycle
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Slider label="Sample rate" min={4} max={64} value={sampleRate} display={`${sampleRate} Hz`} onChange={(value) => update({ sampleRate: value })} />
        <Slider label="Signal frequency" min={1} max={20} value={frequency} display={`${frequency} Hz`} onChange={(value) => update({ frequency: value })} />
      </div>

      <Details summary="Advanced" className="mt-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <Slider label="Phase" min={0} max={360} value={phase} display={`${phase}°`} onChange={(value) => update({ phase: value })} />
          <div>
            <Slider label="Inspect sample" min={0} max={sampleRate} value={sampleIndex} onChange={setSelectedSample} />
            <p className="mt-2 font-mono text-xs tabular-nums text-[var(--muted)]">
              n = {sampleIndex} · t = {(sampleIndex / sampleRate).toFixed(4)} s · measured = {samples[sampleIndex].toFixed(4)} · alias ={" "}
              {sineAt(sampleIndex / sampleRate, alias, radians).toFixed(4)}
            </p>
          </div>
        </div>
        <p className="mt-5">
          The dashed wave is the alias frequency computed from the sample rate, not fitted to the dots. A negative alias
          frequency runs the sine backwards so its phase matches. The sinc reconstruction uses only the samples in this
          one-second window and treats the rest as zero, so it rings near the edges.
        </p>
      </Details>
    </DemoPage>
  );
}
