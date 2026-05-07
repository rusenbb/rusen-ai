"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useVisionClassifier, type VisionResult } from "./hooks/useVisionClassifier";

const PRESET_LABELS = ["a photo of a cat", "a photo of a dog", "a photo of a bird", "a photo of a person"];

export default function VisionAnythingPage() {
  const { isLoading, isModelReady, loadProgress, status, error, classify } = useVisionClassifier();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>(PRESET_LABELS);
  const [labelInput, setLabelInput] = useState<string>("");
  const [results, setResults] = useState<VisionResult[] | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setResults(null);
    setClassifyError(null);
  }, []);

  const handleAddLabel = useCallback(() => {
    const trimmed = labelInput.trim();
    if (!trimmed) return;
    if (labels.includes(trimmed)) return;
    setLabels((prev) => [...prev, trimmed]);
    setLabelInput("");
  }, [labelInput, labels]);

  const handleRemoveLabel = useCallback((index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClassify = useCallback(async () => {
    if (!imageUrl || labels.length < 2) return;
    setIsClassifying(true);
    setClassifyError(null);
    try {
      const out = await classify(imageUrl, labels);
      setResults(out);
    } catch (err) {
      setClassifyError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setIsClassifying(false);
    }
  }, [imageUrl, labels, classify]);

  const top = results?.[0];
  const max = results ? Math.max(...results.map((r) => r.score), 1e-6) : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <p className="text-xs font-mono tracking-[0.18em] text-neutral-500 dark:text-neutral-500 mb-2">
          COMPUTER VISION / ZERO-SHOT
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Vision Anything</h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty">
          Drop an image, type the labels you care about, and a CLIP-class model ranks them in your browser. No backend; the model runs via WebAssembly.
        </p>
      </div>

      {/* Model status strip */}
      <div className="mb-6">
        {status === "loading" && (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/60 dark:bg-neutral-900/60">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-600 dark:text-neutral-400">
              <span>Loading CLIP model · first run only · cached after</span>
              <span>{loadProgress}%</span>
            </div>
            <div className="mt-2 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        )}
        {status === "ready" && (
          <div className="text-xs font-mono text-green-600 dark:text-green-400">Model ready · {(loadProgress / 1).toFixed(0)}% loaded</div>
        )}
        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: image */}
        <div className="space-y-3">
          <label
            htmlFor="vision-file"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="block aspect-[4/3] w-full rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition cursor-pointer relative overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/50"
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Uploaded"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
                <span className="text-3xl mb-2">⌘</span>
                <span className="font-medium">Drop an image, or click to upload</span>
                <span className="mt-1 text-xs text-neutral-400">PNG · JPG · WebP</span>
              </div>
            )}
            <input
              id="vision-file"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          {imageUrl && (
            <button
              type="button"
              onClick={() => {
                setImageUrl(null);
                setResults(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 underline underline-offset-2"
            >
              Clear image
            </button>
          )}
        </div>

        {/* Right: labels + classify + results */}
        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold mb-2 text-neutral-800 dark:text-neutral-200">Labels</h2>
            <p className="text-xs text-neutral-500 mb-3">
              CLIP works best with full prompts. Try <span className="font-mono">&quot;a photo of a&quot;</span> prefixes.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {labels.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-mono"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(i)}
                    className="text-neutral-400 hover:text-red-500"
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                placeholder="add a label, press Enter"
                className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                className="px-3 py-2 text-sm font-mono rounded-md border border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 transition"
              >
                Add
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClassify}
            disabled={!imageUrl || labels.length < 2 || isClassifying || isLoading || !isModelReady}
            className="w-full px-4 py-3 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {isClassifying ? "Classifying…" : isLoading ? `Loading model… ${loadProgress}%` : "Classify"}
          </button>

          {classifyError && (
            <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              {classifyError}
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Results
                {top && (
                  <span className="ml-2 text-xs font-mono text-neutral-500">
                    best: {top.label} ({(top.score * 100).toFixed(1)}%)
                  </span>
                )}
              </h2>
              <ul className="space-y-1.5">
                {results.map((r) => {
                  const pct = (r.score / max) * 100;
                  const isTop = r === top;
                  return (
                    <li key={r.label} className="space-y-1">
                      <div className="flex items-baseline justify-between text-xs font-mono">
                        <span className={isTop ? "text-cyan-600 dark:text-cyan-400 font-semibold" : "text-neutral-700 dark:text-neutral-300"}>{r.label}</span>
                        <span className="text-neutral-500 tabular-nums">{(r.score * 100).toFixed(2)}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${isTop ? "bg-cyan-500" : "bg-neutral-400 dark:bg-neutral-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
