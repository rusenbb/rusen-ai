"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";

import {
  Button,
  DemoHeader,
  DemoPage,
  Details,
  Segmented,
  Slider,
  Stat,
} from "@/components/ui";

import {
  classifyPoint,
  leaveOneOutAccuracy,
  makeDataset,
  type Dataset,
  type Example,
  type Point,
} from "./math";
import NetworkInside from "./NetworkInside";
import { classificationAccuracy, createTinyNetworkTrainingTrace, predictTinyNetwork } from "./network";

const COLORS = ["var(--accent)", "var(--accent-2)"];
const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
const CLASS_NAMES = ["A", "B"] as const;
const RESOLUTION = 60;
const MAX_EXAMPLES = 100;
const CELL = 480 / RESOLUTION;
const screen = (value: number) => 30 + (value + 1) * 240;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

type Method = "knn" | "linear" | "tanh";
const METHODS = [
  { value: "knn", label: "k-NN" },
  { value: "linear", label: "Linear net" },
  { value: "tanh", label: "tanh net" },
] as const;
const EPOCHS = 1000;
const PLAYBACK_STEP = 25;
const PLAYBACK_MS = 60;

const DATASETS = [
  { value: "moons", label: "Moons" },
  { value: "rings", label: "Rings" },
  { value: "xor", label: "XOR" },
] as const;

export default function DecisionBoundary() {
  const [dataset, setDataset] = useState<Dataset>("moons");
  const [noise, setNoise] = useState(0);
  const [examples, setExamples] = useState<Example[]>(() => makeDataset("moons"));
  const [history, setHistory] = useState<Example[][]>([]);
  const [k, setK] = useState(3);
  const [query, setQuery] = useState<Point>({ x: 0, y: 0 });
  const [label, setLabel] = useState<0 | 1>(1);
  const [method, setMethod] = useState<Method>("knn");
  const [epoch, setEpoch] = useState(EPOCHS);
  const [playing, setPlaying] = useState(false);

  // A new method trains from step 0 in view; a data edit shows the retrained network at once.
  const showTrained = () => {
    setPlaying(false);
    setEpoch(EPOCHS);
  };
  const changeMethod = (next: Method) => {
    setMethod(next);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEpoch(next === "knn" || reduced ? EPOCHS : 0);
    setPlaying(next !== "knn" && !reduced);
  };
  const training = playing && epoch < EPOCHS;
  useEffect(() => {
    if (!training) return;
    const timer = window.setTimeout(() => setEpoch((value) => Math.min(EPOCHS, value + PLAYBACK_STEP)), PLAYBACK_MS);
    return () => window.clearTimeout(timer);
  }, [epoch, training]);

  const changeExamples = (next: Example[]) => {
    setHistory((previous) => [...previous.slice(-19), examples]);
    setExamples(next);
    showTrained();
  };
  const resetData = (kind: Dataset, amount: number) => {
    setExamples(makeDataset(kind, amount));
    setHistory([]);
    showTrained();
  };
  const addPoint = (point: Point) => {
    if (examples.length < MAX_EXAMPLES) changeExamples([...examples, { ...point, label }]);
  };

  const trace = useMemo(
    () => (method === "knn" ? null : createTinyNetworkTrainingTrace(examples, method, { epochs: EPOCHS })),
    [examples, method],
  );
  const network = trace ? trace[Math.min(epoch, trace.length - 1)] : null;
  /** Share of class B at a point: neighbour votes for k-NN, the output probability for a network. */
  const predict = useMemo(
    () =>
      (point: Point): { label: 0 | 1; fraction: number } | null => {
        if (!network) return classifyPoint(point, examples, k);
        if (examples.length === 0) return null;
        const fraction = predictTinyNetwork(network, point);
        return { label: fraction >= 0.5 ? 1 : 0, fraction };
      },
    [examples, k, network],
  );

  const prediction = classifyPoint(query, examples, k);
  const votesA = prediction?.neighbors.filter((point) => point.label === 0).length ?? 0;
  const shown = predict(query);
  const accuracy = useMemo(() => {
    if (examples.length < 2) return null;
    return network ? classificationAccuracy(network, examples) : leaveOneOutAccuracy(examples, k);
  }, [examples, k, network]);
  const cells = useMemo(
    () =>
      Array.from({ length: RESOLUTION ** 2 }, (_, index) => {
        const col = index % RESOLUTION;
        const row = Math.floor(index / RESOLUTION);
        const result = predict({ x: -1 + ((col + 0.5) * 2) / RESOLUTION, y: 1 - ((row + 0.5) * 2) / RESOLUTION });
        return { col, row, result };
      }),
    [predict],
  );

  const toPlot = (event: PointerEvent<SVGSVGElement>): Point | null => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: clamp((point.x - 270) / 240), y: clamp((270 - point.y) / 240) };
  };

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Classification"
        title="Decision Boundary"
        description="Click the plot to drop a point, then see how nearest neighbours and two small neural networks split the plane."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Dataset"
              options={DATASETS}
              value={dataset}
              onChange={(id) => {
                setDataset(id);
                resetData(id, noise);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]">Drop</span>
              <Segmented
                label="Class of the next point"
                options={[
                  { value: "0", label: <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />A</span> },
                  { value: "1", label: <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-accent-2" />B</span> },
                ]}
                value={String(label) as "0" | "1"}
                onChange={(value) => setLabel(value === "0" ? 0 : 1)}
              />
            </div>
          </div>

          <svg
            viewBox="0 0 540 540"
            style={{ width: "min(100%, max(20rem, calc(100svh - 20rem)))" }}
            className="mx-auto block aspect-square cursor-crosshair touch-none border border-[var(--line)] bg-[var(--surface)] focus:outline-none focus-visible:outline-1 focus-visible:outline-[var(--line-strong)]"
            role="group"
            aria-label="Classifier plot. Arrow keys move the crosshair, Enter drops a point."
            tabIndex={0}
            onPointerMove={(event) => {
              const point = toPlot(event);
              if (point) setQuery(point);
            }}
            onPointerDown={(event) => {
              const point = toPlot(event);
              if (!point) return;
              setQuery(point);
              addPoint(point);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                addPoint(query);
                return;
              }
              const moves: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, 1],
                ArrowDown: [0, -1],
              };
              const move = moves[event.key];
              if (!move) return;
              event.preventDefault();
              const step = event.shiftKey ? 0.1 : 0.025;
              setQuery((point) => ({ x: clamp(point.x + move[0] * step), y: clamp(point.y + move[1] * step) }));
            }}
          >
            {cells.map(
              ({ col, row, result }, i) =>
                result && (
                  <rect
                    key={i}
                    x={30 + col * CELL}
                    y={30 + row * CELL}
                    width={CELL}
                    height={CELL}
                    shapeRendering="crispEdges"
                    fill={COLORS[result.label]}
                    opacity={0.06 + Math.abs(result.fraction - 0.5) * 0.36}
                  />
                ),
            )}
            {method === "knn" && prediction?.neighbors.map((point) => (
              <line
                key={point.index}
                x1={screen(query.x)}
                y1={screen(-query.y)}
                x2={screen(point.x)}
                y2={screen(-point.y)}
                stroke="var(--foreground)"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.5"
                pointerEvents="none"
              />
            ))}
            {examples.map((point, i) => {
              const remove = (event: PointerEvent) => {
                event.stopPropagation();
                changeExamples(examples.filter((_, index) => index !== i));
              };
              const shared = {
                fill: COLORS[point.label],
                stroke: "var(--surface)",
                strokeWidth: 1.5,
                className: "cursor-pointer",
                onPointerDown: remove,
              };
              return point.label === 0 ? (
                <circle key={i} cx={screen(point.x)} cy={screen(-point.y)} r="5.5" {...shared}>
                  <title>Click to remove</title>
                </circle>
              ) : (
                <rect key={i} x={screen(point.x) - 5} y={screen(-point.y) - 5} width="10" height="10" {...shared}>
                  <title>Click to remove</title>
                </rect>
              );
            })}
            <g pointerEvents="none">
              <circle cx={screen(query.x)} cy={screen(-query.y)} r="9" fill="none" stroke="var(--foreground)" strokeWidth="1.5" />
              <path
                d={`M${screen(query.x) - 14} ${screen(-query.y)}h28 M${screen(query.x)} ${screen(-query.y) - 14}v28`}
                stroke="var(--foreground)"
                strokeWidth="1.5"
              />
            </g>
          </svg>
          <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]">
            Click a point to remove it · {examples.length} / {MAX_EXAMPLES} points
          </p>
        </div>

        <aside className="space-y-7">
          <Segmented label="Method" options={METHODS} value={method} onChange={changeMethod} />
          <div aria-live="polite">
            <Stat
              size="lg"
              label="Under the crosshair"
              value={shown ? `Class ${CLASS_NAMES[shown.label]}` : "—"}
              note={
                !shown
                  ? "Add a point to classify"
                  : method === "knn"
                    ? `${votesA} of ${k} neighbours vote A, ${k - votesA} vote B`
                    : `The network gives B a ${Math.round(shown.fraction * 100)}% chance`
              }
            />
          </div>
          {method === "knn" ? (
            <Slider label="Neighbours (k)" min={1} max={15} step={2} value={k} onChange={setK} />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className={`tabular-nums ${LABEL}`}>
                Step {Math.min(epoch, EPOCHS).toLocaleString("en-US")} / {EPOCHS.toLocaleString("en-US")}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={training}
                onClick={() => {
                  setEpoch(0);
                  setPlaying(true);
                }}
              >
                Replay
              </Button>
            </div>
          )}
          <Slider
            label="Noise"
            min={0}
            max={0.65}
            step={0.05}
            value={noise}
            display={noise.toFixed(2)}
            onChange={(value) => {
              setNoise(value);
              resetData(dataset, value);
            }}
          />
          <Stat
            label="Accuracy"
            value={accuracy === null ? "—" : `${(accuracy * 100).toFixed(1)}%`}
            note={method === "knn" ? "Each point predicted from the others" : "On the points it trained on"}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!history.length}
              onClick={() => {
                setExamples(history[history.length - 1]);
                setHistory(history.slice(0, -1));
              }}
            >
              Undo
            </Button>
            <Button size="sm" onClick={() => resetData(dataset, noise)}>
              Reset
            </Button>
          </div>
          <Details summary="How it decides">
            {method === "knn" ? (
              <p>
                A point takes the majority class of its k closest points by straight-line distance. Stronger shading
                means the neighbours agree more. The accuracy leaves each point out and predicts it from the rest, so
                k = 1 cannot score itself.
              </p>
            ) : (
              <p>
                Both networks have 2 inputs, 5 hidden units and 1 output, start from the same weights and take {EPOCHS}{" "}
                gradient steps on your points. A stack of linear layers is still one straight cut: σ(W₂(W₁x + b₁) + b₂).
                The tanh network computes σ(W₂ tanh(W₁x + b₁) + b₂), so each hidden unit becomes a soft on or off
                region and the output can bend. Stronger shading means a more confident output.
              </p>
            )}
          </Details>
        </aside>
      </div>

      {method === "tanh" && network && !training ? (
        <Details summary="Inside the tanh network" className="mt-8">
          <NetworkInside network={network} examples={examples} />
        </Details>
      ) : null}
    </DemoPage>
  );
}
