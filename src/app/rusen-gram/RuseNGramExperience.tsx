"use client";

import { useMemo, useState } from "react";
import {
  DemoFootnote,
  DemoHeader,
  DemoMutedSection,
  DemoPage,
  DemoPanel,
  Button,
} from "@/components/ui";
import {
  autocompleteTokens,
  RUSEN_GRAM_EXAMPLES,
  scoreNextTokens,
  type CandidatePrediction,
  type RuseNGramExampleId,
} from "./lib/model";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatToken(token: string): string {
  return token.replace(/ /g, "\u2423").replace(/\n/g, "\u23ce");
}

function blendLabel(value: number): string {
  if (value <= 0.15) return "Base-heavy";
  if (value >= 0.85) return "Assistant-heavy";
  return "Blended";
}

export default function RuseNGramExperience() {
  const initialExample =
    RUSEN_GRAM_EXAMPLES.find((example) => example.id === "coffee") ??
    RUSEN_GRAM_EXAMPLES[0]!;
  const [exampleId, setExampleId] = useState<RuseNGramExampleId>(
    initialExample.id,
  );
  const [prompt, setPrompt] = useState(initialExample.prompt);
  const [assistantBlend, setAssistantBlend] = useState(
    initialExample.recommendedBlend,
  );
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  const rankedCandidates = useMemo(
    () => scoreNextTokens(prompt, generatedTokens, assistantBlend),
    [assistantBlend, generatedTokens, prompt],
  );

  const selectedCandidate =
    rankedCandidates.find((candidate) => candidate.token === selectedToken) ??
    rankedCandidates[0] ??
    null;

  const generatedText = `${prompt}${generatedTokens.join("")}`;
  const topThree = rankedCandidates.slice(0, 3);

  const appendToken = (candidate: CandidatePrediction) => {
    setGeneratedTokens((current) => [...current, candidate.token]);
    setSelectedToken(candidate.token);
  };

  return (
    <DemoPage width="2xl" className="space-y-8">
      <DemoHeader
        eyebrow="NLP / Statistical Language Modeling"
        title="RuseN-Gram"
        description="A skip-gram-flavored statistical language model playground. Explore how a base Turkish LM, an instruction-tuned assistant LM, and their blend shift the next-token distribution."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-2 text-xs font-medium dark:border-neutral-800/80 dark:bg-neutral-950/50">
            <span className="text-neutral-500 dark:text-neutral-400">Mode</span>
            <span className="rounded-full bg-neutral-900 px-2 py-1 text-white dark:bg-neutral-100 dark:text-neutral-950">
              {blendLabel(assistantBlend)}
            </span>
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-4">
        {RUSEN_GRAM_EXAMPLES.map((example, index) => {
          const active = example.id === exampleId;
          return (
            <button
              key={example.id}
              type="button"
              onClick={() => {
                setExampleId(example.id);
                setPrompt(example.prompt);
                setAssistantBlend(example.recommendedBlend);
                setGeneratedTokens([]);
                setSelectedToken(null);
              }}
              className={`rounded-[1.25rem] border p-4 text-left transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                  : "border-neutral-200/80 bg-white/75 hover:border-neutral-400 dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:hover:border-neutral-600"
              }`}
            >
              <div
                className={`text-[10px] font-mono uppercase tracking-[0.24em] ${
                  active
                    ? "text-white/70 dark:text-neutral-700"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {String(index + 1).padStart(2, "0")} / {example.title}
              </div>
              <p
                className={`mt-3 text-sm leading-relaxed ${
                  active
                    ? "text-white/85 dark:text-neutral-700"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {example.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <DemoPanel
          title="Prompt And Generation"
          description="Edit the prompt, then step token-by-token or autocomplete with the current blend."
          padding="lg"
        >
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setGeneratedTokens([]);
            }}
            className="mt-3 h-36 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-600"
            spellCheck={false}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                const next = rankedCandidates[0];
                if (next) appendToken(next);
              }}
            >
              Generate Next Token
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setGeneratedTokens((current) =>
                  autocompleteTokens(prompt, current, assistantBlend, 6),
                )
              }
            >
              Autocomplete 6 Tokens
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGeneratedTokens([]);
                setSelectedToken(null);
              }}
            >
              Reset Continuation
            </Button>
          </div>

          <div className="mt-6 rounded-[1rem] border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
              Current Continuation
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
              {generatedText}
            </pre>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {topThree.map((candidate, index) => (
              <button
                key={candidate.token}
                type="button"
                onClick={() => appendToken(candidate)}
                className={`rounded-[1rem] border p-3 text-left transition ${
                  index === 0
                    ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                  Top {index + 1}
                </div>
                <div className="mt-2 font-mono text-sm text-neutral-900 dark:text-neutral-100">
                  {formatToken(candidate.token)}
                </div>
                <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {formatPercent(candidate.probability)}
                </div>
              </button>
            ))}
          </div>
        </DemoPanel>

        <DemoPanel
          title="Model Blend"
          description="Interpolate the general-purpose Turkish LM with the assistant-tuned LM."
          padding="lg"
        >
          <div className="rounded-[1rem] border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span>Base LM</span>
              <span>Assistant LM</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={assistantBlend}
              onChange={(event) =>
                setAssistantBlend(parseFloat(event.target.value))
              }
              className="mt-3 w-full accent-blue-500"
            />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {(assistantBlend * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  assistant influence
                </div>
              </div>
              <div className="text-right text-sm text-neutral-600 dark:text-neutral-300">
                <div>{blendLabel(assistantBlend)}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  `
                  {assistantBlend < 0.5
                    ? "continuation-heavy"
                    : "instruction-heavy"}
                  `
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-neutral-200/80 p-4 dark:border-neutral-800">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                Base Bias
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                Prefers generic continuation, topical fluency, and broad Turkish
                corpus regularities.
              </p>
            </div>
            <div className="rounded-[1rem] border border-neutral-200/80 p-4 dark:border-neutral-800">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                Assistant Bias
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                Prefers response framing, lists, chat tone, and
                instruction-following continuations.
              </p>
            </div>
          </div>

          <DemoFootnote align="left" className="mt-4">
            This MVP uses compact hand-authored statistical weights to prove out
            the inference and explanation interface. The full project will
            replace them with trained skip-gram artifacts exported for browser
            use.
          </DemoFootnote>
        </DemoPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DemoPanel
          title="Next-Token Distribution"
          description="Click a candidate to inspect why it scored well, or append it directly."
          padding="lg"
        >
          <div className="space-y-2">
            {rankedCandidates.slice(0, 10).map((candidate, index) => {
              const active = candidate.token === selectedCandidate?.token;
              return (
                <button
                  key={candidate.token}
                  type="button"
                  onClick={() => setSelectedToken(candidate.token)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                      : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-70">
                        Rank {index + 1}
                      </div>
                      <div className="mt-1 font-mono text-sm">
                        {formatToken(candidate.token)}
                      </div>
                    </div>
                    <div className="text-right text-xs tabular-nums opacity-80">
                      {formatPercent(candidate.probability)}
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        active
                          ? "bg-white/85 dark:bg-neutral-900"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${candidate.probability * 100}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] opacity-70">
                    <span>base {candidate.baseScore.toFixed(2)}</span>
                    <span>assistant {candidate.assistantScore.toFixed(2)}</span>
                    <span>blend {candidate.blendedScore.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </DemoPanel>

        <DemoPanel
          title="Why This Token"
          description="The feature trace below is the heart of the product: show exactly which skip-grams and style priors fired."
          padding="lg"
        >
          {selectedCandidate ? (
            <>
              <div className="rounded-[1rem] border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                  Selected Token
                </div>
                <div className="mt-2 font-mono text-lg text-neutral-900 dark:text-neutral-100">
                  {formatToken(selectedCandidate.token)}
                </div>
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  Probability {formatPercent(selectedCandidate.probability)}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {selectedCandidate.contributions
                  .slice(0, 8)
                  .map((contribution) => (
                    <div
                      key={`${selectedCandidate.token}-${contribution.id}`}
                      className="rounded-xl border border-neutral-200/80 p-3 dark:border-neutral-800"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {contribution.model}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {contribution.kind}
                        </span>
                        <span className="ml-auto text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                          +{contribution.weight.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                        {contribution.label}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Select a candidate to inspect its feature trace.
            </p>
          )}
        </DemoPanel>
      </div>

      <DemoMutedSection title="Why This Project Matters">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700 dark:text-neutral-200">
              Statistical, not nostalgic
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              The goal is not to cosplay an LLM. It is to show how much
              assistant-like behavior you can recover from pure statistics once
              skip features and response-style data are introduced.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700 dark:text-neutral-200">
              Turkish-first
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              Morphologically rich languages make classical baselines more
              relevant, not less. Rusenizer v2 and RuseN-Gram are being designed
              together for that reason.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700 dark:text-neutral-200">
              Browser explainability
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              The long-term implementation keeps inference static-site friendly:
              compact artifacts, explicit feature traces, and instant
              counterfactual inspection.
            </p>
          </div>
        </div>
      </DemoMutedSection>

      <DemoFootnote>
        Skip-gram MVP · Turkish-first statistical LM · full trained artifacts to
        follow in this branch
      </DemoFootnote>
    </DemoPage>
  );
}
