"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, DemoHeader, DemoPage, Details, Segmented, Slider } from "@/components/ui";

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
  type SearchTrace,
  type Terrain,
} from "./algorithms";

type EditTool = Terrain | "start" | "goal";
type ScenarioId = (typeof PATHFINDING_PRESETS)[number]["id"] | "custom";
type Mode = "race" | "inspect";
type Run = { definition: (typeof SEARCH_ALGORITHMS)[number]; trace: SearchTrace };

const RACE_TICK_MS = 45;
const INSPECT_TICK_MS = 340;
const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

const TOOLS: Array<{ value: EditTool; label: string }> = [
  { value: "wall", label: "Wall" },
  { value: "mud", label: "Mud" },
  { value: "empty", label: "Erase" },
  { value: "start", label: "Start" },
  { value: "goal", label: "Goal" },
];

const COLORS = {
  empty: "var(--surface)",
  wall: "var(--line-strong)",
  mud: "color-mix(in srgb, var(--accent-2) 45%, var(--surface))",
  settled: "color-mix(in srgb, var(--accent) 22%, var(--surface))",
  frontier: "color-mix(in srgb, var(--accent) 50%, var(--surface))",
  route: "var(--accent)",
};

function clearGrid(): PathGrid {
  const template = createDefaultGrid();
  return { ...template, cells: template.cells.map((row) => row.map(() => "empty" as Terrain)) };
}

function cellLabel(cell: Cell): string {
  return `[${cell.row + 1}, ${cell.col + 1}]`;
}

function frameAt(trace: SearchTrace, step: number): SearchFrame | undefined {
  if (step < 0 || trace.frames.length === 0) return undefined;
  return trace.frames[Math.min(step, trace.frames.length - 1)];
}

function joinNames(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

/** One sentence built from the finished runs, so the copy follows the map. */
function takeaway(runs: Run[]): string {
  const found = runs.filter(({ trace }) => trace.found);
  if (found.length === 0) return "No solver can reach the goal on this map.";
  const fewest = Math.min(...found.map(({ trace }) => trace.visited.length));
  const cheapest = Math.min(...found.map(({ trace }) => trace.cost ?? Infinity));
  const quick = found.filter(({ trace }) => trace.visited.length === fewest);
  const quickNames = joinNames(quick.map(({ definition }) => definition.label));
  const quickCost = quick[0].trace.cost ?? 0;
  if (quickCost === cheapest) {
    return `${quickNames} checked the fewest cells (${fewest}) and still found the cheapest route (cost ${cheapest}).`;
  }
  const cheapRuns = found.filter(({ trace }) => trace.cost === cheapest);
  const leastWork = Math.min(...cheapRuns.map(({ trace }) => trace.visited.length));
  const best = cheapRuns.filter(({ trace }) => trace.visited.length === leastWork);
  return `${quickNames} checked the fewest cells (${fewest}) but paid ${quickCost}. ${joinNames(best.map(({ definition }) => definition.label))} found the cheapest route (${cheapest}) after checking ${leastWork}.`;
}

function Board({
  grid,
  frame,
  path,
  size,
  onCellClick,
  label,
}: {
  grid: PathGrid;
  frame?: SearchFrame;
  path?: Cell[];
  size: "sm" | "lg";
  onCellClick?: (cell: Cell) => void;
  label: string;
}) {
  const settled = new Set(frame?.settled.map(cellKey) ?? []);
  const frontier = new Set(frame?.frontier.map((entry) => cellKey(entry.cell)) ?? []);
  const route = new Set(path?.map(cellKey) ?? []);
  const currentKey = frame && !path ? cellKey(frame.current) : null;
  const letter = size === "lg" ? "text-[0.7rem]" : "text-[0.55rem]";

  return (
    <div
      className="grid select-none gap-px border border-[var(--line)] bg-[var(--line)]"
      style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}
      role={onCellClick ? "grid" : "img"}
      aria-label={label}
    >
      {grid.cells.flatMap((row, rowIndex) =>
        row.map((terrain, columnIndex) => {
          const cell = { row: rowIndex, col: columnIndex };
          const key = cellKey(cell);
          const endpoint = sameCell(cell, grid.start) ? "S" : sameCell(cell, grid.goal) ? "G" : null;
          let background = COLORS[terrain];
          if (!endpoint && terrain !== "wall") {
            if (route.has(key)) background = COLORS.route;
            else if (frontier.has(key)) background = COLORS.frontier;
            else if (settled.has(key)) background = COLORS.settled;
          }
          if (endpoint) background = "var(--foreground)";
          // Mud keeps a corner mark under the search colours, so a route through mud stays visible.
          const mudMark = terrain === "mud" && (route.has(key) || frontier.has(key) || settled.has(key));
          const content = (
            <>
              {mudMark ? (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/4" style={{ background: "var(--accent-2)" }} />
              ) : null}
              {currentKey === key ? (
                <span aria-hidden className="absolute inset-[18%] border-2 border-[var(--foreground)]" />
              ) : null}
              {endpoint ? (
                <span className={`relative font-mono font-bold text-[var(--background)] ${letter}`}>{endpoint}</span>
              ) : null}
            </>
          );
          const className = "relative flex aspect-square min-w-0 items-center justify-center transition-colors duration-150";
          if (onCellClick) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onCellClick(cell)}
                className={`${className} cursor-pointer focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--foreground)]`}
                style={{ background }}
                aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${endpoint === "S" ? "start" : endpoint === "G" ? "goal" : terrain}`}
              >
                {content}
              </button>
            );
          }
          return (
            <div key={key} className={className} style={{ background }}>
              {content}
            </div>
          );
        }),
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Mud, cost 5", color: COLORS.mud },
    { label: "Checked", color: COLORS.settled },
    { label: "Frontier", color: COLORS.frontier },
    { label: "Route", color: COLORS.route },
  ];
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-2 ${LABEL}`}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <i className="size-3 border border-[var(--line)]" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function decisionReason(algorithm: SearchAlgorithm, decision: SearchDecision): string {
  if (algorithm === "bfs") return `It has the oldest queue ticket (#${decision.order + 1}), so BFS takes it first.`;
  if (algorithm === "dijkstra") return `Its known cost from the start is the smallest: g = ${decision.g}.`;
  if (algorithm === "greedy") return `It looks closest to the goal: h = ${decision.h}.`;
  return `Its total is the smallest: f = g + h = ${decision.g} + ${decision.h} = ${decision.f}.`;
}

function priorityText(algorithm: SearchAlgorithm, decision: SearchDecision): string {
  if (algorithm === "bfs") return `#${decision.order + 1}`;
  if (algorithm === "dijkstra") return `g ${decision.g}`;
  if (algorithm === "greedy") return `h ${decision.h}`;
  return `f ${decision.f}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function PathfindingShowdownPage() {
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<Mode>("race");
  const [grid, setGrid] = useState<PathGrid>(() => createDefaultGrid());
  const [scenarioId, setScenarioId] = useState<ScenarioId>("mud-shortcut");
  const [edits, setEdits] = useState<PathGrid[]>([]);
  const [tool, setTool] = useState<EditTool>("wall");
  const [editorOpen, setEditorOpen] = useState(false);

  // Race: one shared step counter, so every board expands one cell per tick.
  const [raceStep, setRaceStep] = useState(0);
  // Inspect: one solver, stepped or played.
  const [algorithm, setAlgorithm] = useState<SearchAlgorithm>("astar");
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const runs = useMemo<Run[]>(
    () => SEARCH_ALGORITHMS.map((definition) => ({ definition, trace: traceSearch(grid, definition.id) })),
    [grid],
  );
  const raceLength = Math.max(...runs.map(({ trace }) => trace.frames.length));
  const raceDone = reducedMotion || raceStep >= raceLength - 1;
  const shownRaceStep = reducedMotion ? raceLength : raceStep;

  useEffect(() => {
    if (mode !== "race" || raceDone) return;
    const timer = window.setTimeout(() => setRaceStep((step) => step + 1), RACE_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [mode, raceDone, raceStep]);

  const active = runs.find(({ definition }) => definition.id === algorithm) ?? runs[0];
  const lastStep = active.trace.frames.length - 1;
  const finished = stepIndex >= lastStep;
  const activeFrame = stepIndex >= 0 ? active.trace.frames[stepIndex] : undefined;

  useEffect(() => {
    if (!isPlaying || stepIndex >= lastStep) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(lastStep, stepIndex + 1);
      setStepIndex(next);
      if (next >= lastStep) setIsPlaying(false);
    }, INSPECT_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [isPlaying, lastStep, stepIndex]);

  const restart = () => {
    setRaceStep(0);
    setIsPlaying(false);
    setStepIndex(-1);
  };

  const loadGrid = (next: PathGrid, scenario: ScenarioId) => {
    restart();
    setScenarioId(scenario);
    setGrid(next);
  };

  const loadPreset = (id: ScenarioId) => {
    const preset = PATHFINDING_PRESETS.find((candidate) => candidate.id === id);
    if (!preset) return;
    setEdits([]);
    loadGrid(preset.createGrid(), preset.id);
  };

  const changeGrid = (next: PathGrid) => {
    if (next === grid) return;
    setEdits((previous) => [...previous.slice(-29), grid]);
    loadGrid(next, "custom");
  };

  const editCell = (cell: Cell) =>
    changeGrid(tool === "start" || tool === "goal" ? moveEndpoint(grid, tool, cell) : updateTerrain(grid, cell, tool));

  const scenarioOptions = PATHFINDING_PRESETS.map((preset) => ({ value: preset.id as ScenarioId, label: preset.label }));
  if (scenarioId === "custom") scenarioOptions.push({ value: "custom", label: "Your map" });

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Search algorithms"
        title="Pathfinding Showdown"
        description="Four search algorithms race to the same goal, where a mud cell costs 5 and any other step costs 1."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Map" options={scenarioOptions} value={scenarioId} onChange={loadPreset} />
        <div className="flex flex-wrap items-center gap-2">
          {mode === "race" && !reducedMotion ? (
            <Button size="sm" variant="ghost" onClick={() => setRaceStep(0)}>
              Replay
            </Button>
          ) : null}
          <Segmented
            label="View"
            options={[
              { value: "race", label: "Race" },
              { value: "inspect", label: "Inspect" },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              restart();
            }}
          />
        </div>
      </div>

      {mode === "race" ? (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
            {runs.map(({ definition, trace }) => {
              const frame = frameAt(trace, shownRaceStep);
              const done = shownRaceStep >= trace.frames.length - 1;
              const checked = frame ? frame.step + 1 : 0;
              return (
                <figure key={definition.id} className="min-w-0">
                  <figcaption className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{definition.label}</span>
                    <span className={`${LABEL} tabular-nums`}>
                      {done ? (trace.found ? `cost ${trace.cost}` : "no route") : `${checked} checked`}
                    </span>
                  </figcaption>
                  <Board
                    size="sm"
                    grid={grid}
                    frame={frame}
                    path={done && trace.found ? trace.path : undefined}
                    label={`${definition.label}: ${trace.found ? `checked ${trace.visited.length} cells, route cost ${trace.cost}` : "no route"}`}
                  />
                </figure>
              );
            })}
          </div>

          <div className="mt-4">
            <Legend />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
            <table className="w-full border-collapse text-left text-sm">
              <thead className={LABEL}>
                <tr className="border-b border-[var(--line)]">
                  <th className="py-2 pr-4 font-normal">Solver</th>
                  <th className="py-2 pr-4 text-right font-normal">Checked</th>
                  <th className="py-2 text-right font-normal">Cost</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {runs.map(({ definition, trace }) => {
                  const done = shownRaceStep >= trace.frames.length - 1;
                  return (
                    <tr key={definition.id} className="border-b border-[var(--line)]">
                      <td className="py-2 pr-4">
                        {definition.label}
                        <span className="ml-3 hidden font-sans text-xs text-[var(--sub)] sm:inline">{definition.decisionRule}</span>
                      </td>
                      <td className="py-2 pr-4 text-right">{done ? trace.visited.length : "…"}</td>
                      <td className="py-2 text-right">{done ? (trace.cost ?? "none") : "…"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-base text-[var(--foreground)]" aria-live="polite">
              {raceDone ? takeaway(runs) : " "}
            </p>
          </div>
        </>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="min-w-0">
            <Board
              size="lg"
              grid={grid}
              frame={activeFrame}
              path={finished && active.trace.found ? active.trace.path : undefined}
              onCellClick={editorOpen ? editCell : undefined}
              label={editorOpen ? "Editable pathfinding map" : "Search trace map"}
            />
            <div className="mt-3">
              <Legend />
            </div>
            <details
              open={editorOpen}
              onToggle={(event) => setEditorOpen(event.currentTarget.open)}
              className="ui-details mt-5 border-t border-[var(--line)]"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 py-3 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]">
                <span aria-hidden="true" className="ui-details__mark">+</span>
                Edit the map
              </summary>
              <div className="pb-4 text-sm text-[var(--muted)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented label="Paint" options={TOOLS} value={tool} onChange={setTool} />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!edits.length}
                    onClick={() => {
                      const previous = edits.at(-1);
                      if (!previous) return;
                      setEdits(edits.slice(0, -1));
                      loadGrid(previous, "custom");
                    }}
                  >
                    Undo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => changeGrid(clearGrid())}>
                    Clear
                  </Button>
                </div>
                <p className="mt-2">Click the board to paint while this is open.</p>
              </div>
            </details>
          </div>

          <aside className="space-y-5">
            <Segmented
              label="Solver"
              options={SEARCH_ALGORITHMS.map((definition) => ({ value: definition.id, label: definition.label }))}
              value={algorithm}
              onChange={(next) => {
                setAlgorithm(next);
                setIsPlaying(false);
                setStepIndex(-1);
              }}
            />
            <p className="text-sm text-[var(--muted)]">{active.definition.decisionRule}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (isPlaying) return setIsPlaying(false);
                  setStepIndex((current) => (current < 0 || current >= lastStep ? 0 : current));
                  setIsPlaying(true);
                }}
                disabled={lastStep < 0}
              >
                {isPlaying ? "Pause" : finished ? "Play again" : "Play"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsPlaying(false);
                  setStepIndex((current) => Math.min(lastStep, current + 1));
                }}
                disabled={finished}
              >
                Step
              </Button>
            </div>
            <Slider
              label="Step"
              min={-1}
              max={lastStep}
              value={stepIndex}
              display={stepIndex < 0 ? "start" : `${stepIndex + 1} / ${active.trace.frames.length}`}
              onChange={(value) => {
                setIsPlaying(false);
                setStepIndex(value);
              }}
            />

            {activeFrame ? (
              <div className="space-y-4" aria-live="polite">
                <div>
                  <p className={LABEL}>Step {activeFrame.step + 1}: chose {cellLabel(activeFrame.current)}</p>
                  <p className="mt-1 text-sm">
                    {finished && active.trace.found
                      ? `Goal reached. Route cost ${active.trace.cost} after checking ${active.trace.visited.length} cells.`
                      : decisionReason(algorithm, activeFrame.decision)}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 font-mono tabular-nums">
                  {[
                    ["Cost g", activeFrame.decision.g],
                    ["Distance h", activeFrame.decision.h],
                    ["Frontier", activeFrame.frontier.length],
                  ].map(([name, value]) => (
                    <div key={name}>
                      <dt className={LABEL}>{name}</dt>
                      <dd className="mt-1 text-lg">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Details summary={`Frontier, ${activeFrame.frontier.length} cells in order`}>
                  {activeFrame.frontier.length > 0 ? (
                    <ol className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums" aria-label="Complete ordered frontier">
                      {activeFrame.frontier.map((entry) => (
                        <li key={cellKey(entry.cell)}>
                          {cellLabel(entry.cell)} <span className="text-[var(--sub)]">{priorityText(algorithm, entry)}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>The frontier is empty.</p>
                  )}
                  <p className="mt-2 text-xs">Ties keep the order the cells were added.</p>
                </Details>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Press Play or Step to watch {active.definition.label} choose one cell at a time.</p>
            )}
          </aside>
        </div>
      )}

      <p className="mt-10 text-xs text-[var(--sub)]">
        BFS finds the fewest moves. Dijkstra and A* always find the cheapest route. Greedy only aims at the goal.
      </p>
    </DemoPage>
  );
}
