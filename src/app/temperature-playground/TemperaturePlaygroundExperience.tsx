"use client";

import { useReducer, useCallback, useEffect, useMemo, useRef } from "react";
import {
  DemoPage,
  DemoHeader,
  DemoPanel,
  DemoMutedSection,
  DemoFootnote,
  Spinner,
} from "@/components/ui";
import {
  playgroundReducer,
  initialPlaygroundState,
  TEMPERATURES,
  type TemperatureKey,
  type BranchData,
  type TokenData,
} from "./types";
import { useTemperatureData } from "./hooks/useTemperatureData";
import {
  buildBranchPreviewText,
  buildForkMap,
  getForkKey,
} from "./lib/branches";
import PromptSelector from "./components/PromptSelector";
import TemperatureTabs from "./components/TemperatureTabs";
import TokenStream from "./components/TokenStream";
import TokenInspector from "./components/TokenInspector";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1 py-0.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-800">
      {children}
    </kbd>
  );
}

export default function TemperaturePlaygroundExperience() {
  const [state, dispatch] = useReducer(
    playgroundReducer,
    initialPlaygroundState,
  );
  const { manifest, currentData, loading, selectPrompt } =
    useTemperatureData();

  // ── Handlers ─────────────────────────────────────────────────────

  const handlePromptChange = useCallback(
    (index: number) => {
      dispatch({ type: "SET_PROMPT", index });
      selectPrompt(index);
    },
    [selectPrompt],
  );

  const handleTemperatureChange = useCallback((t: TemperatureKey) => {
    dispatch({ type: "SET_TEMPERATURE", temperature: t });
  }, []);

  const handleTokenSelect = useCallback(
    (branchId: number, tokenIndex: number) => {
      dispatch({ type: "SELECT_TOKEN", branchId, tokenIndex });
    },
    [],
  );

  const handleToggleFork = useCallback((forkKey: string) => {
    dispatch({ type: "TOGGLE_FORK", forkKey });
  }, []);

  const handleInspectorTemperature = useCallback((value: number) => {
    dispatch({ type: "SET_INSPECTOR_TEMPERATURE", value });
  }, []);

  // ── Derive the selected token for the inspector ──────────────────

  const selectedToken: TokenData | null = useMemo(() => {
    if (!currentData || state.selectedTokenIndex === null) return null;

    const branches: BranchData[] =
      currentData.trees[state.temperature] ?? [];
    const branch = branches.find((b) => b.id === state.selectedBranchId);
    if (!branch) return null;

    return branch.tokens[state.selectedTokenIndex] ?? null;
  }, [currentData, state.temperature, state.selectedBranchId, state.selectedTokenIndex]);

  // ── Derive branches and the selected branch ─────────────────────

  const allBranches = useMemo(() => {
    if (!currentData) return [];
    return currentData.trees[state.temperature] ?? [];
  }, [currentData, state.temperature]);

  // ── Preview text: prefill + path from root to selected token ───

  const previewText = useMemo(() => {
    if (!currentData) return null;

    return buildBranchPreviewText(
      currentData.prefill,
      allBranches,
      state.selectedBranchId,
      state.selectedTokenIndex,
    );
  }, [
    allBranches,
    currentData,
    state.selectedBranchId,
    state.selectedTokenIndex,
  ]);

  // ── Fork map: which tokens have child branches ──────────────────

  const forkMap = useMemo(() => {
    return buildForkMap(allBranches);
  }, [allBranches]);

  // ── Arrow key navigation ─────────────────────────────────────────
  // ← → move within the current branch
  // ↓   enters a child branch at a fork point (auto-expands it)
  // ↑   returns to the parent branch at the fork point
  // Esc clears selection

  // Keep a ref to the latest state so the keyboard listener can read it
  // without needing to re-register on every state change.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const s = stateRef.current;
      const currentBranch = allBranches.find((b) => b.id === s.selectedBranchId);

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        dispatch({
          type: "NAVIGATE_TOKEN",
          delta: -1,
          branchLength: currentBranch?.tokens.length ?? 0,
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        dispatch({
          type: "NAVIGATE_TOKEN",
          delta: 1,
          branchLength: currentBranch?.tokens.length ?? 0,
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (s.selectedTokenIndex === null || !currentBranch) return;

        // Check if the current token is a fork point with children
        const forkKey = getForkKey(currentBranch.id, s.selectedTokenIndex);
        const children = forkMap.get(forkKey);
        if (!children || children.length === 0) return;

        // Enter the first child branch, select its first token
        const child = children[0];
        dispatch({ type: "SELECT_TOKEN", branchId: child.id, tokenIndex: 0 });

        // Auto-expand the fork if not already expanded
        if (!s.expandedForks.includes(forkKey)) {
          dispatch({ type: "TOGGLE_FORK", forkKey });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!currentBranch || currentBranch.parentId === null) return;

        // Go back to the parent branch at the fork point
        dispatch({
          type: "SELECT_TOKEN",
          branchId: currentBranch.parentId,
          tokenIndex: currentBranch.forkIndex,
        });
      } else if (e.key === "Escape") {
        dispatch({ type: "CLEAR_SELECTION" });
      } else if (e.key === "Tab") {
        e.preventDefault();
        const temps = TEMPERATURES;
        const curIdx = temps.indexOf(s.temperature);
        const nextIdx = e.shiftKey
          ? (curIdx - 1 + temps.length) % temps.length
          : (curIdx + 1) % temps.length;
        dispatch({ type: "SET_TEMPERATURE", temperature: temps[nextIdx] });
      } else if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (idx < TEMPERATURES.length) {
          dispatch({ type: "SET_TEMPERATURE", temperature: TEMPERATURES[idx] });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allBranches, forkMap]);

  // ── Loading state ────────────────────────────────────────────────

  if (loading && !currentData) {
    return (
      <DemoPage width="2xl">
        <DemoHeader
          eyebrow="NLP / Sampling"
          title="Temperature Playground"
          description="Explore how temperature shapes what an LLM writes."
        />
        <div className="flex items-center justify-center gap-3 py-20">
          <Spinner size="md" />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Loading data&hellip;
          </span>
        </div>
      </DemoPage>
    );
  }

  // ── Main render ──────────────────────────────────────────────────

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="NLP / Sampling"
        title="Temperature Playground"
        description="Explore how temperature shapes what an LLM writes. Each token is colored by how surprising it was — click any token to see the full probability distribution."
      />

      {/* Controls bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 max-w-md">
          <PromptSelector
            manifest={manifest}
            selectedIndex={state.promptIndex}
            onSelect={handlePromptChange}
            disabled={loading}
          />
        </div>
        <TemperatureTabs
          active={state.temperature}
          onSelect={handleTemperatureChange}
        />
      </div>

      {/* Main content: stream + inspector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Token stream */}
        <div className="flex-1 min-w-0">
          <DemoPanel title="Token Stream" padding="lg">
            {currentData ? (
              <TokenStream
                data={currentData}
                temperature={state.temperature}
                selectedBranchId={state.selectedBranchId}
                selectedTokenIndex={state.selectedTokenIndex}
                expandedForks={state.expandedForks}

                onTokenSelect={handleTokenSelect}
                onToggleFork={handleToggleFork}
              />
            ) : (
              <div className="py-8 text-center text-sm text-neutral-400">
                No data loaded.
              </div>
            )}
          </DemoPanel>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400 dark:text-neutral-500">
            <span className="hidden sm:inline">
              <Kbd>&larr;</Kbd> <Kbd>&rarr;</Kbd> navigate
            </span>
            <span className="hidden sm:inline">
              <Kbd>&darr;</Kbd> <Kbd>&uarr;</Kbd> enter/exit branch
            </span>
            <span className="hidden sm:inline">
              <Kbd>tab</Kbd> temperature
            </span>
            <span className="hidden sm:inline">
              <Kbd>1</Kbd>&ndash;<Kbd>4</Kbd> jump to T
            </span>
            <span className="hidden sm:inline">
              <Kbd>esc</Kbd> deselect
            </span>
          </div>

          {/* Text preview */}
          {previewText !== null && (
            <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Text up to here
              </div>
              <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">
                {previewText}
              </p>
            </div>
          )}
        </div>

        {/* Inspector panel */}
        <div className="w-full lg:w-72 shrink-0">
          <TokenInspector
            token={selectedToken}
            tokenIndex={state.selectedTokenIndex}
            inspectorTemperature={state.inspectorTemperature}
            onTemperatureChange={handleInspectorTemperature}
          />
        </div>
      </div>

      {/* How it works */}
      <DemoMutedSection className="mt-8" title="How it works">
        <div className="grid gap-4 text-sm text-neutral-600 dark:text-neutral-400 md:grid-cols-3">
          <div>
            <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
              1. Token-by-token generation
            </h3>
            <p>
              LLMs predict one token at a time. At each step, the model
              produces a probability distribution over its entire vocabulary
              — typically 100K+ words and word fragments.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
              2. Temperature scales the distribution
            </h3>
            <p>
              Temperature divides the raw scores (logits) before applying
              softmax. Low temperature sharpens the distribution, making the
              top token nearly certain. High temperature flattens it,
              giving unlikely tokens a real chance.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-medium text-neutral-900 dark:text-neutral-100">
              3. Fork points show uncertainty
            </h3>
            <p>
              Branches appear where a strong alternative token had &gt;10%
              probability — moments of genuine model uncertainty. Click
              them to see what would have happened if a different token
              had been chosen.
            </p>
          </div>
        </div>
      </DemoMutedSection>

      {/* Color legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="font-medium">Token color:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-neutral-200 dark:bg-neutral-700" />
          &gt;80% likely
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-sky-100 dark:bg-sky-900" />
          50–80%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-100 dark:bg-amber-900" />
          20–50%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-100 dark:bg-red-900" />
          &lt;20%
        </span>
      </div>

      <DemoFootnote>
        Qwen3-4B-Instruct-2507 &middot; pre-generated &middot; no data
        leaves your device
      </DemoFootnote>
    </DemoPage>
  );
}
