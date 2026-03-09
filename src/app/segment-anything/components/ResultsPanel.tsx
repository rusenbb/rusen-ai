import type { BoxPrompt, SegmentResult, InferenceStatus } from "../types";

interface ResultsPanelProps {
  results: SegmentResult | null;
  inferenceStatus: InferenceStatus;
  imageEncoded: boolean;
  boxPrompt: BoxPrompt | null;
  modelInputSize: number;
}

function TimingRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="font-mono text-neutral-700 dark:text-neutral-300">
        {value.toFixed(2)}s
      </span>
    </div>
  );
}

export default function ResultsPanel({
  results,
  inferenceStatus,
  imageEncoded,
  boxPrompt,
  modelInputSize,
}: ResultsPanelProps) {
  if (inferenceStatus === "preparing") {
    return <StatusMessage>Preparing tokenizer and image...</StatusMessage>;
  }

  if (inferenceStatus === "encoding-image") {
    return (
      <StatusMessage>
        Encoding image... This is the slow step (ViT backbone). Subsequent
        prompts on the same image will be fast.
      </StatusMessage>
    );
  }

  if (inferenceStatus === "encoding-text") {
    return <StatusMessage>Encoding text prompt...</StatusMessage>;
  }

  if (inferenceStatus === "decoding") {
    return <StatusMessage>Running decoder...</StatusMessage>;
  }

  if (!results) {
    if (imageEncoded) {
      return (
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          <p>Image encoded. Type a prompt and click Segment.</p>
          <p className="text-xs mt-1">
            Re-prompting is fast since the image embedding is cached.
          </p>
          {boxPrompt && (
            <p className="text-xs mt-1">
              A visual box prompt is active and will be sent to the decoder.
            </p>
          )}
        </div>
      );
    }
    return null;
  }

  const threshold = 0.3;
  const detections = results.scores.filter((s) => s > threshold).length;
  const topScore = results.scores[0] ?? 0;
  const total =
    results.timings.imageEncoder +
    results.timings.languageEncoder +
    results.timings.decoder;

  return (
    <div className="space-y-4">
      {/* Detection summary */}
      <div>
        {topScore > threshold ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {detections} detection{detections !== 1 ? "s" : ""} found
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              No confident detections (top: {(topScore * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* Scores */}
      {detections > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Scores
          </p>
          {results.scores
            .filter((s) => s > threshold)
            .map((score, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300 w-12 text-right">
                  {(score * 100).toFixed(1)}%
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          Run Context
        </p>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Encoder input
          </span>
          <span className="font-mono text-neutral-700 dark:text-neutral-300">
            {modelInputSize}px
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            Visual prompt
          </span>
          <span className="font-mono text-neutral-700 dark:text-neutral-300">
            {results.boxPromptUsed ? "box" : "none"}
          </span>
        </div>
      </div>

      {/* Timings */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          Timings
        </p>
        <TimingRow label="Image encoder" value={results.timings.imageEncoder} />
        <TimingRow label="Language encoder" value={results.timings.languageEncoder} />
        <TimingRow label="Decoder" value={results.timings.decoder} />
        <div className="pt-1 border-t border-neutral-200 dark:border-neutral-700">
          <TimingRow label="Total" value={total} />
        </div>
      </div>
    </div>
  );
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
      <svg className="w-4 h-4 animate-spin text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p>{children}</p>
    </div>
  );
}
