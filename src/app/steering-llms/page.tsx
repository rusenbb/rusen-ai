"use client";

import { useEffect, useRef, useState } from "react";
import type { TextGenerationPipeline } from "@huggingface/transformers";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";
import {
  compareSteering,
  loadSteeringModel,
  MODEL_ID,
  MODEL_REVISION,
  TARGET_WORDS,
  type SteeringSettings,
} from "./model";

export default function SteeringLab() {
  const [settings, setSettings] = useState<SteeringSettings>({
    prompt: "When I think about the future, I feel",
    seed: 42,
    strength: 3,
    temperature: 0.8,
    tokens: 16,
  });
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof compareSteering>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    "Model loads only when you run a comparison.",
  );
  const [error, setError] = useState<string | null>(null);
  const pipeline = useRef<TextGenerationPipeline | null>(null);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (!running.current) void pipeline.current?.dispose();
    },
    [],
  );
  const update = <K extends keyof SteeringSettings>(
    key: K,
    value: SteeringSettings[K],
  ) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setResult(null);
  };
  const run = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setResult(null);
    const request = new AbortController();
    controller.current = request;
    try {
      if (!pipeline.current) {
        setStatus("Loading quantized DistilGPT2…");
        pipeline.current = await loadSteeringModel((progress) => {
          if (!request.signal.aborted && "progress" in progress)
            setStatus(`Loading model files: ${Math.round(progress.progress)}%`);
        });
      }
      if (request.signal.aborted) return;
      const output = await compareSteering(
        pipeline.current,
        settings,
        (condition, step) => {
          if (!request.signal.aborted)
            setStatus(`${condition}: token ${step} / ${settings.tokens}`);
        },
        request.signal,
      );
      if (!request.signal.aborted) {
        setResult(output);
        setStatus("Matched comparison complete.");
      }
    } catch (failure) {
      if (!request.signal.aborted) {
        setError(
          failure instanceof Error ? failure.message : "Comparison failed",
        );
        setStatus("Comparison failed. You can retry.");
      }
    } finally {
      running.current = false;
      if (request.signal.aborted) {
        await pipeline.current?.dispose();
        pipeline.current = null;
      }
      setBusy(false);
    }
  };
  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Language models · controlled intervention"
        title="Steering LLMs"
        description="Compare the same small causal language model with and without a token-logit intervention. Hold the prompt, seed, temperature and output budget fixed; change only the steering strength."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <DemoPanel
          title="One model, one intervention"
          description="DistilGPT2 is a small English completion model, not a chat assistant. This experiment biases output logits; it does not modify hidden-layer activations."
        >
          <p className="text-sm leading-relaxed">
            Target concept: positive vocabulary. At the final output layer, add
            the selected strength to these single-token words before temperature
            and top-40 sampling:
          </p>
          <p className="mt-3 font-mono text-sm">{TARGET_WORDS.join(" · ")}</p>
          <p className="mt-3 text-sm text-neutral-500">
            This lexical intervention can make target words more likely without
            making the whole completion positive or coherent. Compare actual
            outputs instead of assuming it worked.
          </p>
          <p className="mt-3 font-mono text-xs break-all">
            {MODEL_ID} · q8 · WebAssembly · revision{" "}
            {MODEL_REVISION.slice(0, 8)}
          </p>
        </DemoPanel>
        <DemoPanel title="Matched settings">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm">
              Prompt
              <textarea
                aria-label="Steering prompt"
                className="mt-2 w-full min-h-24 border bg-[var(--surface)] p-3"
                maxLength={400}
                value={settings.prompt}
                onChange={(event) => update("prompt", event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Steering strength: {settings.strength.toFixed(1)}
              <input
                aria-label="Steering strength"
                className="mt-2 w-full"
                type="range"
                min="-4"
                max="6"
                step="0.5"
                value={settings.strength}
                onChange={(event) =>
                  update("strength", Number(event.target.value))
                }
              />
            </label>
            <label className="block text-sm">
              Temperature: {settings.temperature.toFixed(1)}
              <input
                aria-label="Temperature"
                className="mt-2 w-full"
                type="range"
                min="0.3"
                max="1.5"
                step="0.1"
                value={settings.temperature}
                onChange={(event) =>
                  update("temperature", Number(event.target.value))
                }
              />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="text-sm">
                Seed{" "}
                <input
                  aria-label="Steering seed"
                  className="w-24 border bg-[var(--surface)] p-2"
                  type="number"
                  min="1"
                  max="9999"
                  value={settings.seed}
                  onChange={(event) =>
                    update(
                      "seed",
                      Math.max(1, Math.min(9999, Number(event.target.value))),
                    )
                  }
                />
              </label>
              <label className="text-sm">
                New tokens{" "}
                <select
                  aria-label="Output budget"
                  className="border bg-[var(--surface)] p-2"
                  value={settings.tokens}
                  onChange={(event) =>
                    update("tokens", Number(event.target.value))
                  }
                >
                  {[8, 16, 24, 32].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void run()}
                disabled={!settings.prompt.trim()}
              >
                Run matched comparison
              </Button>
              <Button onClick={() => update("strength", 0)}>
                Zero-strength control
              </Button>
            </div>
          </fieldset>
          <p role="status" className="mt-4 text-xs text-neutral-500">
            {status}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </DemoPanel>
      </div>
      {result && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(["baseline", "steered"] as const).map((condition) => (
            <DemoPanel
              key={condition}
              title={
                condition === "baseline"
                  ? "Baseline · strength 0"
                  : `Steered · strength ${result.settings.strength}`
              }
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                <span className="text-neutral-500">
                  {result.settings.prompt}
                </span>
                <strong>{result[condition].text}</strong>
              </p>
              <dl className="mt-5 space-y-2 text-sm">
                <div>
                  <dt className="inline">Target tokens emitted: </dt>
                  <dd className="inline font-mono">
                    {result[condition].targetCount} /{" "}
                    {result[condition].tokenIds.length}
                  </dd>
                </div>
                <div>
                  <dt className="inline">
                    Target probability mass at the shared first step:{" "}
                  </dt>
                  <dd className="inline font-mono">
                    {(result[condition].firstStepMass * 100).toFixed(2)}%
                  </dd>
                </div>
              </dl>
            </DemoPanel>
          ))}
        </div>
      )}
      {result && (
        <p className="mt-4 text-sm" aria-live="polite">
          {result.settings.strength === 0
            ? result.baseline.text === result.steered.text
              ? "Zero-strength control passed: both completions are identical."
              : "Zero-strength control differs on this backend; do not attribute the difference to steering."
            : "Only first-step probabilities share exactly the same context. After the outputs diverge, later contexts differ too."}
        </p>
      )}
      <DemoFootnote>
        The quantized model is approximately 85 MB, plus tokenizer files. {" "}
        First use downloads model files from Hugging Face; generation runs
        locally. Each condition starts with its own identically seeded sampler.
        There is no claimed general benchmark improvement.
      </DemoFootnote>
    </DemoPage>
  );
}
