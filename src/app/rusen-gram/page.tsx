"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";
import { createSeededRandom } from "@/lib/random";
import { EXAMPLE_CORPUS, inspectNgram } from "./model";

export default function RusenGram() {
  const [corpus, setCorpus] = useState(EXAMPLE_CORPUS);
  const [prompt, setPrompt] = useState("the cat");
  const [order, setOrder] = useState(3);
  const [alpha, setAlpha] = useState(0.5);
  const [seed, setSeed] = useState(42);
  const [generated, setGenerated] = useState("");
  const result = useMemo(
    () => inspectNgram(corpus, prompt, order, alpha),
    [corpus, prompt, order, alpha],
  );
  const generate = () => {
    const random = createSeededRandom(seed);
    let text = prompt;
    const output: string[] = [];
    for (let step = 0; step < 20; step++) {
      const { distribution } = inspectNgram(corpus, text, order, alpha);
      if (!distribution.length) break;
      let choice = random();
      const token =
        distribution.find((row) => (choice -= row.probability) <= 0)?.token ??
        distribution.at(-1)!.token;
      output.push(token);
      text += " " + token;
    }
    setGenerated(output.join(" "));
  };
  const clear = () => setGenerated("");
  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Language models · from counts to predictions"
        title="RuseN-Gram"
        description="Build a small word-level language model from text you can inspect. Follow the counts, watch unseen contexts back off, and see exactly what smoothing changes."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <DemoPanel
          title="The complete training corpus"
          description="The bundled corpus is a deliberately small, authored illustration. You can replace it; nothing is sent to a server."
        >
          <label className="block text-sm">
            Corpus
            <textarea
              aria-label="Training corpus"
              className="mt-2 w-full min-h-52 border bg-[var(--surface)] p-3"
              value={corpus}
              maxLength={8000}
              onChange={(event) => {
                setCorpus(event.target.value);
                clear();
              }}
            />
          </label>
          <p className="mt-2 text-xs text-neutral-500">
            {result.tokenCount} tokens · {result.vocabularySize} vocabulary
            items. Words are lowercased; punctuation is a separate token.
          </p>
          <Button
            className="mt-3"
            size="sm"
            onClick={() => {
              setCorpus(EXAMPLE_CORPUS);
              clear();
            }}
          >
            Restore example corpus
          </Button>
        </DemoPanel>
        <DemoPanel title="Ask what comes next">
          <label className="block text-sm">
            Context
            <input
              aria-label="Context"
              className="mt-2 mb-4 w-full border bg-[var(--surface)] p-2"
              value={prompt}
              maxLength={200}
              onChange={(event) => {
                setPrompt(event.target.value);
                clear();
              }}
            />
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setPrompt("the cat");
                clear();
              }}
            >
              Seen context
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPrompt("mysterious cat");
                clear();
              }}
            >
              Unseen context
            </Button>
          </div>
          <label className="block text-sm">
            Order n = {order} (up to {order - 1} context tokens)
            <input
              aria-label="N-gram order"
              className="my-3 w-full"
              type="range"
              min="1"
              max="4"
              value={order}
              onChange={(event) => {
                setOrder(Number(event.target.value));
                clear();
              }}
            />
          </label>
          <label className="block text-sm">
            Additive smoothing α = {alpha.toFixed(2)}
            <input
              aria-label="Smoothing"
              className="my-3 w-full"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={alpha}
              onChange={(event) => {
                setAlpha(Number(event.target.value));
                clear();
              }}
            />
          </label>
          <p className="text-sm">
            P(token | context) = (count + α) / (matches + α × vocabulary size).
            Backoff selects the longest context with observed continuations;
            smoothing then distributes mass across the known vocabulary.
          </p>
        </DemoPanel>
        <DemoPanel title="Backoff trace">
          <ol className="space-y-3">
            {result.trace.map((step, index) => (
              <li key={index} className="border border-[var(--line)] p-3">
                <span className="font-mono">
                  {step.context.length ? step.context.join(" ") : "∅ (unigram)"}
                </span>
                <p className="mt-1 text-sm">
                  {step.total} observed continuations ·{" "}
                  {step.total
                    ? "use this context"
                    : "no continuation; try a shorter suffix"}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-neutral-500">
            A word absent from the entire corpus is outside this model&apos;s
            vocabulary. Additive smoothing does not invent new words.
          </p>
        </DemoPanel>
        <DemoPanel title="Counts become probabilities">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-sm [&_th]:pr-3 [&_td]:pr-3">
              <thead>
                <tr>
                  <th>Next token</th>
                  <th>Count</th>
                  <th>Calculation</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody>
                {result.distribution.map((row) => (
                  <tr key={row.token} className="border-t border-[var(--line)]">
                    <td className="py-2 font-mono">{row.token}</td>
                    <td>{row.count}</td>
                    <td>
                      ({row.count} + {alpha}) / {result.denominator.toFixed(2)}
                    </td>
                    <td>{(row.probability * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.vocabularySize && (
            <p role="status">Enter some training text to build a vocabulary.</p>
          )}
        </DemoPanel>
      </div>
      <DemoPanel className="mt-6" title="Sample from this model">
        <div className="flex items-center gap-3">
          <label className="text-sm">
            Seed{" "}
            <input
              aria-label="Generation seed"
              className="w-24 border bg-[var(--surface)] p-2"
              type="number"
              min="1"
              max="9999"
              value={seed}
              onChange={(event) => {
                setSeed(
                  Math.max(1, Math.min(9999, Number(event.target.value))),
                );
                clear();
              }}
            />
          </label>
          <Button disabled={!result.vocabularySize} onClick={generate}>
            Generate 20 tokens
          </Button>
        </div>
        <p className="mt-4 min-h-12 leading-relaxed" aria-live="polite">
          {generated ||
            "The same corpus, settings and seed reproduce the same continuation."}
        </p>
      </DemoPanel>
      <DemoFootnote>
        A transparent count-based model, with suffix backoff and additive
        smoothing. No neural network or model download.
      </DemoFootnote>
    </DemoPage>
  );
}
