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
import { EXAMPLE_CORPUS, extractBook, type inspectNgram } from "./model";
import type { Request, Response } from "./worker";

export default function RusenGram() {
  const [selected, setSelected] = useState("alice");
  const [corpus, setCorpus] = useState("");
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState("alice was");
  const [order, setOrder] = useState(3);
  const [alpha, setAlpha] = useState(0);
  const [seed, setSeed] = useState(42);
  const [length, setLength] = useState(80);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState("");
  const [result, setResult] = useState<ReturnType<typeof inspectNgram> | null>(
    null,
  );
  const worker = useRef<Worker | null>(null);
  const serial = useRef(0);
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
      if (data.generated !== undefined) {
        setGenerated(data.generated);
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
    setLoading(true);
    setReady(false);
    setResult(null);
    setGenerated("");
    setError("");
    serial.current++;
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
        setCorpus(text);
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
    if (!corpus) return;
    setReady(false);
    setLoading(true);
    setResult(null);
    setGenerated("");
    send({ id: ++serial.current, action: "train", corpus, order });
  }, [corpus, order]);
  useEffect(() => {
    if (!ready) return;
    setGenerated("");
    setResult(null);
    send({ id: ++serial.current, action: "inspect", prompt, alpha });
  }, [ready, prompt, alpha]);
  const choose = (id: string) => {
    const book = catalog.find((item) => item.id === id);
    setSelected(id);
    setPrompt(book?.prompt ?? "the cat");
    if (!book) {
      setCorpus(EXAMPLE_CORPUS);
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
      <section aria-label="Corpus library" className="mb-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
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
      </section>
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
              Begin with
              <input
                aria-label="Context"
                className="mt-2 w-full border bg-[var(--surface)] p-3"
                value={prompt}
                maxLength={300}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-sm">
                Tokens
                <select
                  aria-label="Generation length"
                  className="ml-2 border bg-[var(--surface)] p-2"
                  value={length}
                  onChange={(e) => {
                    setLength(Number(e.target.value));
                    setGenerated("");
                  }}
                >
                  {[40, 80, 160].map((n) => (
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
                    setSeed(
                      Math.max(1, Math.min(9999, Number(e.target.value))),
                    );
                    setGenerated("");
                  }}
                />
              </label>
              <Button
                disabled={!result?.vocabularySize}
                onClick={() => {
                  setLoading(true);
                  setGenerated("");
                  send({
                    id: ++serial.current,
                    action: "generate",
                    prompt,
                    alpha,
                    seed,
                    length,
                  });
                }}
              >
                Generate {length} tokens
              </Button>
            </div>
          </fieldset>
          <div
            className="mt-6 min-h-44 border-t border-[var(--line)] pt-5"
            aria-live="polite"
          >
            <p className="whitespace-pre-wrap font-serif text-xl leading-relaxed break-words">
              {generated || (
                <span className="text-neutral-500">
                  The next words will be sampled from this edition’s counts.
                </span>
              )}
            </p>
          </div>
          <p role="status" className="mt-3 text-xs text-neutral-500">
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
                onChange={(e) => setOrder(Number(e.target.value))}
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
                onChange={(e) =>
                  setAlpha(Math.max(0, Math.min(1, Number(e.target.value))))
                }
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
      <DemoPanel
        className="mt-6"
        title="What could come next?"
        description="The 50 most likely continuations of your starting context. This is the actual distribution used by the model."
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
                <tr key={row.token} className="border-t border-[var(--line)]">
                  <td className="py-2 font-mono">
                    {row.token === "\n" ? "↵ line break" : row.token}
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
          className="h-72 w-full border bg-[var(--surface)] p-3 font-mono text-xs"
          maxLength={2000000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          className="mt-3"
          disabled={loading || !draft.trim()}
          onClick={() => {
            setSelected("custom");
            setCorpus(draft);
            setError("");
          }}
        >
          Rebuild from edited text
        </Button>
      </details>
      <DemoFootnote>
        Count-based generation runs in a local worker. No text is sent to a
        model service. A fixed corpus, order, smoothing and seed reproduce the
        same continuation; this model learns local phrasing, not meaning.
      </DemoFootnote>
    </DemoPage>
  );
}
