"use client";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  DemoFootnote,
  DemoHeader,
  DemoPage,
  DemoPanel,
} from "@/components/ui";
import catalog from "@/content/literary-corpora.json";
import {
  EXAMPLE_CORPUS,
  extractBook,
  type SampleStep,
  type inspectNgram,
} from "./model";
import type { Request, Response } from "./worker";

export default function RusenGram() {
  const [selected, setSelected] = useState("alice");
  const [loaded, setLoaded] = useState<{ id: string; text: string } | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState("alice was");
  const [order, setOrder] = useState(3);
  const [alpha, setAlpha] = useState(0);
  const [seed, setSeed] = useState(42);
  const [length, setLength] = useState(80);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walk, setWalk] = useState<{ steps: SampleStep[]; cursor: number }>({
    steps: [],
    cursor: 0,
  });
  const [result, setResult] = useState<ReturnType<typeof inspectNgram> | null>(
    null,
  );
  const worker = useRef<Worker | null>(null);
  const serial = useRef(0);
  const pending = useRef<SampleStep[] | null>(null);
  const context = [
    prompt,
    ...walk.steps.slice(0, walk.cursor).map((step) => step.token),
  ].join(" ");
  const decision = walk.steps[walk.cursor] ?? walk.steps[walk.cursor - 1];
  const edition = catalog.find((book) => book.id === selected);
  const send = (request: Request) => {
    worker.current?.postMessage(request);
  };
  useEffect(() => {
    const instance = new Worker(new URL("./worker.ts", import.meta.url));
    worker.current = instance;
    instance.onmessage = ({ data }: MessageEvent<Response>) => {
      if (data.id !== serial.current) return;
      if (data.error) {
        setError(data.error);
        setLoading(false);
      }
      if (data.ready) {
        setReady(true);
      }
      if (data.result) {
        setResult(data.result);
        setLoading(false);
      }
      if (data.samples && pending.current) {
        const steps = [...pending.current, ...data.samples];
        pending.current = null;
        setResult(null);
        setWalk({ steps, cursor: steps.length });
        setLoading(false);
      }
    };
    instance.onerror = () => {
      setError("The language-model worker stopped. Reload the page to retry.");
      setLoading(false);
    };
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, []);
  useEffect(() => {
    if (!edition) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(edition.path, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Could not load this edition (${response.status}).`);
        const bytes = await response.arrayBuffer();
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          (x) => x.toString(16).padStart(2, "0"),
        ).join("");
        if (hash !== edition.sha256)
          throw new Error(
            "The edition does not match its published checksum. Reload to retry.",
          );
        if (controller.signal.aborted) return;
        const text = extractBook(new TextDecoder().decode(bytes), edition);
        setLoaded({ id: edition.id, text });
        setDraft(text);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Could not load corpus.");
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [edition]);
  useEffect(() => {
    if (!loaded || loaded.id !== selected) return;
    setReady(false);
    setLoading(true);
    setResult(null);
    setWalk({ steps: [], cursor: 0 });
    send({ id: ++serial.current, action: "train", corpus: loaded.text, order });
  }, [loaded, order, selected]);
  useEffect(() => {
    if (!ready) return;
    setResult(null);
    const current = [
      prompt,
      ...walk.steps.slice(0, walk.cursor).map((step) => step.token),
    ].join(" ");
    send({ id: ++serial.current, action: "inspect", prompt: current, alpha });
  }, [ready, prompt, alpha, walk]);
  const resetWalk = () => {
    serial.current++;
    pending.current = null;
    setResult(null);
    setWalk({ steps: [], cursor: 0 });
    setError("");
  };
  const sample = (count: number, token?: string) => {
    if (loading || !result?.vocabularySize || walk.cursor >= 512) return;
    pending.current = walk.steps.slice(0, walk.cursor);
    setLoading(true);
    setError("");
    send({
      id: ++serial.current,
      action: "generate",
      prompt: context,
      alpha,
      seed,
      length: Math.min(count, 512 - walk.cursor),
      offset: walk.cursor,
      token,
    });
  };
  const selectPosition = (cursor: number) => {
    if (loading || cursor === walk.cursor) return;
    serial.current++;
    setResult(null);
    setWalk((previous) => ({ ...previous, cursor }));
  };
  const beginCorpusChange = () => {
    resetWalk();
    setReady(false);
    setLoading(true);
  };
  const choose = (id: string) => {
    if (id === selected) return;
    beginCorpusChange();
    const book = catalog.find((item) => item.id === id);
    setSelected(id);
    setPrompt(book?.prompt ?? "the cat");
    if (!book) {
      setLoaded({ id: "custom", text: EXAMPLE_CORPUS });
      setDraft(EXAMPLE_CORPUS);
    }
  };
  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Language models · a library of possibilities"
        title="RuseN-Gram"
        description="Let a book teach a language model. Switch from a detective story to a sonnet, then follow the counts behind every next word."
      />
      <details
        aria-label="Corpus library"
        className="mb-6 border border-[var(--line)] p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Change book · {edition?.title ?? "Your corpus"}
        </summary>
        <div className="my-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Choose a voice</h2>
          <span className="font-mono text-xs text-neutral-500">
            12 complete source editions · English
          </span>
        </div>
        {(["Fiction", "Poetry"] as const).map((kind) => (
          <div key={kind} className="mb-4">
            <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">
              {kind === "Fiction" ? "Novels & stories" : "Poetry collections"}
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
              {catalog
                .filter((book) => book.kind === kind)
                .map((book) => (
                  <button
                    key={book.id}
                    aria-pressed={selected === book.id}
                    onClick={() => choose(book.id)}
                    className={`min-h-24 border bg-[var(--surface)] p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${selected === book.id ? "border-[var(--signal)] bg-[var(--surface)]" : "border-[var(--line)] hover:bg-[var(--surface)]"}`}
                  >
                    <span className="block text-sm font-semibold leading-snug">
                      {book.title}
                    </span>
                    <span className="mt-2 block text-xs text-neutral-500">
                      {book.author}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}
        <button
          className="text-sm underline underline-offset-4"
          onClick={() => choose("custom")}
        >
          Use your own text / small teaching example
        </button>
      </details>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <DemoPanel
          title={edition?.title ?? "Your corpus"}
          description={
            edition
              ? `${edition.author} · ${(edition.bytes / 1024).toFixed(0)} KB source edition`
              : "Paste your own corpus and rebuild the model."
          }
        >
          <fieldset disabled={loading} className="space-y-4">
            <label className="block text-sm">
              Starting context
              <input
                aria-label="Context"
                className="mt-2 w-full border bg-[var(--surface)] p-3"
                value={prompt}
                maxLength={300}
                onChange={(e) => {
                  resetWalk();
                  setPrompt(e.target.value);
                }}
              />
            </label>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm">
                Batch size
                <select
                  aria-label="Batch size"
                  className="ml-2 border bg-[var(--surface)] p-2"
                  value={length}
                  onChange={(e) => {
                    setLength(Number(e.target.value));
                  }}
                >
                  {[10, 40, 80, 160].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Seed
                <input
                  aria-label="Generation seed"
                  type="number"
                  min={1}
                  max={9999}
                  className="ml-2 w-24 border bg-[var(--surface)] p-2"
                  value={seed}
                  onChange={(e) => {
                    resetWalk();
                    setSeed(
                      Math.max(1, Math.min(9999, Number(e.target.value))),
                    );
                  }}
                />
              </label>
              <Button
                disabled={!result?.vocabularySize || walk.cursor >= 512}
                onClick={() => sample(1)}
              >
                Sample 1 token
              </Button>
              <Button
                disabled={!result?.vocabularySize || walk.cursor >= 512}
                onClick={() => sample(length)}
              >
                Sample {Math.min(length, 512 - walk.cursor)} tokens
              </Button>
              <Button disabled={!walk.steps.length} onClick={resetWalk}>
                Restart
              </Button>
            </div>
          </fieldset>
          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest">
                Sampling path
              </h3>
              <span
                role="status"
                aria-label="Sampling position"
                className="font-mono text-xs"
              >
                Position {walk.cursor} / {walk.steps.length}
              </span>
            </div>
            <button
              disabled={loading}
              aria-pressed={walk.cursor === 0}
              onClick={() => selectPosition(0)}
              className={`mb-3 border px-3 py-2 text-xs ${walk.cursor === 0 ? "border-[var(--signal)]" : "border-[var(--line)]"}`}
            >
              Start · {prompt || "∅"}
            </button>
            <p
              className="min-h-24 max-h-72 overflow-auto whitespace-pre-wrap font-serif text-lg leading-loose break-words"
              aria-label="Generated sampling path"
            >
              {walk.steps.map((step, index) => (
                <span key={index}>
                  <button
                    disabled={loading}
                    aria-label={`Context after token ${index + 1}: ${step.token === "\n" ? "line break" : step.token}`}
                    aria-pressed={walk.cursor === index + 1}
                    onClick={() => selectPosition(index + 1)}
                    className={`rounded-sm px-1 focus-visible:outline-2 focus-visible:outline-[var(--signal)] ${index >= walk.cursor ? "opacity-35" : ""} ${walk.cursor === index + 1 ? "bg-[var(--signal)] text-[var(--background)]" : "hover:bg-[var(--surface)]"}`}
                  >
                    {step.token === "\n" ? "↵" : step.token}
                  </button>
                  {step.token === "\n" ? <br /> : " "}
                </span>
              ))}
              {!walk.steps.length && (
                <span className="text-neutral-500">
                  Sample a token to begin. Click any token later to inspect the
                  context after it.
                </span>
              )}
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              {walk.cursor < walk.steps.length
                ? `Sampling here replaces the ${walk.steps.length - walk.cursor} later tokens. Choose a different continuation to explore a new path.`
                : "Each step updates the context and next-token distribution. You can also choose a token directly from the table."}
            </p>
            {walk.cursor >= 512 && (
              <p className="mt-2 text-xs">
                512-token path limit reached. Restart or branch from an earlier
                position.
              </p>
            )}
          </div>
          {decision && (
            <DemoPanel
              className="mt-5"
              padding="md"
              title={
                walk.cursor < walk.steps.length
                  ? `Recorded choice at position ${walk.cursor + 1}`
                  : `Last choice · token ${walk.cursor}`
              }
            >
              <div className="grid gap-4">
                <div className="text-sm leading-relaxed">
                  <p>
                    <span className="text-neutral-500">
                      Effective context:{" "}
                    </span>
                    <span className="font-mono">
                      {decision.context.join(" ") || "∅ unigram"}
                    </span>
                  </p>
                  <p>
                    <span className="text-neutral-500">
                      {decision.draw === null ? "Manually chosen" : "Sampled"}
                      :{" "}
                    </span>
                    <strong className="font-mono">
                      {decision.token === "\n"
                        ? "↵ line break"
                        : decision.token}
                    </strong>{" "}
                    · {(decision.probability * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="mb-3 font-mono text-xs">
                    {decision.draw === null
                      ? "Manual choice · no random draw used"
                      : `Draw u = ${decision.draw.toFixed(5)}`}{" "}
                    · interval [{decision.lower.toFixed(5)},{" "}
                    {decision.upper.toFixed(5)})
                  </p>
                  <div
                    role="img"
                    aria-label="Sampled token interval on the cumulative probability scale"
                    className="relative h-6 border border-[var(--line)] bg-[var(--surface)]"
                  >
                    <span
                      className="absolute inset-y-0 bg-[var(--signal)] opacity-40"
                      style={{
                        left: `${decision.lower * 100}%`,
                        width: `${(decision.upper - decision.lower) * 100}%`,
                      }}
                    />
                    {decision.draw !== null && (
                      <span
                        className="absolute -top-1 -bottom-1 border-l-2 border-[var(--foreground)]"
                        style={{ left: `${decision.draw * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-xs">
                    <span>0</span>
                    <span>1</span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    Intervals follow vocabulary order. The random draw lands
                    inside the chosen token’s interval. Manual choices occupy a
                    position in the same seeded sequence.
                  </p>
                </div>
              </div>
            </DemoPanel>
          )}
          <p
            role="status"
            aria-label="Corpus status"
            className="mt-3 text-xs text-neutral-500"
          >
            {loading
              ? "Loading / computing locally…"
              : result
                ? `${result.tokenCount.toLocaleString()} tokens · ${result.vocabularySize.toLocaleString()} vocabulary items · n = ${order}`
                : "Choose a corpus."}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {edition && (
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              <a
                href={edition.source}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Source & edition
              </a>{" "}
              ·{" "}
              <a href={edition.path} className="underline" download>
                Download original text
              </a>
              <br />
              {edition.rights}. Original license retained in the download.
            </p>
          )}
        </DemoPanel>
        <DemoPanel title="How much context?">
          <fieldset disabled={loading} className="space-y-4">
            <label className="block text-sm">
              Order n = {order} · remembers up to {order - 1} tokens
              <input
                aria-label="N-gram order"
                type="range"
                min={1}
                max={5}
                value={order}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (next !== order) {
                    beginCorpusChange();
                    setOrder(next);
                  }
                }}
                className="my-3 w-full"
              />
            </label>
            <label className="block text-sm">
              Additive smoothing α
              <input
                aria-label="Smoothing"
                type="number"
                min={0}
                max={1}
                step={0.001}
                value={alpha}
                onChange={(e) => {
                  resetWalk();
                  setAlpha(Math.max(0, Math.min(1, Number(e.target.value))));
                }}
                className="ml-3 w-24 border bg-[var(--surface)] p-2"
              />
            </label>
            <p className="text-sm leading-relaxed text-neutral-500">
              Larger n retains longer phrases and can reproduce passages. At n =
              1 the model only knows word frequencies. Smoothing gives every
              known token a chance, including unlikely continuations.
            </p>
          </fieldset>
          {result && (
            <>
              <div
                className="mt-4 border border-[var(--line)] p-3"
                aria-label="Current context"
              >
                <p className="mb-2 text-xs uppercase tracking-widest">
                  Context at position {walk.cursor}
                </p>
                <p className="whitespace-pre-wrap break-words font-mono text-sm">
                  {result.trace[0]?.context.join(" ") || "∅ unigram"}
                </p>
              </div>
              <DemoPanel
                className="mt-5"
                padding="sm"
                title={`Next token · position ${walk.cursor + 1}`}
                description="The 50 most likely continuations of the current context. Click a token to choose it instead of sampling randomly."
              >
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="pb-2">Token</th>
                        <th>Count</th>
                        <th>Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result?.distribution.map((row) => (
                        <tr
                          key={row.token}
                          className={`border-t border-[var(--line)] ${walk.steps[walk.cursor]?.token === row.token ? "bg-[var(--surface)]" : ""}`}
                        >
                          <td className="py-2 font-mono">
                            <button
                              disabled={loading || walk.cursor >= 512}
                              aria-label={`Choose token: ${row.token === "\n" ? "line break" : row.token}`}
                              onClick={() => sample(1, row.token)}
                              className="min-h-8 text-left underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--signal)]"
                            >
                              {row.token === "\n" ? "↵ line break" : row.token}
                            </button>
                          </td>
                          <td>{row.count}</td>
                          <td>
                            <div className="flex items-center gap-3">
                              <span className="w-16 shrink-0 tabular-nums">
                                {(row.probability * 100).toFixed(2)}%
                              </span>
                              <span
                                className="h-1 bg-[var(--signal)]"
                                style={{ width: `${row.probability * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DemoPanel>
              <p className="mt-4 text-sm">
                Uniform smoothing contributes{" "}
                <strong>{(result.uniformMass * 100).toFixed(1)}%</strong> of
                probability mass here.
              </p>
              <h3 className="mt-5 mb-2 text-xs uppercase tracking-widest">
                Backoff trace
              </h3>
              <ol className="space-y-2">
                {result.trace.map((step, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-[var(--line)] pl-3 text-sm"
                  >
                    <span className="font-mono">
                      {step.context.join(" ") || "∅ unigram"}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {step.total.toLocaleString()} continuations ·{" "}
                      {step.total ? "use this context" : "try a shorter suffix"}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </DemoPanel>
      </div>
      <details className="mt-6 border border-[var(--line)] p-4">
        <summary className="cursor-pointer text-sm">
          Inspect / edit the training text
        </summary>
        <p className="my-3 text-xs text-neutral-500">
          Gutenberg boilerplate, front matter and identified back matter are
          excluded from training. Literary boundaries are recorded for each
          edition. Blank lines delimit paragraphs; transitions never cross them.
          Words are lowercased, punctuation and line breaks are separate tokens.
        </p>
        <textarea
          aria-label="Training corpus"
          disabled={loading}
          className="h-72 w-full border bg-[var(--surface)] p-3 font-mono text-xs"
          maxLength={2000000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          className="mt-3"
          disabled={loading || !draft.trim()}
          onClick={() => {
            beginCorpusChange();
            setSelected("custom");
            setLoaded({ id: "custom", text: draft });
          }}
        >
          Rebuild from edited text
        </Button>
      </details>
      <DemoFootnote>
        Count-based generation runs in a local worker. No text is sent to a
        model service. A fixed corpus, order, smoothing and seed reproduce the
        same continuation in single steps or batches. Changing the starting
        context, seed, order or smoothing starts a new path; changing batch size
        does not. This model learns local phrasing, not meaning.
      </DemoFootnote>
    </DemoPage>
  );
}
