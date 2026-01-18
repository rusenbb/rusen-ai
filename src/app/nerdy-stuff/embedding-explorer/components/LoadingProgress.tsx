"use client";

interface LoadingProgressProps {
  isModelLoading: boolean;
  modelProgress: number;
  modelError: string | null;
  isEmbedding: boolean;
  embeddingProgress: number;
  isReducing: boolean;
}

export default function LoadingProgress({
  isModelLoading,
  modelProgress,
  modelError,
  isEmbedding,
  embeddingProgress,
  isReducing,
}: LoadingProgressProps) {
  if (!isModelLoading && !isEmbedding && !isReducing && !modelError) {
    return null;
  }

  return (
    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50">
      {modelError && (
        <div className="text-sm text-red-600 dark:text-red-400 mb-2">
          Error: {modelError}
        </div>
      )}

      {isModelLoading && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Loading embedding model...</span>
            <span className="text-neutral-500">{modelProgress}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${modelProgress}%` }}
            />
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            First load downloads ~23MB model (cached for future visits)
          </div>
        </div>
      )}

      {isEmbedding && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Computing embeddings...</span>
            <span className="text-neutral-500">{embeddingProgress}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${embeddingProgress}%` }}
            />
          </div>
        </div>
      )}

      {isReducing && (
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span>Running UMAP dimensionality reduction...</span>
          </div>
        </div>
      )}
    </div>
  );
}
