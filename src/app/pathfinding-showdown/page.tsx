"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  PATHFINDING_PRESETS,
  SEARCH_ALGORITHMS,
  cellKey,
  createDefaultGrid,
  moveEndpoint,
  sameCell,
  traceSearch,
  updateTerrain,
  type Cell,
  type PathGrid,
  type SearchAlgorithm,
  type SearchDecision,
  type SearchFrame,
  type Terrain,
} from "./algorithms";

type EditTool = Terrain | "start" | "goal";
type ScenarioId = (typeof PATHFINDING_PRESETS)[number]["id"] | "custom";

const TOOL_COPY: Array<{ id: EditTool; label: string; hint: string }> = [
  { id: "wall", label: "Wall", hint: "Block a cell" },
  { id: "mud", label: "Mud x5", hint: "Make a cell cost five" },
  { id: "empty", label: "Erase", hint: "Clear terrain" },
  { id: "start", label: "Move start", hint: "Place the green marker" },
  { id: "goal", label: "Move goal", hint: "Place the coral marker" },
];

const ALGORITHM_ACCENTS: Record<SearchAlgorithm, { dot: string; text: string; row: string }> = {
  bfs: {
    dot: "bg-cyan-500",
    text: "text-cyan-700 dark:text-cyan-300",
    row: "bg-cyan-500/[0.06]",
  },
  dijkstra: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    row: "bg-amber-500/[0.07]",
  },
  greedy: {
    dot: "bg-fuchsia-500",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    row: "bg-fuchsia-500/[0.06]",
  },
  astar: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    row: "bg-emerald-500/[0.06]",
  },
};

function clearGrid(): PathGrid {
  const template = createDefaultGrid();
  return {
    ...template,
    cells: template.cells.map((row) => row.map(() => "empty" as Terrain)),
  };
}

function terrainClass(terrain: Terrain): string {
  if (terrain === "wall") return "bg-neutral-800 dark:bg-neutral-200";
  if (terrain === "mud") return "bg-amber-500/75";
  return "bg-[color-mix(in_srgb,var(--background)_96%,var(--foreground)_4%)]";
}

function cellLabel(cell: Cell): string {
  return `[${cell.row + 1}, ${cell.col + 1}]`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function Grid({
  grid,
  frame,
  path,
  onCellClick,
}: {
  grid: PathGrid;
  frame?: SearchFrame;
  path?: Cell[];
  onCellClick?: (cell: Cell) => void;
}) {
  const settled = new Set(frame?.settled.map(cellKey) ?? []);
  const frontier = new Set(frame?.frontier.map((entry) => cellKey(entry.cell)) ?? []);
  const newlyOpened = new Set(frame?.newlyOpened.map(cellKey) ?? []);
  const route = new Set(path?.map(cellKey) ?? []);
  const currentKey = frame ? cellKey(frame.current) : null;

  return (
    <div
      className="grid select-none overflow-hidden border border-[var(--line)] bg-[var(--line)] p-px shadow-[0_14px_42px_rgba(0,0,0,0.08)]"
      style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
      role={onCellClick ? "grid" : "img"}
      aria-label={onCellClick ? "Editable pathfinding map" : "Search trace map"}
    >
      {grid.cells.flatMap((row, rowIndex) =>
        row.map((terrain, columnIndex) => {
          const cell = { row: rowIndex, col: columnIndex };
          const key = cellKey(cell);
          const start = sameCell(cell, grid.start);
          const goal = sameCell(cell, grid.goal);
          const current = currentKey === key;
          const searched = settled.has(key);
          const queued = frontier.has(key);
          const fresh = newlyOpened.has(key);
          const onRoute = route.has(key);

          let classes = terrainClass(terrain);
          if (!start && !goal) {
            if (onRoute) classes = "bg-fuchsia-600 text-white dark:bg-fuchsia-400 dark:text-fuchsia-950";
            else if (queued) classes = "bg-sky-400/85 dark:bg-sky-500/75";
            else if (searched) classes = "bg-cyan-500/75 dark:bg-cyan-500/70";
          }
          if (start) classes = "bg-emerald-500 text-emerald-950";
          if (goal) classes = "bg-rose-500 text-rose-950";

          const state = current
            ? "current decision"
            : onRoute
              ? "final route"
              : queued
                ? "open frontier"
                : searched
                  ? "settled"
                  : terrain === "mud"
                    ? "mud, cost five"
                    : terrain;
          const sharedClassName = `relative aspect-square min-w-0 select-none ${classes}`;
          const markers = (
            <>
              {current ? <span aria-hidden className="pointer-events-none absolute inset-[14%] border-2 border-amber-200 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" /> : null}
              {fresh && !current ? <span aria-hidden className="pointer-events-none absolute inset-[19%] border border-sky-100/90" /> : null}
              {start ? <span className="relative z-10 text-[8px] font-black sm:text-[10px]">S</span> : null}
              {goal ? <span className="relative z-10 text-[8px] font-black sm:text-[10px]">G</span> : null}
            </>
          );

          if (onCellClick) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onCellClick(cell)}
                className={`${sharedClassName} transition-colors hover:brightness-110 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground`}
                aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${state}`}
              >
                {markers}
              </button>
            );
          }

          return (
            <div key={key} className={sharedClassName} aria-label={state}>
              {markers}
            </div>
          );
        }),
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function decisionReason(algorithm: SearchAlgorithm, decision: SearchDecision): string {
  if (algorithm === "bfs") {
    return `It has the oldest queue ticket (#${decision.order + 1}), so FIFO expands it before newer frontier cells.`;
  }
  if (algorithm === "dijkstra") {
    return `Its known travel cost is the smallest: g = ${formatNumber(decision.g)}.`;
  }
  if (algorithm === "greedy") {
    return `It looks closest to the goal: h = ${formatNumber(decision.h)}.`;
  }
  return `Its combined score is smallest: f = g + h = ${formatNumber(decision.g)} + ${formatNumber(decision.h)} = ${formatNumber(decision.f)}.`;
}

function priorityText(algorithm: SearchAlgorithm, decision: SearchDecision): string {
  if (algorithm === "bfs") return `ticket #${decision.order + 1}`;
  if (algorithm === "dijkstra") return `g ${formatNumber(decision.g)}`;
  if (algorithm === "greedy") return `h ${formatNumber(decision.h)}`;
  return `f ${formatNumber(decision.f)}`;
}

export default function PathfindingShowdownPage() {
  const [grid, setGrid] = useState<PathGrid>(() => createDefaultGrid());
  const [tool, setTool] = useState<EditTool>("wall");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("mud-shortcut");
  const [algorithm, setAlgorithm] = useState<SearchAlgorithm>("bfs");
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const activePreset = PATHFINDING_PRESETS.find((preset) => preset.id === scenarioId);
  const traces = useMemo(
    () =>
      SEARCH_ALGORITHMS.map((definition) => ({
        definition,
        trace: traceSearch(grid, definition.id),
      })),
    [grid],
  );
  const active = traces.find(({ definition }) => definition.id === algorithm) ?? traces[0];
  const activeFrame = stepIndex >= 0 ? active.trace.frames[stepIndex] : undefined;
  const lastStep = active.trace.frames.length - 1;
  const finished = stepIndex >= lastStep;
  const showPath = finished && active.trace.found ? active.trace.path : undefined;
  const scenarioLabel = activePreset?.label ?? "Custom map";
  const scenarioDescription = activePreset?.description ?? "Your edits changed the original scenario.";
  const scenarioLesson = activePreset?.lesson ?? "Switch between the algorithms to see which objective your terrain rewards.";
  const status = stepIndex < 0
    ? "Ready to search"
    : finished
      ? active.trace.found
        ? "Goal reached"
        : "No route"
      : `Step ${stepIndex + 1} of ${active.trace.frames.length}`;

  const resetTrace = () => {
    setIsPlaying(false);
    setStepIndex(-1);
  };

  const stepTrace = () => {
    setIsPlaying(false);
    setStepIndex((current) => Math.min(lastStep, current + 1));
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setStepIndex((current) => (current < 0 || current >= lastStep ? 0 : current));
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || stepIndex >= lastStep) return;

    const timer = window.setTimeout(() => {
      const nextStep = Math.min(lastStep, stepIndex + 1);
      setStepIndex(nextStep);
      if (nextStep >= lastStep) setIsPlaying(false);
    }, 340);

    return () => window.clearTimeout(timer);
  }, [isPlaying, lastStep, stepIndex]);

  const editCell = (cell: Cell) => {
    resetTrace();
    setScenarioId("custom");
    setGrid((current) => {
      if (tool === "start" || tool === "goal") return moveEndpoint(current, tool, cell);
      return updateTerrain(current, cell, tool);
    });
  };

  const loadPreset = (presetId: Exclude<ScenarioId, "custom">) => {
    const preset = PATHFINDING_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) return;

    resetTrace();
    setEditorOpen(false);
    setScenarioId(preset.id);
    setGrid(preset.createGrid());
  };

  const chooseAlgorithm = (next: SearchAlgorithm) => {
    resetTrace();
    setAlgorithm(next);
  };

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Algorithms / see one decision at a time"
        title="Pathfinding Showdown"
        description="A search algorithm does not see the route in advance. Pick one rule, then step through every frontier decision on the same map before comparing its final tradeoff."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)] lg:items-start">
        <DemoPanel title="Choose the question and the solver" description="The map stays put while the decision rule changes. Click an algorithm, then inspect its full trace.">
          <div className="space-y-5">
            <div className="grid gap-4 border-b border-[var(--line)] pb-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Scenario</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Pathfinding scenarios">
                  {PATHFINDING_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      size="sm"
                      variant={scenarioId === preset.id ? "primary" : "secondary"}
                      onClick={() => loadPreset(preset.id)}
                      aria-pressed={scenarioId === preset.id}
                      title={preset.description}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Decision rule</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Pathfinding algorithms">
                  {SEARCH_ALGORITHMS.map((definition) => (
                    <Button
                      key={definition.id}
                      size="sm"
                      variant={algorithm === definition.id ? "primary" : "secondary"}
                      onClick={() => chooseAlgorithm(definition.id)}
                      aria-pressed={algorithm === definition.id}
                      title={definition.decisionRule}
                    >
                      {definition.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-l-2 border-foreground bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] px-4 py-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em]">{scenarioLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{scenarioDescription}</p>
              <p className="mt-2 text-sm leading-relaxed">{scenarioLesson}</p>
            </div>

            <Grid grid={grid} frame={activeFrame} path={showPath} onCellClick={editorOpen ? editCell : undefined} />

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-[var(--line)] py-4 text-xs font-mono uppercase tracking-[0.08em] text-neutral-600 dark:text-neutral-400 sm:grid-cols-3">
              <span className="flex items-center gap-2"><i className="size-3 bg-emerald-500" />Start</span>
              <span className="flex items-center gap-2"><i className="size-3 bg-rose-500" />Goal</span>
              <span className="flex items-center gap-2"><i className="size-3 border-2 border-amber-300 bg-neutral-700" />Current</span>
              <span className="flex items-center gap-2"><i className="size-3 bg-sky-400" />Frontier</span>
              <span className="flex items-center gap-2"><i className="size-3 bg-cyan-500" />Settled</span>
              <span className="flex items-center gap-2"><i className="size-3 bg-fuchsia-600" />Final route</span>
              <span className="flex items-center gap-2"><i className="size-3 bg-amber-500" />Mud x5</span>
              <span className="flex items-center gap-2"><i className="size-3 bg-neutral-800 dark:bg-neutral-200" />Wall</span>
            </div>

            <details
              open={editorOpen}
              onToggle={(event) => setEditorOpen(event.currentTarget.open)}
              className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)]"
            >
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold marker:text-neutral-500">Make your own map</summary>
              <div className="border-t border-[var(--line)] px-4 py-4">
                <p className="mb-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">With this panel open, click the main board to paint. Each edit rewinds the trace.</p>
                <div className="flex flex-wrap gap-2">
                  {TOOL_COPY.map((item) => (
                    <Button
                      key={item.id}
                      size="sm"
                      variant={tool === item.id ? "primary" : "secondary"}
                      onClick={() => setTool(item.id)}
                      title={item.hint}
                      aria-pressed={tool === item.id}
                    >
                      {item.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetTrace();
                      setScenarioId("custom");
                      setGrid(clearGrid());
                    }}
                  >
                    Clear map
                  </Button>
                </div>
              </div>
            </details>
          </div>
        </DemoPanel>

        <DemoPanel title="Play and inspect the trace" description="The controls stay next to the board. Pause or scrub at any step to read the exact rule at work." className="lg:sticky lg:top-4">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Active solver</p>
                <div className="mt-2 flex items-center gap-2">
                  <i className={`size-2 ${ALGORITHM_ACCENTS[algorithm].dot}`} />
                  <p className={`font-mono text-lg font-bold ${ALGORITHM_ACCENTS[algorithm].text}`}>{active.definition.label}</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{active.definition.decisionRule}</p>
              </div>
              <span className="shrink-0 border border-[var(--line)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-600 dark:text-neutral-300">{status}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={resetTrace}>Reset</Button>
              <Button size="sm" variant="secondary" onClick={stepTrace} disabled={finished}>Step</Button>
              <Button size="sm" onClick={togglePlayback} disabled={lastStep < 0}>
                {isPlaying ? "Pause" : finished ? "Play again" : stepIndex < 0 ? "Start search" : "Play"}
              </Button>
            </div>

            <label className="block border-y border-[var(--line)] py-4">
              <span className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.12em]">
                <span>Trace position</span>
                <strong>{stepIndex < 0 ? "not started" : `${stepIndex + 1} / ${active.trace.frames.length}`}</strong>
              </span>
              <input
                aria-label="Search trace position"
                className="mt-3 w-full accent-foreground"
                type="range"
                min={-1}
                max={lastStep}
                step={1}
                value={stepIndex}
                onChange={(event) => {
                  setIsPlaying(false);
                  setStepIndex(Number(event.target.value));
                }}
              />
              <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">Every notch is one settled cell. The sky cells are still waiting in the frontier.</p>
            </label>

            {activeFrame ? (
              <div className="space-y-4">
                <div className="border-l-2 border-amber-400 bg-amber-500/[0.07] px-4 py-3">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.12em]">Step {activeFrame.step + 1}: chose {cellLabel(activeFrame.current)}</p>
                  <p className="mt-2 text-sm leading-relaxed">{decisionReason(algorithm, activeFrame.decision)}</p>
                </div>

                {algorithm === "bfs" ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric label="moves so far" value={formatNumber(activeFrame.decision.g)} />
                    <Metric label="queue ticket" value={`#${activeFrame.decision.order + 1}`} />
                    <Metric label="frontier now" value={activeFrame.frontier.length} />
                  </div>
                ) : algorithm === "astar" ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric label="cost g" value={formatNumber(activeFrame.decision.g)} />
                    <Metric label="distance h" value={formatNumber(activeFrame.decision.h)} />
                    <Metric label="total f" value={formatNumber(activeFrame.decision.f)} />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric label="cost g" value={formatNumber(activeFrame.decision.g)} />
                    <Metric label="distance h" value={formatNumber(activeFrame.decision.h)} />
                    <Metric label="frontier now" value={activeFrame.frontier.length} />
                  </div>
                )}

                <div className="border border-[var(--line)] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500 dark:text-neutral-400">What changed on this step</p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                    {finished && active.trace.found
                      ? `The goal ends this search. ${activeFrame.frontier.length} frontier cell${activeFrame.frontier.length === 1 ? " was" : "s were"} still waiting, so they were not expanded.`
                      : activeFrame.newlyOpened.length > 0
                      ? `Opened or improved: ${activeFrame.newlyOpened.map(cellLabel).join(", ")}.`
                      : "No new frontier cells were opened on this step."}
                  </p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500 dark:text-neutral-400">{finished && active.trace.found ? "Unexpanded frontier" : "Next in the frontier"}</p>
                  {activeFrame.frontier.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeFrame.frontier.slice(0, 4).map((entry) => (
                        <span key={cellKey(entry.cell)} className="border border-[var(--line)] px-2 py-1 font-mono text-xs tabular-nums">
                          {cellLabel(entry.cell)} <span className="text-neutral-500 dark:text-neutral-400">{priorityText(algorithm, entry)}</span>
                        </span>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">The frontier is empty.</p>}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_2%,transparent)] p-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                Press <strong className="text-foreground">Step</strong> once. The board will show the selected cell, the newly opened neighbors, and the frontier that remains.
              </div>
            )}
          </div>
        </DemoPanel>
      </div>

      <section className="mt-5" aria-labelledby="comparison-title">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Compare finished runs</p>
            <h2 id="comparison-title" className="mt-1 text-2xl font-bold">One map, four outcomes</h2>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 sm:text-right">Click a solver name to load its complete trace into the board above.</p>
        </div>

        <div className="overflow-x-auto border border-[var(--line)]">
          <table className="min-w-[44rem] w-full border-collapse text-left text-sm">
            <thead className="bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-inherit">Solver</th>
                <th className="px-4 py-3 font-inherit">Rule</th>
                <th className="px-4 py-3 text-right font-inherit">Checked</th>
                <th className="px-4 py-3 text-right font-inherit">Moves</th>
                <th className="px-4 py-3 text-right font-inherit">Route cost</th>
                <th className="px-4 py-3 text-right font-inherit">Status</th>
              </tr>
            </thead>
            <tbody>
              {traces.map(({ definition, trace }) => {
                const selected = definition.id === algorithm;
                const accent = ALGORITHM_ACCENTS[definition.id];
                const moves = trace.path.length > 0 ? trace.path.length - 1 : "none";

                return (
                  <tr key={definition.id} className={`border-t border-[var(--line)] ${selected ? accent.row : ""}`}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => chooseAlgorithm(definition.id)}
                        className={`flex items-center gap-2 font-mono font-bold transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${accent.text}`}
                        aria-pressed={selected}
                      >
                        <i className={`size-2 ${accent.dot}`} />{definition.label}
                      </button>
                    </td>
                    <td className="max-w-72 px-4 py-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{definition.decisionRule}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{trace.visited.length}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{moves}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{trace.cost ?? "none"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs uppercase tracking-[0.08em]">{trace.found ? "found" : "no route"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <DemoFootnote>
        Costs are entered-cell costs: empty = 1 and mud = 5. BFS guarantees fewest moves only when each move costs the same. Dijkstra and A* guarantee a cheapest route here because the Manhattan estimate never overstates the remaining empty-cell cost.
      </DemoFootnote>
    </DemoPage>
  );
}
