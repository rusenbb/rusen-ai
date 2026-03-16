import type { ProgressInfo } from "@huggingface/transformers";

type LoadProgressState = {
  progress: number;
  message: string;
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function fileLabel(path?: string): string | null {
  if (!path) return null;

  const trimmed = path.split("/").pop()?.trim();
  return trimmed ? trimmed : null;
}

function buildMessage(progressInfo: ProgressInfo): string {
  switch (progressInfo.status) {
    case "initiate":
      return "Preparing model files...";
    case "download":
      return fileLabel(progressInfo.file)
        ? `Starting ${fileLabel(progressInfo.file)}...`
        : "Starting model download...";
    case "progress":
      return fileLabel(progressInfo.file)
        ? `Downloading ${fileLabel(progressInfo.file)}...`
        : "Downloading model...";
    case "progress_total":
      return "Downloading model files...";
    case "done":
      return fileLabel(progressInfo.file)
        ? `Cached ${fileLabel(progressInfo.file)}.`
        : "Caching model files...";
    case "ready":
      return "Model ready.";
    default:
      return "Downloading model...";
  }
}

export function resolveLoadProgress(
  previousProgress: number,
  previousMessage: string | null,
  progressInfo: ProgressInfo,
): LoadProgressState {
  const message = buildMessage(progressInfo);

  if (progressInfo.status === "ready") {
    return { progress: 100, message };
  }

  if (progressInfo.status === "progress_total") {
    return {
      progress: Math.max(previousProgress, clampPercent(progressInfo.progress)),
      message,
    };
  }

  if (progressInfo.status === "progress") {
    return {
      progress: Math.max(previousProgress, clampPercent(progressInfo.progress)),
      message,
    };
  }

  return {
    progress: previousProgress,
    message: previousMessage ?? message,
  };
}
