"use client";

import { useMemo, useState } from "react";

import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";

import {
  classifyPoint,
  leaveOneOutAccuracy,
  makeDataset,
  type Dataset,
  type Example,
} from "./math";

const COLORS = ["#0891b2", "#c026d3"];
const RESOLUTION = 40;
const screen = (value: number) => 30 + (value + 1) * 240;

export default function DecisionBoundary() {
  const [dataset, setDataset] = useState<Dataset>("moons");
  const [examples, setExamples] = useState<Example[]>(() =>
    makeDataset("moons"),
  );
  const [k, setK] = useState(3);
  const [query, setQuery] = useState({ x: 0, y: 0 });
  const [label, setLabel] = useState<0 | 1>(0);
  const prediction = classifyPoint(query, examples, k);
  const accuracy = useMemo(
    () => leaveOneOutAccuracy(examples, k),
    [examples, k],
  );
  const cells = useMemo(
    () =>
      Array.from({ length: RESOLUTION ** 2 }, (_, index) => {
        const col = index % RESOLUTION;
        const row = Math.floor(index / RESOLUTION);
        const result = classifyPoint(
          {
            x: -1 + ((col + 0.5) * 2) / RESOLUTION,
            y: 1 - ((row + 0.5) * 2) / RESOLUTION,
          },
          examples,
          k,
        );
        return { col, row, result };
      }),
    [examples, k],
  );

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Machine learning · interactive lab"
        title="Decision Boundary"
        description="A classifier built from one rule: ask the nearest examples. Inspect its votes, change the neighborhood, and add a point to reshape the boundary."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {(["moons", "rings", "xor"] as const).map((id) => (
          <Button
            key={id}
            size="sm"
            variant={dataset === id ? "primary" : "secondary"}
            onClick={() => {
              setDataset(id);
              setExamples(makeDataset(id));
            }}
          >
            {id === "xor"
              ? "XOR"
              : id === "moons"
                ? "Two moons"
                : "Concentric rings"}
          </Button>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DemoPanel
          title="Inspect the neighborhood"
          description="Click the plot or use its arrow keys to move the crosshair. Lines connect the query to its voting neighbors."
        >
          <svg
            viewBox="0 0 540 540"
            className="w-full cursor-crosshair focus-visible:outline-2 focus-visible:outline-cyan-600"
            role="group"
            aria-label="Classifier plot. Use arrow keys to move the query."
            tabIndex={0}
            onClick={(event) => {
              const svg = event.currentTarget;
              const matrix = svg.getScreenCTM();
              if (!matrix) return;
              const point = new DOMPoint(
                event.clientX,
                event.clientY,
              ).matrixTransform(matrix.inverse());
              setQuery({
                x: Math.max(-1, Math.min(1, (point.x - 270) / 240)),
                y: Math.max(-1, Math.min(1, (270 - point.y) / 240)),
              });
            }}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              const step = event.shiftKey ? 0.1 : 0.025;
              setQuery((point) => ({
                x: Math.max(
                  -1,
                  Math.min(
                    1,
                    point.x +
                      (event.key === "ArrowRight"
                        ? step
                        : event.key === "ArrowLeft"
                          ? -step
                          : 0),
                  ),
                ),
                y: Math.max(
                  -1,
                  Math.min(
                    1,
                    point.y +
                      (event.key === "ArrowUp"
                        ? step
                        : event.key === "ArrowDown"
                          ? -step
                          : 0),
                  ),
                ),
              }));
            }}
          >
            {cells.map(
              ({ col, row, result }, i) =>
                result && (
                  <rect
                    key={i}
                    x={30 + col * 12}
                    y={30 + row * 12}
                    width="12.2"
                    height="12.2"
                    fill={COLORS[result.label]}
                    opacity={0.08 + Math.abs(result.fraction - 0.5) * 0.4}
                  />
                ),
            )}
            <path d="M30 270H510 M270 30V510" stroke="var(--line)" />
            {prediction?.neighbors.map((point) => (
              <line
                key={point.index}
                x1={screen(query.x)}
                y1={screen(-query.y)}
                x2={screen(point.x)}
                y2={screen(-point.y)}
                stroke="var(--foreground)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.55"
              />
            ))}
            {examples.map((point, i) =>
              point.label === 0 ? (
                <circle
                  key={i}
                  cx={screen(point.x)}
                  cy={screen(-point.y)}
                  r="5"
                  fill={COLORS[0]}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                />
              ) : (
                <rect
                  key={i}
                  x={screen(point.x) - 5}
                  y={screen(-point.y) - 5}
                  width="10"
                  height="10"
                  fill={COLORS[1]}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                />
              ),
            )}
            <circle
              cx={screen(query.x)}
              cy={screen(-query.y)}
              r="10"
              fill="var(--surface)"
              stroke="var(--foreground)"
              strokeWidth="2"
            />
            <path
              d={`M${screen(query.x) - 15} ${screen(-query.y)}h30 M${screen(query.x)} ${screen(-query.y) - 15}v30`}
              stroke="var(--foreground)"
              strokeWidth="2"
            />
            <text x="505" y="530" fill="currentColor" fontSize="12">
              x →
            </text>
            <text x="8" y="22" fill="currentColor" fontSize="12">
              y ↑
            </text>
          </svg>
          <p className="text-xs text-neutral-500">
            ● Cyan = class A · ■ Magenta = class B. Stronger shading means more
            neighbors agree; it is not a calibrated probability.
          </p>
        </DemoPanel>
        <div className="space-y-6">
          <DemoPanel title="The vote">
            <label className="block text-sm">
              Neighbors (k): <strong className="font-mono">{k}</strong>
              <input
                className="mt-3 w-full accent-cyan-600"
                type="range"
                min="1"
                max="15"
                step="2"
                value={k}
                onChange={(event) => setK(Number(event.target.value))}
              />
            </label>
            <div
              className="mt-5 border-t border-[var(--line)] pt-4"
              aria-live="polite"
            >
              <p className="text-2xl font-semibold">
                Class {prediction?.label === 0 ? "A" : "B"}
              </p>
              <p className="mt-2 text-sm">
                {
                  prediction?.neighbors.filter((point) => point.label === 0)
                    .length
                }{" "}
                votes for A ·{" "}
                {
                  prediction?.neighbors.filter((point) => point.label === 1)
                    .length
                }{" "}
                votes for B
              </p>
              <p className="mt-2 font-mono text-xs text-neutral-500">
                Query: ({query.x.toFixed(2)}, {query.y.toFixed(2)})
              </p>
            </div>
          </DemoPanel>
          <DemoPanel
            title="Change the evidence"
            description="Place the crosshair, choose a class, then add an example. Try planting class B inside a cyan region."
          >
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={label === 0 ? "primary" : "secondary"}
                aria-pressed={label === 0}
                onClick={() => setLabel(0)}
              >
                Class A
              </Button>
              <Button
                size="sm"
                variant={label === 1 ? "primary" : "secondary"}
                aria-pressed={label === 1}
                onClick={() => setLabel(1)}
              >
                Class B
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={examples.length >= 100}
                onClick={() => setExamples([...examples, { ...query, label }])}
              >
                Add at crosshair
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={examples.length <= 40}
                onClick={() => setExamples(examples.slice(0, -1))}
              >
                Undo addition
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setExamples(makeDataset(dataset))}
              >
                Reset points
              </Button>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              {examples.length} / 100 examples
            </p>
          </DemoPanel>
          <DemoPanel title="Does it generalize?">
            <p className="font-mono text-3xl">
              {accuracy === null ? "—" : `${(accuracy * 100).toFixed(1)}%`}
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              Leave-one-out accuracy: each example is classified using only the
              other points. This avoids the perfect training score k = 1 gets by
              looking up itself. It describes these synthetic examples, not
              performance on unseen real-world data.
            </p>
          </DemoPanel>
        </div>
      </div>
      <DemoFootnote>
        Euclidean distance on equally scaled axes. Fixed synthetic datasets; no
        model downloads or training service.
      </DemoFootnote>
    </DemoPage>
  );
}
