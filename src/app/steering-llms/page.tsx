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
  MODEL_SHAPE,
  MODEL_BYTES,
  CONTINUATION_INSTRUCTION,
  MODEL_REVISION,
  LAYERS,
  type SteeringSettings,
} from "./presets";
import type { SteeringResponse } from "./worker";
import DIRECTIONS from "@/content/steering-directions.json";

const CONDITIONS: Condition[] = ["baseline", "prompted", "steered"];
const TITLES = {
  baseline: "Original model",
  prompted: "Prompt instruction",
  steered: "Activation steering",
};
function directionSettings(
  item: (typeof DIRECTIONS)[number],
): SteeringSettings {
  return {
    directionId: item.id,
    prompt: item.prompt,
    positive: item.positive,
    negative: item.negative,
    instruction: item.instruction,
    layer: item.variants[0].layer,
    strength: item.variants[0].strength,
    seed: 42,
    temperature: 0.7,
    tokens: 64,
  };
}
export default function SteeringLab() {
  const [presetId, setPresetId] = useState(DIRECTIONS[0].id);
  const [custom, setCustom] = useState(false);
  const [settings, setSettings] = useState<SteeringSettings>(() =>
    directionSettings(DIRECTIONS[0]),
  );
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
  const clearComparison = (message: string) => {
    setResult(null);
    setText({ baseline: "", prompted: "", steered: "" });
    setError("");
    setStatus(message);
  };
  const update = <K extends keyof SteeringSettings>(
    key: K,
    value: SteeringSettings[K],
  ) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    clearComparison("Settings updated · run the comparison");
  };
  const run = () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    clearComparison("Starting comparison…");
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
        if (worker.current !== instance) return;
        setError("The inference worker stopped. Retry to reload the model.");
        setStatus("Run failed · retry available");
        instance.terminate();
        worker.current = null;
        setBusy(false);
        running.current = false;
      };
      worker.current = instance;
    }
    worker.current.postMessage(settings);
  };
  const preset = DIRECTIONS.find((item) => item.id === presetId)!;
  const variant =
    preset.variants.find((item) => item.layer === settings.layer) ??
    preset.variants[0];
  const chooseDirection = (item: typeof preset) => {
    setPresetId(item.id);
    setCustom(false);
    setSettings((previous) => ({
      ...directionSettings(item),
      prompt: previous.prompt,
      seed: previous.seed,
    }));
    clearComparison("Settings updated · run the comparison");
  };
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
                "Mean contrast at last token; assistant-prefill fiction continuation; raw mean difference added at generated tokens only; opening unchanged",
              sharedInstruction: CONTINUATION_INSTRUCTION,
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
        description="Give the model a story opening, then move its internal activations toward a theme. Compare the continuation with ordinary prompting, or try to discover a direction of your own."
      />
      <fieldset disabled={busy} className="mb-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <Button
            aria-pressed={!custom}
            onClick={() => chooseDirection(preset)}
          >
            Tested directions
          </Button>
          <Button
            aria-pressed={custom}
            onClick={() => {
              setCustom(true);
              update("directionId", undefined);
            }}
          >
            Custom contrast pairs
          </Button>
        </div>
        {custom ? (
          <div className="border-l-2 border-[var(--signal)] p-4 text-sm leading-relaxed">
            <strong>Direction discovery is difficult.</strong> A contrast can
            capture wording, topic or token position instead of the behavior you
            intended. A changed output is not proof of a useful direction. Use
            matched pairs, keep evaluation prompts separate, compare against
            zero and prompt controls, and reject directions that break
            coherence. Your custom direction has not been evaluated.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {DIRECTIONS.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={presetId === item.id}
                  className={`border p-4 text-left ${presetId === item.id ? "border-[var(--signal)]" : "border-[var(--line)]"}`}
                  onClick={() => chooseDirection(item)}
                >
                  <span className="block text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-2 block font-mono text-xs text-neutral-500">
                    After block {item.variants.map((v) => v.layer).join(" / ")}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-neutral-500">
              Evaluated on short English story continuations with this pinned
              model. These are subject directions, not universal behavior
              controls.{" "}
              <a
                href="/steering/direction-evaluation.json"
                className="underline"
              >
                Read the outputs, controls and rejected candidates.
              </a>
            </p>
          </>
        )}
      </fieldset>
      {!custom && (
        <details className="mb-6 border border-[var(--line)] p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Evaluation & examples · {preset.title}
          </summary>
          <p className="my-3 text-sm leading-relaxed">
            After block {variant.layer}, α = {variant.strength}:{" "}
            {variant.nativePassed}/{variant.total} reviewed continuations passed
            on CPU and {variant.wasmPassed}/{variant.total} in browser WASM, at
            T = 0.7 and seed 42. This was a small qualitative review of
            recognizable themes and interpretable continuations.
          </p>
          <p className="my-3 text-sm text-neutral-500">{preset.limitation}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {(["original", "steered"] as const).map((condition) => (
              <div key={condition} className="border border-[var(--line)] p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest">
                  Recorded {condition} · browser
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  <span className="text-neutral-500">
                    {preset.example.opening}
                  </span>
                  {preset.example[condition]}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs">
            <a href="/steering/direction-evaluation.json" className="underline">
              All held-out outputs, failures and reviews
            </a>{" "}
            ·{" "}
            <a href="/steering/search-history.json" className="underline">
              Development search history
            </a>
          </p>
        </details>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DemoPanel
          title="Where the intervention happens"
          description={`SmolLM2 · ${MODEL_SHAPE.blocks} transformer blocks · ${MODEL_SHAPE.hidden}-dimensional residual stream`}
        >
          <div className="mb-5 flex items-center gap-3 font-mono text-xs text-neutral-500">
            <span>Prompt</span>
            <span aria-hidden="true">→</span>
            <span>Embedding</span>
            <span aria-hidden="true">→</span>
            <span>Transformer blocks</span>
          </div>
          <div
            className="grid grid-cols-8 gap-1"
            aria-label="Transformer blocks"
          >
            {Array.from({ length: MODEL_SHAPE.blocks }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  disabled={
                    busy ||
                    !(custom
                      ? (LAYERS as readonly number[]).includes(n)
                      : preset.variants.some((v) => v.layer === n))
                  }
                  aria-label={`After block ${n}`}
                  aria-pressed={settings.layer === n}
                  onClick={() => {
                    update("layer", n);
                    if (!custom)
                      update(
                        "strength",
                        preset.variants.find((v) => v.layer === n)!.strength,
                      );
                  }}
                  className={`h-9 border font-mono text-xs ${settings.layer === n ? "border-[var(--signal)] bg-[var(--signal)] text-[var(--background)]" : "border-[var(--line)] disabled:opacity-40"}`}
                >
                  {n}
                </button>
              ),
            )}
          </div>
          <div className="my-5 border-l-2 border-[var(--signal)] pl-4">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              After block {settings.layer}, before block {settings.layer + 1}
            </p>
            <p className="my-2 font-mono text-xl">h′ = h + α · v</p>
            <p className="text-sm leading-relaxed">
              The edited residual enters the remaining attention and MLP blocks.
              Only generated token activations are edited. The prompt pass stays
              unchanged; original and steered share their first token.
            </p>
          </div>
          <fieldset disabled={busy}>
            <label className="block text-sm">
              Strength α = <strong>{settings.strength.toFixed(2)}</strong>
              <input
                aria-label="Steering strength"
                type="range"
                min={custom ? -2 : 0}
                max={custom ? 2 : variant.strength}
                step={0.05}
                className="my-3 w-full"
                value={settings.strength}
                onChange={(e) => update("strength", Number(e.target.value))}
              />
            </label>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{custom ? "− Contrast" : "No intervention"}</span>
              <button
                className="underline"
                onClick={() => update("strength", 0)}
              >
                Zero control
              </button>
              <span>+ {custom ? "Target" : preset.title}</span>
            </div>
          </fieldset>
          <p className="mt-4 text-xs text-neutral-500">
            {custom
              ? "α = 1 adds one raw mean contrast vector. Negative strength reverses it. Large interventions can introduce repetition or break coherence."
              : `Evaluation setting: α = ${variant.strength.toFixed(2)}, after block ${variant.layer}, T = 0.7, seed 42, 64 tokens. Intermediate strengths are exploratory; α = 0 is the unchanged control.`}
          </p>
        </DemoPanel>
        <DemoPanel title="One opening, three continuations">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm">
              Shared story opening
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
            First run downloads a verified {(MODEL_BYTES / 1e6).toFixed(0)} MB
            model plus tokenizer, then caches it. Use a desktop browser with
            enough free memory. Inference stays in a browser worker. This
            compact English instruction model has limited writing ability;
            compare the full outputs.
          </p>
        </DemoPanel>
      </div>
      <details open={custom} className="my-6 border border-[var(--line)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          {custom
            ? "Build your contrast dataset"
            : "Inspect the measured direction’s dataset"}{" "}
          · {settings.positive.length} pairs
        </summary>
        <fieldset disabled={busy}>
          <p className="my-4 text-sm leading-relaxed">
            {custom
              ? "Use 1–8 matched pairs, one example per line, up to 96 model tokens each. Each pair runs through the unmodified model when you start the experiment."
              : "This recipe was evaluated offline. Its vector is measured again on your browser’s inference backend from the dataset below."}{" "}
            We capture the last token after block {settings.layer}, then average
            the target-minus-contrast differences: v = mean(h⁺ − h⁻). These
            examples are separate from the generation prompt.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(["positive", "negative"] as const).map((side) => (
              <label key={side} className="block text-sm">
                {side === "positive" ? "Target" : "Contrast"} · one example per
                line
                <textarea
                  aria-label={`${side} contrast examples`}
                  readOnly={!custom}
                  className="mt-2 h-40 w-full border bg-[var(--surface)] p-3 text-sm"
                  maxLength={4000}
                  value={settings[side].join("\n")}
                  onChange={(e) => update(side, e.target.value.split("\n"))}
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Shared instruction for all conditions: “{CONTINUATION_INSTRUCTION}”
            Your opening is then supplied as the assistant’s unfinished text.
          </p>
          <label className="mt-4 block text-sm">
            Instruction used only by the prompt comparison
            <textarea
              aria-label="Prompt control instruction"
              readOnly={!custom}
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
            aria-label={TITLES[condition]}
            description={
              condition === "baseline"
                ? "Shared opening · no intervention"
                : condition === "prompted"
                  ? "Shared opening + the visible theme instruction"
                  : `Shared opening · internal activation + ${settings.strength.toFixed(2)}v`
            }
          >
            <p
              className="min-h-48 whitespace-pre-wrap break-words text-base leading-relaxed"
              aria-live={busy ? "off" : "polite"}
            >
              {text[condition] ? (
                <>
                  <span className="text-neutral-500">{settings.prompt}</span>
                  {text[condition]}
                </>
              ) : (
                <span className="text-neutral-500">
                  {result
                    ? "The model ended before generating a continuation."
                    : "Run the experiment to generate this continuation."}
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
              description="All 960 measured coordinates · orange is negative, green is positive."
            >
              <svg
                viewBox={`0 0 ${MODEL_SHAPE.hidden} 90`}
                role="img"
                aria-label="Measured activation steering vector"
                className="h-24 w-full"
              >
                <line
                  x1={0}
                  y1={45}
                  x2={MODEL_SHAPE.hidden}
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
                The ratio uses the residual at the measured prediction.
                Coordinates are not independently labeled concepts.
              </p>
            </DemoPanel>
            <DemoPanel title="First edited prediction">
              <p className="text-sm">
                Total variation between original and steered at generated-token
                position {result.outputs.baseline.measurementIndex + 1}:{" "}
                <strong>
                  {(result.nextTokenDivergence * 100).toFixed(1)}%
                </strong>
                .
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {(["baseline", "steered"] as const).map((c) => (
                  <div key={c}>
                    <p className="mb-2 text-xs font-semibold">{TITLES[c]}</p>
                    {result.outputs[c].comparisonTokens.map((t, i) => (
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
                measures distribution change, not writing quality.{" "}
                {actual?.measurementIndex
                  ? "The measurement follows the shared first generated token; later contexts can diverge."
                  : "Generation ended before a generated token could be edited."}
              </p>
              {result.settings.strength === 0 && (
                <p className="mt-3 text-sm">
                  {JSON.stringify(result.outputs.baseline.tokenIds) ===
                  JSON.stringify(actual?.tokenIds)
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
        . Direction selection uses held-out outputs and matched controls; the
        evaluation is small and model-specific. Custom pairs are unvalidated.{" "}
        <a href="/steering/direction-evaluation.json" className="underline">
          Inspect the direction evaluation
        </a>
        . Model:{" "}
        <a
          href={`https://huggingface.co/${MODEL_ID}/tree/${MODEL_REVISION}`}
          className="underline"
        >
          SmolLM2-360M-Instruct · pinned q8 revision
        </a>
        .
      </DemoFootnote>
    </DemoPage>
  );
}
