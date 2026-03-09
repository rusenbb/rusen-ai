import type { InferenceStatus } from "../types";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSegment: () => void;
  disabled: boolean;
  isRunning: boolean;
  modelsReady: boolean;
  imageReady: boolean;
  inferenceStatus: InferenceStatus;
  imageEncoded: boolean;
}

const SUGGESTIONS = ["cat", "dog", "person", "car", "tree", "bird", "building", "sky"];

const STATUS_LABELS: Partial<Record<InferenceStatus, string>> = {
  preparing: "Preparing",
  "encoding-image": "Encoding image",
  "encoding-text": "Encoding text",
  decoding: "Decoding mask",
};

function Spinner({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PromptInput({
  value,
  onChange,
  onSegment,
  disabled,
  isRunning,
  modelsReady,
  imageReady,
  inferenceStatus,
  imageEncoded,
}: PromptInputProps) {
  const canRun = modelsReady && imageReady && value.trim().length > 0 && !isRunning;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canRun) {
      onSegment();
    }
  };

  let placeholder = "Type what to find...";
  if (!modelsReady) placeholder = "Load models first";
  else if (!imageReady) placeholder = "Upload an image first";

  const statusLabel = STATUS_LABELS[inferenceStatus];

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || !modelsReady || !imageReady}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <button
        onClick={onSegment}
        disabled={!canRun}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isRunning ? (
          <>
            <Spinner />
            {statusLabel ?? "Running"}
          </>
        ) : (
          "Segment"
        )}
      </button>

      {isRunning && (
        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <Step
            label="Image"
            active={inferenceStatus === "preparing" || inferenceStatus === "encoding-image"}
            done={inferenceStatus === "encoding-text" || inferenceStatus === "decoding"}
          />
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          <Step
            label="Text"
            active={inferenceStatus === "encoding-text"}
            done={inferenceStatus === "decoding"}
          />
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          <Step
            label="Decode"
            active={inferenceStatus === "decoding"}
            done={false}
          />
        </div>
      )}

      {modelsReady && imageReady && !value.trim() && !isRunning && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onChange(s)}
              className="px-2 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {active ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      ) : done ? (
        <span className="inline-flex rounded-full h-2 w-2 bg-green-500" />
      ) : (
        <span className="inline-flex rounded-full h-2 w-2 bg-neutral-300 dark:bg-neutral-600" />
      )}
      <span className={active ? "text-blue-600 dark:text-blue-400 font-medium" : ""}>
        {label}
      </span>
    </div>
  );
}
