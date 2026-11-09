"use client";

import { Alert } from "@/components/ui";
import type { ClassificationResult, ModelStatus } from "../types";

interface ResultsPanelProps {
  results: ClassificationResult[] | null;
  isClassifying: boolean;
  modelStatus: ModelStatus;
  loadProgress: number;
  error: string | null;
}

const kicker = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

export default function ResultsPanel({ results, isClassifying, modelStatus, loadProgress, error }: ResultsPanelProps) {
  if (error) return <Alert variant="error">{error}</Alert>;

  if (modelStatus === "loading") {
    return (
      <div aria-live="polite" aria-busy="true" role="status">
        <p className={kicker}>Downloading the model · {loadProgress}%</p>
        <div className="mt-3 h-px w-full bg-[var(--line)]">
          <div className="h-px bg-[var(--line-strong)] transition-all duration-300" style={{ width: `${loadProgress}%` }} />
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">About 100 MB, once. Later runs start at once.</p>
      </div>
    );
  }

  if (isClassifying) {
    return (
      <p role="status" aria-live="polite" className={kicker}>
        Reading the text…
      </p>
    );
  }

  if (!results) {
    return (
      <div>
        <p className={kicker}>Result</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Press Classify. The first run downloads the model, about 100 MB.
        </p>
      </div>
    );
  }

  const [top] = results;
  return (
    <div aria-live="polite">
      <p className={kicker}>Best fit</p>
      <p className="mt-1 text-4xl font-semibold first-letter:uppercase sm:text-5xl">{top.label}</p>
      <ul className="mt-6 space-y-3">
        {results.map((result, index) => (
          <li key={result.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={index === 0 ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>{result.label}</span>
              <span className="font-mono tabular-nums">{Math.round(result.score * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--line)]">
              <div
                className={`h-1.5 transition-all duration-500 ${index === 0 ? "bg-accent" : "bg-[var(--sub)]"}`}
                style={{ width: `${result.score * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
