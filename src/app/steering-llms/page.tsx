"use client";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";
import { norm } from "./sampling";
import type { Comparison, Condition } from "./model";
import {
  MODEL_ID,
  MODEL_REVISION,
  PRESETS,
  LAYERS,
  type SteeringSettings,
} from "./presets";
import type { SteeringResponse } from "./worker";

const CONDITIONS: Condition[] = ["baseline", "prompted", "steered"];
const TITLES = {
  baseline: "Original model",
  prompted: "Prompt instruction",
  steered: "Activation steering",
};
export default function SteeringLab() {
  const [presetId, setPresetId] = useState("nature");
  const [settings, setSettings] = useState<SteeringSettings>({
    ...PRESETS[1],
    positive: [...PRESETS[1].positive],
    negative: [...PRESETS[1].negative],
    layer: 15,
    strength: 1,
    seed: 42,
    temperature: 0,
    tokens: 64,
  });
  const [result, setResult] = useState<Comparison | null>(null);
  const [text, setText] = useState<Record<Condition, string>>({
    baseline: "",
    prompted: "",
    steered: "",
  });
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Ready · model downloads on first run"),
    [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  const running = useRef(false);
  useEffect(
    () => () => {
      worker.current?.terminate();
    },
    [],
  );
  const update = <K extends keyof SteeringSettings>(
    key: K,
    value: SteeringSettings[K],
  ) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setResult(null);
    setText({ baseline: "", prompted: "", steered: "" });
  };
  const run = () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    setText({ baseline: "", prompted: "", steered: "" });
    if (!worker.current) {
      const instance = new Worker(new URL("./worker.ts", import.meta.url));
      instance.onmessage = ({ data }: MessageEvent<SteeringResponse>) => {
        if (worker.current !== instance) return;
        if ("stage" in data) setStatus(data.stage);
        if ("condition" in data)
          setText((previous) => ({ ...previous, [data.condition]: data.text }));
        if ("result" in data) {
          setResult(data.result);
          setStatus("Comparison complete");
          setBusy(false);
          running.current = false;
        }
        if ("error" in data) {
          setError(data.error);
          setStatus("Run failed · retry available");
          setBusy(false);
          running.current = false;
        }
      };
      instance.onerror = () => {
        setError("The inference worker stopped. Retry to reload the model.");
        instance.terminate();
        worker.current = null;
        setBusy(false);
        running.current = false;
      };
      worker.current = instance;
    }
    worker.current.postMessage(settings);
  };
  const preset = PRESETS.find((item) => item.id === presetId)!;
  const actual = result?.outputs.steered;
  const maxDirection = result ? Math.max(...result.direction.map(Math.abs)) : 1;
  const relative = result
    ? (Math.abs(result.settings.strength) * result.directionNorm) /
      norm(result.outputs.baseline.before)
    : 0;
  const exportRun = () => {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              model: MODEL_ID,
              revision: MODEL_REVISION,
              method:
                "Mean contrast at last token; raw mean difference added after selected block at every prompt and generated token",
              ...result,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "activation-steering-run.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Inside the model · activation engineering"
        title="Steering LLMs"
        description="Change an internal representation and watch the same model continue differently. Derive a direction from contrasting texts, choose a transformer block, and compare three ways of generating."
      />
      <fieldset disabled={busy} className="mb-6 grid gap-3 sm:grid-cols-3">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            aria-pressed={presetId === item.id}
            className={`border p-4 text-left text-sm font-semibold ${presetId === item.id ? "border-[var(--signal)] bg-[var(--surface)]" : "border-[var(--line)] bg-[var(--surface)]"}`}
            onClick={() => {
              setPresetId(item.id);
              setSettings((previous) => ({
                ...previous,
                ...item,
                positive: [...item.positive],
                negative: [...item.negative],
              }));
              setResult(null);
              setText({ baseline: "", prompted: "", steered: "" });
            }}
          >
            {item.title}
          </button>
        ))}
      </fieldset>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DemoPanel
          title="Where the intervention happens"
          description="SmolLM2 · 30 transformer blocks · 576-dimensional residual stream"
        >
          <div className="mb-5 flex items-center gap-3 font-mono text-xs text-neutral-500">
            <span>Prompt</span>
            <span aria-hidden="true">→</span>
            <span>Embedding</span>
            <span aria-hidden="true">→</span>
            <span>Transformer blocks</span>
          </div>
          <div
            className="grid grid-cols-10 gap-1"
            aria-label="Transformer blocks"
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                disabled={busy || !(LAYERS as readonly number[]).includes(n)}
                aria-label={`After block ${n}`}
                aria-pressed={settings.layer === n}
                onClick={() => update("layer", n)}
                className={`h-9 border font-mono text-xs ${settings.layer === n ? "border-[var(--signal)] bg-[var(--signal)] text-[var(--background)]" : "border-[var(--line)] disabled:opacity-40"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="my-5 border-l-2 border-[var(--signal)] pl-4">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              After block {settings.layer}, before block {settings.layer + 1}
            </p>
            <p className="my-2 font-mono text-xl">h′ = h + α · v</p>
            <p className="text-sm leading-relaxed">
              The edited residual enters the remaining attention and MLP blocks.
              The same addition is applied at each prompt and generated token.
            </p>
          </div>
          <fieldset disabled={busy}>
            <label className="block text-sm">
              Strength α = <strong>{settings.strength.toFixed(2)}</strong>
              <input
                aria-label="Steering strength"
                type="range"
                min={-2}
                max={2}
                step={0.25}
                className="my-3 w-full"
                value={settings.strength}
                onChange={(e) => update("strength", Number(e.target.value))}
              />
            </label>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>− {preset.negativeLabel}</span>
              <button
                className="underline"
                onClick={() => update("strength", 0)}
              >
                Zero control
              </button>
              <span>+ {preset.positiveLabel}</span>
            </div>
          </fieldset>
          <p className="mt-4 text-xs text-neutral-500">
            α = 1 adds one mean contrast vector. Negative strength reverses the
            direction. A larger value can change the topic, introduce
            repetition, or break coherence.
          </p>
        </DemoPanel>
        <DemoPanel title="One prompt, three conditions">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm">
              Your prompt
              <textarea
                aria-label="Steering prompt"
                className="mt-2 min-h-24 w-full border bg-[var(--surface)] p-3"
                value={settings.prompt}
                maxLength={500}
                onChange={(e) => update("prompt", e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm">
                Tokens
                <select
                  aria-label="Output budget"
                  className="ml-2 border bg-[var(--surface)] p-2"
                  value={settings.tokens}
                  onChange={(e) => update("tokens", Number(e.target.value))}
                >
                  {[32, 64, 96].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Seed
                <input
                  aria-label="Steering seed"
                  type="number"
                  min={1}
                  max={9999}
                  value={settings.seed}
                  onChange={(e) =>
                    update(
                      "seed",
                      Math.max(1, Math.min(9999, Number(e.target.value))),
                    )
                  }
                  className="ml-2 w-20 border bg-[var(--surface)] p-2"
                />
              </label>
            </div>
            <label className="block text-sm">
              Temperature {settings.temperature.toFixed(1)}
              {settings.temperature === 0
                ? " · greedy decoding"
                : " · seeded top-40 sampling"}
              <input
                aria-label="Temperature"
                type="range"
                min={0}
                max={1.2}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => update("temperature", Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <Button onClick={run} disabled={!settings.prompt.trim()}>
              Run experiment
            </Button>
          </fieldset>
          {busy && (
            <Button
              className="mt-3"
              onClick={() => {
                worker.current?.terminate();
                worker.current = null;
                running.current = false;
                setBusy(false);
                setStatus("Cancelled · cached downloads are kept");
              }}
            >
              Stop experiment
            </Button>
          )}
          <p role="status" className="mt-4 text-xs text-neutral-500">
            {status}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-neutral-500">
            First run downloads a verified 137 MB model plus tokenizer, then
            caches it. Inference stays in a browser worker. This compact English
            instruction model has limited writing ability; compare the full
            outputs.
          </p>
        </DemoPanel>
      </div>
      <details className="my-6 border border-[var(--line)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Inspect / edit the contrast dataset · {settings.positive.length} pairs
        </summary>
        <fieldset disabled={busy}>
          <p className="my-4 text-sm leading-relaxed">
            Each pair is run through the unmodified residual stream. We capture
            its last token after block {settings.layer}, then average the
            positive-minus-negative differences: v = mean(h⁺ − h⁻). These
            examples are separate from the generation prompt.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(["positive", "negative"] as const).map((side) => (
              <label key={side} className="block text-sm">
                {side === "positive"
                  ? preset.positiveLabel
                  : preset.negativeLabel}{" "}
                · one example per line
                <textarea
                  aria-label={`${side} contrast examples`}
                  className="mt-2 h-40 w-full border bg-[var(--surface)] p-3 text-sm"
                  maxLength={4000}
                  value={settings[side].join("\n")}
                  onChange={(e) => update(side, e.target.value.split("\n"))}
                />
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            Instruction used only by the prompt comparison
            <textarea
              aria-label="Prompt control instruction"
              className="mt-2 w-full border bg-[var(--surface)] p-3 text-sm"
              value={settings.instruction}
              maxLength={400}
              onChange={(e) => update("instruction", e.target.value)}
            />
          </label>
        </fieldset>
      </details>
      <div className="grid gap-4 xl:grid-cols-3">
        {CONDITIONS.map((condition) => (
          <DemoPanel
            key={condition}
            title={TITLES[condition]}
            description={
              condition === "baseline"
                ? "Your prompt · no intervention"
                : condition === "prompted"
                  ? "Your prompt + the visible instruction"
                  : `Your prompt · internal activation + ${settings.strength.toFixed(2)}v`
            }
          >
            <p
              className="min-h-48 whitespace-pre-wrap break-words text-base leading-relaxed"
              aria-live={busy ? "off" : "polite"}
            >
              {text[condition] || (
                <span className="text-neutral-500">
                  Run the experiment to generate this condition.
                </span>
              )}
            </p>
            {result && (
              <div className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-neutral-500">
                {result.outputs[condition].tokenIds.length} tokens ·{" "}
                {(result.outputs[condition].milliseconds / 1000).toFixed(1)} s ·{" "}
                {(result.outputs[condition].repetition * 100).toFixed(1)}%
                repeated token trigrams
              </div>
            )}
          </DemoPanel>
        ))}
      </div>
      {result && (
        <section className="mt-6" aria-label="Measured intervention">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">What actually changed?</h2>
            <Button size="sm" onClick={exportRun}>
              Export this run
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <DemoPanel
              title="The extracted direction"
              description="All 576 measured coordinates · orange is negative, green is positive."
            >
              <svg
                viewBox="0 0 576 90"
                role="img"
                aria-label="Measured activation steering vector"
                className="h-24 w-full"
              >
                <line
                  x1={0}
                  y1={45}
                  x2={576}
                  y2={45}
                  stroke="currentColor"
                  opacity={0.2}
                />
                {result.direction.map((value, i) => (
                  <rect
                    key={i}
                    x={i}
                    y={value >= 0 ? 45 - (value / maxDirection) * 40 : 45}
                    width={1}
                    height={Math.abs(value / maxDirection) * 40}
                    fill={value >= 0 ? "#16804a" : "#c57127"}
                  />
                ))}
              </svg>
              <p className="mt-3 font-mono text-xs">
                ‖v‖ = {result.directionNorm.toFixed(2)} · ‖αv‖ / ‖h‖ ={" "}
                {(relative * 100).toFixed(1)}%
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                The ratio uses the last prompt token’s residual. Coordinates are
                not independently labeled concepts.
              </p>
            </DemoPanel>
            <DemoPanel title="Same input, first prediction">
              <p className="text-sm">
                Total variation between the original and steered next-token
                distributions:{" "}
                <strong>
                  {(result.firstStepDivergence * 100).toFixed(1)}%
                </strong>
                .
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {(["baseline", "steered"] as const).map((c) => (
                  <div key={c}>
                    <p className="mb-2 text-xs font-semibold">{TITLES[c]}</p>
                    {result.outputs[c].firstTokens.map((t, i) => (
                      <p
                        key={i}
                        className="flex justify-between gap-2 font-mono text-xs"
                      >
                        <span className="truncate">
                          {JSON.stringify(t.token)}
                        </span>
                        <span>{(t.probability * 100).toFixed(1)}%</span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Probabilities use softmax at T = 1, before sampling. This
                measures distribution change, not writing quality. Later
                predictions can use different generated contexts.
              </p>
              {result.settings.strength === 0 && (
                <p className="mt-3 text-sm">
                  {result.outputs.baseline.text === actual?.text
                    ? "Zero control: original and steered outputs match."
                    : "Zero control differs: do not attribute this difference to the intervention."}
                </p>
              )}
            </DemoPanel>
          </div>
        </section>
      )}
      <DemoFootnote>
        Mean-difference activation addition, inspired by{" "}
        <a href="https://arxiv.org/abs/2308.10248" className="underline">
          ActAdd
        </a>{" "}
        and{" "}
        <a href="https://arxiv.org/abs/2312.06681" className="underline">
          CAA
        </a>
        . Presets are small illustrative datasets, not validated universal
        concept directions.{" "}
        <a href="/steering/evaluation.json" className="underline">
          Inspect the exploratory evaluation
        </a>
        . Model:{" "}
        <a
          href={`https://huggingface.co/${MODEL_ID}/tree/${MODEL_REVISION}`}
          className="underline"
        >
          SmolLM2-135M-Instruct · pinned q8 revision
        </a>
        .
      </DemoFootnote>
    </DemoPage>
  );
}
