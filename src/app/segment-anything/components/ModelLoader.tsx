import type { DownloadProgress, ModelsStatus } from "../types";

interface ModelLoaderProps {
  status: ModelsStatus;
  progress: DownloadProgress;
  provider: "webgpu" | "wasm" | null;
  gpuDevice: string | null;
  error: string | null;
  onLoad: () => void;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ModelLoader({
  status,
  progress,
  provider,
  gpuDevice,
  error,
  onLoad,
}: ModelLoaderProps) {
  if (status === "ready") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>
          Models loaded
          {provider && (
            <span className="text-neutral-500 dark:text-neutral-400">
              {" "}
              &middot; {provider.toUpperCase()}
              {gpuDevice && ` (${gpuDevice})`}
            </span>
          )}
        </span>
      </div>
    );
  }

  if (status === "downloading" || status === "creating-sessions") {
    const totalProgress =
      (progress.imageEncoder + progress.languageEncoder + progress.decoder) / 3;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-neutral-600 dark:text-neutral-300">
            {status === "creating-sessions"
              ? "Creating inference sessions..."
              : `Loading models (${Math.round(totalProgress)}%)`}
          </span>
        </div>
        {status === "downloading" && (
          <div className="space-y-2">
            <ProgressBar value={progress.imageEncoder} label="Image encoder" />
            <ProgressBar
              value={progress.languageEncoder}
              label="Language encoder"
            />
            <ProgressBar value={progress.decoder} label="Decoder" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onLoad}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Load SAM3 Models
      </button>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Chooses the fastest compatible runtime for this browser, prefers
        WebGPU with <code>shader-f16</code> when available, and falls back to
        WASM automatically.
      </p>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
