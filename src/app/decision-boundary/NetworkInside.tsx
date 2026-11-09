"use client";

import { useMemo, useState } from "react";

import { Segmented, Slider, Stat } from "@/components/ui";

import type { Example } from "./math";
import {
  classificationAccuracyWithHiddenCount,
  inspectHiddenLayer,
  predictTinyNetworkWithHiddenCount,
  type TinyNetwork,
} from "./network";

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
const GRID = 24;
const svg = (value: number) => value.toFixed(3);
/** Opaque mix of a colour into the surface, so neighbouring cells never show seams. */
const tint = (colour: string, amount: number) => `color-mix(in srgb, ${colour} ${amount.toFixed(1)}%, var(--surface))`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function cellCentre(index: number) {
  const row = Math.floor(index / GRID);
  const column = index % GRID;
  return { row, column, x: -1 + ((column + 0.5) / GRID) * 2, y: 1 - ((row + 0.5) / GRID) * 2 };
}

function Cells({ cells, label }: { cells: Array<{ row: number; column: number; fill: string }>; label: string }) {
  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full border border-[var(--line)] bg-[var(--surface)]" role="img" aria-label={label}>
      {cells.map((cell) => (
        <rect
          key={`${cell.row}-${cell.column}`}
          x={svg((cell.column / GRID) * 100)}
          y={svg((cell.row / GRID) * 100)}
          width={svg(100 / GRID + 0.05)}
          height={svg(100 / GRID + 0.05)}
          shapeRendering="crispEdges"
          style={{ fill: cell.fill }}
        />
      ))}
    </svg>
  );
}

function HiddenUnitMap({ network, unit, transformed }: { network: TinyNetwork; unit: number; transformed: boolean }) {
  const { cells, low, high } = useMemo(() => {
    const samples = Array.from({ length: GRID * GRID }, (_, index) => {
      const cell = cellCentre(index);
      const values = inspectHiddenLayer(network, cell);
      return { ...cell, raw: transformed ? values.activations[unit] ?? 0 : values.preActivations[unit] ?? 0 };
    });
    const raws = samples.map((sample) => sample.raw);
    // The raw score is unbounded, so it gets its own linear scale: the largest magnitude on the grid is full colour.
    const scale = transformed ? 1 : Math.max(...raws.map(Math.abs), 1e-9);
    return {
      cells: samples.map((sample) => {
        const value = sample.raw / scale;
        return { ...sample, fill: tint(value >= 0 ? "var(--accent-2)" : "var(--accent)", Math.abs(value) * 75) };
      }),
      low: Math.min(...raws),
      high: Math.max(...raws),
    };
  }, [network, transformed, unit]);

  return (
    <>
      <Cells cells={cells} label={transformed ? "Hidden unit after tanh" : "Hidden unit before tanh"} />
      <p className={`mt-1.5 tabular-nums ${LABEL}`}>
        {low.toFixed(1)} to {high.toFixed(1)}
      </p>
    </>
  );
}

function SubsetMap({ network, count }: { network: TinyNetwork; count: number }) {
  const cells = useMemo(
    () =>
      Array.from({ length: GRID * GRID }, (_, index) => {
        const cell = cellCentre(index);
        const probability = predictTinyNetworkWithHiddenCount(network, cell, count);
        return { ...cell, fill: tint(probability >= 0.5 ? "var(--accent-2)" : "var(--accent)", 8 + Math.abs(probability - 0.5) * 50) };
      }),
    [count, network],
  );
  return <Cells cells={cells} label={`Network with its first ${count} hidden units`} />;
}

/** The trained tanh network taken apart: one hidden unit before and after tanh, and the vote of a few units. */
export default function NetworkInside({ network, examples }: { network: TinyNetwork; examples: Example[] }) {
  const units = network.w1.length;
  const [unit, setUnit] = useState(0);
  const [count, setCount] = useState(units);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className={LABEL}>One hidden unit, before and after tanh</span>
          <Segmented
            label="Hidden unit"
            options={network.w1.map((_, index) => ({ value: String(index), label: `Unit ${index + 1}` }))}
            value={String(unit)}
            onChange={(value) => setUnit(Number(value))}
          />
        </div>
        <div className="grid max-w-xl grid-cols-2 gap-4">
          <figure>
            <figcaption className={`mb-2 ${LABEL}`}>Before: a straight ramp</figcaption>
            <HiddenUnitMap network={network} unit={unit} transformed={false} />
          </figure>
          <figure>
            <figcaption className={`mb-2 ${LABEL}`}>After tanh: flat at ±1</figcaption>
            <HiddenUnitMap network={network} unit={unit} transformed />
          </figure>
        </div>
      </div>
      <div className="grid max-w-xl gap-4 sm:grid-cols-[1fr_14rem] sm:items-end">
        <div className="space-y-4">
          <Slider
            label="Hidden units in the vote"
            min={1}
            max={units}
            value={count}
            display={`${count} / ${units}`}
            onChange={setCount}
          />
          <Stat
            label="Accuracy on the training points"
            value={percent(classificationAccuracyWithHiddenCount(network, examples, count))}
            note={`The trained network using only its first ${count} hidden unit${count === 1 ? "" : "s"}.`}
          />
        </div>
        <SubsetMap network={network} count={count} />
      </div>
    </div>
  );
}
