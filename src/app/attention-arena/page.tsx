"use client";

import { useMemo, useState } from "react";

import { Button, DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  MEMORY_CARDS,
  computeAttentionLookup,
  type AttributeQuery,
  type MemoryCard,
  type MemoryColor,
  type MemoryShape,
} from "./math";

const COLOR_COPY: Record<MemoryColor, { label: string; card: string; dot: string }> = {
  red: {
    label: "red",
    card: "border-rose-500/55 bg-rose-500/10",
    dot: "bg-rose-500",
  },
  blue: {
    label: "blue",
    card: "border-cyan-500/55 bg-cyan-500/10",
    dot: "bg-cyan-500",
  },
};

const SHAPE_COPY: Record<MemoryShape, string> = {
  circle: "circle",
  square: "square",
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function QueryChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? "primary" : "secondary"}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MemoryTile({
  card,
  weight,
  score,
  selected,
  onChoose,
}: {
  card: MemoryCard;
  weight: number;
  score: number;
  selected: boolean;
  onChoose: () => void;
}) {
  const color = COLOR_COPY[card.color];
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={selected}
      className={`relative overflow-hidden border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${selected ? `${color.card} ring-1 ring-foreground/30` : "border-[var(--line)] hover:border-foreground/60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-block h-3 w-3 ${card.shape === "circle" ? "rounded-full" : ""} ${color.dot}`} />
          <p className="mt-2 font-mono text-xs font-bold uppercase tracking-[0.12em]">{color.label} {SHAPE_COPY[card.shape]}</p>
        </div>
        <strong className="font-mono text-2xl tabular-nums">{card.value}</strong>
      </div>
      <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500">
        <span>{score} attributes match</span>
        <span className="text-foreground dark:text-neutral-100">read {percent(weight)}</span>
      </div>
      <span className={`absolute bottom-0 left-0 h-1 ${color.dot}`} style={{ width: `${Math.max(3, weight * 100)}%` }} />
    </button>
  );
}

export default function AttentionArenaPage() {
  const [query, setQuery] = useState<AttributeQuery>({ color: "red", shape: "circle" });
  const [focus, setFocus] = useState(1.5);
  const lookup = useMemo(() => computeAttentionLookup(query, focus), [focus, query]);
  const strongestIndex = lookup.weights.reduce(
    (best, weight, index) => (weight > lookup.weights[best] ? index : best),
    0,
  );
  const strongest = MEMORY_CARDS[strongestIndex];

  return (
    <DemoPage width="xl">
      <DemoHeader
        eyebrow="Transformer mechanics / attention as a soft lookup"
        title="Attention Arena"
        description="Question: when a query asks for a memory, how does attention decide what to read and how much of each value to carry forward?"
      />

      <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(17rem,0.56fr)_minmax(0,1.44fr)]">
        <DemoPanel title="Ask a query" description="Pick the two visible attributes you want the lookup to match." padding="md">
          <div className="space-y-5">
            <QueryChoice label="color" options={["red", "blue"]} value={query.color} onChange={(color) => setQuery((current) => ({ ...current, color }))} />
            <QueryChoice label="shape" options={["circle", "square"]} value={query.shape} onChange={(shape) => setQuery((current) => ({ ...current, shape }))} />
            <label className="block border-t border-[var(--line)] pt-5">
              <span className="flex items-baseline justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                <span>focus</span>
                <strong className="text-foreground dark:text-neutral-100">{focus.toFixed(1)}×</strong>
              </span>
              <input aria-label="Attention focus" className="mt-3 block w-full accent-foreground" type="range" min="0.25" max="4" step="0.05" value={focus} onChange={(event) => setFocus(Number(event.target.value))} />
              <span className="mt-2 flex justify-between text-xs text-neutral-500"><span>wide blend</span><span>sharp pick</span></span>
            </label>
          </div>
        </DemoPanel>

        <DemoPanel title="Read the matching memories" description="Each card has a visible key (color and shape) and a value payload. Click a card to use its attributes as the query." padding="md">
          <div className="grid gap-3 sm:grid-cols-2">
            {MEMORY_CARDS.map((card, index) => (
              <MemoryTile
                key={card.id}
                card={card}
                score={lookup.scores[index]}
                weight={lookup.weights[index]}
                selected={index === strongestIndex}
                onChoose={() => setQuery({ color: card.color, shape: card.shape })}
              />
            ))}
          </div>
          <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">weighted answer</p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{lookup.output.toFixed(2)}</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                The strongest read is <strong>{COLOR_COPY[strongest.color].label} {SHAPE_COPY[strongest.shape]}</strong>, carrying value <strong>{strongest.value}</strong> with weight <strong>{percent(lookup.weights[strongestIndex])}</strong>.
              </p>
            </div>
            <p className="max-w-44 border-l-2 border-foreground pl-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              Higher focus makes the best match dominate. Lower focus blends several partly relevant memories.
            </p>
          </div>
        </DemoPanel>
      </div>

      <DemoPanel title="Why this is attention" description="This toy makes the routing rule visible without pretending that words have meaning because of their spelling." padding="md" className="mt-6">
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          The query and each memory key are explicit four-bit feature vectors: red, blue, circle, square. Their dot product is the visible match count. Softmax turns those scores into read weights, then attention returns the weighted average of the card values.
        </p>
        <details className="mt-4 border-t border-[var(--line)] pt-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">Inspect the arithmetic</summary>
          <div className="mt-4 grid gap-3 font-mono text-sm sm:grid-cols-3">
            <div className="border border-[var(--line)] p-3"><span className="block text-[10px] uppercase tracking-[0.1em] text-neutral-500">query / key</span><span className="mt-1 block">[{lookup.queryVector.join(", ")}]</span></div>
            <div className="border border-[var(--line)] p-3"><span className="block text-[10px] uppercase tracking-[0.1em] text-neutral-500">scores</span><span className="mt-1 block">[{lookup.scores.join(", ")}]</span></div>
            <div className="border border-[var(--line)] p-3"><span className="block text-[10px] uppercase tracking-[0.1em] text-neutral-500">softmax weights</span><span className="mt-1 block">[{lookup.weights.map((weight) => weight.toFixed(2)).join(", ")}]</span></div>
          </div>
        </details>
      </DemoPanel>

      <DemoFootnote align="left">A real transformer learns its query, key, and value vectors from data. This compact toy keeps those vectors explicit so the read-and-mix mechanism stays inspectable.</DemoFootnote>
    </DemoPage>
  );
}
