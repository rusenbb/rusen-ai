"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Visualization from "./components/Visualization";
import type { EmbeddingCache, Point, Axis, ArithmeticResult } from "./types";
import { useEmbedding } from "./hooks/useEmbedding";
import {
  computeAxis,
  projectTo2D,
  arithmetic,
  findNearest,
} from "./utils/vectors";

// Default words to show in visualization
const DEFAULT_WORDS = [
  "king",
  "queen",
  "man",
  "woman",
  "boy",
  "girl",
  "prince",
  "princess",
  "father",
  "mother",
  "brother",
  "sister",
  "uncle",
  "aunt",
  "husband",
  "wife",
  "actor",
  "actress",
  "waiter",
  "waitress",
  "doctor",
  "nurse",
  "hero",
  "heroine",
];


// Classic analogies to try
const EXAMPLE_ANALOGIES = [
  { a: "king", b: "man", c: "woman", label: "king - man + woman" },
  { a: "paris", b: "france", c: "germany", label: "paris - france + germany" },
  { a: "walking", b: "walked", c: "swimming", label: "walking - walked + swimming" },
  { a: "good", b: "better", c: "bad", label: "good - better + bad" },
];

export default function EmbeddingExplorerPage() {
  // Embedding hook - handles model loading and embedding computation
  const {
    isLoading: isModelLoading,
    isModelReady,
    loadProgress,
    error: modelError,
    backend,
    embed,
    embedBatch,
    getCached,
    cacheSize,
    stats,
    clearModelCache,
    runSanityCheck,
  } = useEmbedding();

  // Sanity check state
  const [sanityResult, setSanityResult] = useState<{ passed: boolean; details: string } | null>(null);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Local embedding cache for visualization
  const [embeddingCache, setEmbeddingCache] = useState<EmbeddingCache>(new Map());
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState(0);

  // Axes state (simple word difference)
  const [xAxis, setXAxis] = useState<Axis>({ positive: "woman", negative: "man", vector: null });
  const [yAxis, setYAxis] = useState<Axis>({ positive: "good", negative: "bad", vector: null });

  // Words to display
  const [words, setWords] = useState<string[]>(DEFAULT_WORDS);
  const [newWord, setNewWord] = useState("");

  // Selection state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  // Arithmetic state
  const [arithmeticInputs, setArithmeticInputs] = useState({ a: "", b: "", c: "" });
  const [arithmeticResult, setArithmeticResult] = useState<ArithmeticResult | null>(null);

  // Track if initial embedding is done
  const hasInitializedRef = useRef(false);

  // Embed all words that don't have embeddings yet
  const embedWords = useCallback(async (wordsToEmbed: string[]) => {
    if (!isModelReady) return;

    const uncachedWords = wordsToEmbed.filter(w => !embeddingCache.has(w.toLowerCase()));
    if (uncachedWords.length === 0) return;

    setIsEmbedding(true);
    setEmbeddingProgress(0);

    const newCache = new Map(embeddingCache);
    let completed = 0;

    for (const word of uncachedWords) {
      const embedding = await embed(word);
      if (embedding) {
        newCache.set(word.toLowerCase(), embedding);
      }
      completed++;
      setEmbeddingProgress(Math.round((completed / uncachedWords.length) * 100));
    }

    setEmbeddingCache(newCache);
    setIsEmbedding(false);
  }, [isModelReady, embed, embeddingCache]);

  // Initialize default words when model is ready
  useEffect(() => {
    if (isModelReady && !hasInitializedRef.current) {
      hasInitializedRef.current = true;

      // Embed default display words + axis words
      const allWords = [
        ...DEFAULT_WORDS,
        xAxis.positive, xAxis.negative,
        yAxis.positive, yAxis.negative,
      ];
      embedWords([...new Set(allWords)]);
    }
  }, [isModelReady, embedWords, xAxis.positive, xAxis.negative, yAxis.positive, yAxis.negative]);

  // Update axis vectors when cache or axis words change
  useEffect(() => {
    if (embeddingCache.size === 0) return;

    const xVector = computeAxis(embeddingCache, xAxis.positive, xAxis.negative);
    const yVector = computeAxis(embeddingCache, yAxis.positive, yAxis.negative);

    // Only update if we computed a valid vector
    if (xVector) {
      setXAxis((prev) => ({ ...prev, vector: xVector }));
    }
    if (yVector) {
      setYAxis((prev) => ({ ...prev, vector: yVector }));
    }
  }, [embeddingCache, xAxis.positive, xAxis.negative, yAxis.positive, yAxis.negative]);

  // Embed axis words when they change
  const handleAxisChange = useCallback(async (
    axis: "x" | "y",
    field: "positive" | "negative",
    value: string
  ) => {
    const word = value.toLowerCase().trim();

    if (axis === "x") {
      setXAxis(prev => ({ ...prev, [field]: value, vector: null }));
    } else {
      setYAxis(prev => ({ ...prev, [field]: value, vector: null }));
    }

    // Embed the new word if it's not empty
    if (word && !embeddingCache.has(word)) {
      const embedding = await embed(word);
      if (embedding) {
        setEmbeddingCache(prev => new Map(prev).set(word, embedding));
      }
    }
  }, [embed, embeddingCache]);

  // Compute points for visualization
  const points = useMemo((): Point[] => {
    if (!xAxis.vector || !yAxis.vector || embeddingCache.size === 0) return [];

    // Filter words that have embeddings
    const validWords = words.filter((w) => embeddingCache.has(w.toLowerCase()));
    const projected = projectTo2D(validWords, embeddingCache, xAxis.vector, yAxis.vector);

    // Use raw cosine similarity values directly (already in ~[-1, 1] range)
    // No normalization needed - this keeps coordinates stable when adding words
    const allPoints: Point[] = projected.map((p) => ({
      word: p.word,
      x: p.x,
      y: p.y,
      isHighlighted: arithmeticResult?.nearest.some((n) => n.word === p.word.toLowerCase()),
    }));

    // Add arithmetic result point if it exists
    if (arithmeticResult) {
      const resultProjected = projectTo2D(
        [arithmeticResult.nearest[0]?.word || "result"],
        embeddingCache,
        xAxis.vector,
        yAxis.vector
      );
      if (resultProjected.length > 0) {
        const resultPoint = resultProjected[0];
        if (resultPoint && !allPoints.find((p) => p.word === resultPoint.word)) {
          allPoints.push({
            word: `=${resultPoint.word}`,
            x: resultPoint.x,
            y: resultPoint.y,
            isArithmeticResult: true,
          });
        }
      }
    }

    return allPoints;
  }, [words, embeddingCache, xAxis.vector, yAxis.vector, arithmeticResult]);

  // Handle adding a word
  const handleAddWord = useCallback(async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;

    // Embed the word if not cached
    if (!embeddingCache.has(word)) {
      const embedding = await embed(word);
      if (!embedding) {
        alert(`Could not embed "${word}"`);
        return;
      }
      setEmbeddingCache(prev => new Map(prev).set(word, embedding));
    }

    if (!words.includes(word)) {
      setWords((prev) => [...prev, word]);
    }
    setNewWord("");
  }, [newWord, embeddingCache, embed, words]);

  // Handle removing a word
  const handleRemoveWord = useCallback((word: string) => {
    setWords((prev) => prev.filter((w) => w !== word));
  }, []);

  // Handle vector arithmetic
  const handleCompute = useCallback(async () => {
    const { a, b, c } = arithmeticInputs;
    if (!a || !b || !c) return;

    setIsEmbedding(true);

    // Embed words directly and collect results
    const newCache = new Map(embeddingCache);
    const wordsToProcess = [a, b, c];

    for (const word of wordsToProcess) {
      const key = word.toLowerCase();
      if (!newCache.has(key)) {
        const embedding = await embed(word);
        if (embedding) {
          newCache.set(key, embedding);
        }
      }
    }

    // Update the cache state
    setEmbeddingCache(newCache);
    setIsEmbedding(false);

    // Now get vectors from the new cache
    const vecA = newCache.get(a.toLowerCase());
    const vecB = newCache.get(b.toLowerCase());
    const vecC = newCache.get(c.toLowerCase());

    if (!vecA || !vecB || !vecC) {
      alert("Could not embed one or more words");
      return;
    }

    const result = arithmetic(vecA, vecB, vecC);

    // Filter cache to only include words in the display list
    const searchCache = new Map<string, number[]>();
    for (const word of words) {
      const vec = newCache.get(word.toLowerCase());
      if (vec) {
        searchCache.set(word.toLowerCase(), vec);
      }
    }

    const nearest = findNearest(result, searchCache, 5, new Set([a.toLowerCase(), b.toLowerCase(), c.toLowerCase()]));

    setArithmeticResult({ a, b, c, result, nearest });

    // Add result words to the visualization
    const topResults = nearest.slice(0, 3).map((n) => n.word);
    setWords((prev) => {
      const newWords = [...prev];
      for (const word of topResults) {
        if (!newWords.includes(word)) {
          newWords.push(word);
        }
      }
      return newWords;
    });
  }, [arithmeticInputs, embeddingCache, embed, words]);

  // Load example analogy
  const handleLoadExample = useCallback((example: typeof EXAMPLE_ANALOGIES[0]) => {
    setArithmeticInputs({ a: example.a, b: example.b, c: example.c });
  }, []);

  // Handle sanity check
  const handleSanityCheck = useCallback(async () => {
    setIsRunningCheck(true);
    const result = await runSanityCheck();
    setSanityResult(result);
    setIsRunningCheck(false);
  }, [runSanityCheck]);

  // Handle cache clear
  const handleClearCache = useCallback(async () => {
    if (confirm('This will clear the downloaded model and require re-downloading (~50MB). Continue?')) {
      await clearModelCache();
      setSanityResult(null);
      alert('Cache cleared. Please reload the page.');
      window.location.reload();
    }
  }, [clearModelCache]);

  // Axis labels for visualization
  const xAxisLabel = xAxis.vector ? `${xAxis.positive}` : null;
  const yAxisLabel = yAxis.vector ? `${yAxis.positive}` : null;

  // Loading state
  if (!isModelReady) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Embedding Explorer</h1>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-neutral-500">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>
              {isModelLoading
                ? `Loading embedding model... ${loadProgress}%`
                : "Initializing..."}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          <p className="text-sm text-neutral-400">
            Loading mxbai-embed-xsmall-v1 (24M parameters)
            {backend && ` using ${backend.toUpperCase()}`}
          </p>

          {modelError && (
            <div className="p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg">
              {modelError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-2">Embedding Explorer</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Explore word relationships using a neural embedding model running directly in your browser.
        Define axes by word differences, see how words cluster, and try the famous &quot;king - man + woman = queen&quot; analogy.
        <span className="text-neutral-500 text-sm ml-2">
          (Model: mxbai-embed-xsmall • {backend?.toUpperCase()} • {cacheSize} words cached)
        </span>
      </p>

      {/* Embedding progress indicator */}
      {isEmbedding && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-indigo-700 dark:text-indigo-300">
            Embedding words... {embeddingProgress}%
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Axis Definition */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4 overflow-hidden">
            <h3 className="font-medium text-sm">Define Axes</h3>

            {/* X Axis */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500">X Axis (horizontal)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={xAxis.positive}
                  onChange={(e) => handleAxisChange("x", "positive", e.target.value)}
                  placeholder="woman"
                  className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
                <span className="text-neutral-400 shrink-0">−</span>
                <input
                  type="text"
                  value={xAxis.negative}
                  onChange={(e) => handleAxisChange("x", "negative", e.target.value)}
                  placeholder="man"
                  className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
              </div>
              {!xAxis.vector && xAxis.positive && xAxis.negative && embeddingCache.has(xAxis.positive.toLowerCase()) && embeddingCache.has(xAxis.negative.toLowerCase()) && (
                <p className="text-xs text-yellow-600">Computing axis...</p>
              )}
              {xAxis.positive && xAxis.negative && (!embeddingCache.has(xAxis.positive.toLowerCase()) || !embeddingCache.has(xAxis.negative.toLowerCase())) && (
                <p className="text-xs text-neutral-500">Type to embed word</p>
              )}
            </div>

            {/* Y Axis */}
            <div className="space-y-1">
              <label className="text-xs text-neutral-500">Y Axis (vertical)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={yAxis.positive}
                  onChange={(e) => handleAxisChange("y", "positive", e.target.value)}
                  placeholder="good"
                  className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
                <span className="text-neutral-400 shrink-0">−</span>
                <input
                  type="text"
                  value={yAxis.negative}
                  onChange={(e) => handleAxisChange("y", "negative", e.target.value)}
                  placeholder="bad"
                  className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
              </div>
              {yAxis.positive && yAxis.negative && (!embeddingCache.has(yAxis.positive.toLowerCase()) || !embeddingCache.has(yAxis.negative.toLowerCase())) && (
                <p className="text-xs text-neutral-500">Type to embed word</p>
              )}
            </div>
          </div>

          {/* Vector Arithmetic */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
            <h3 className="font-medium text-sm">Vector Arithmetic</h3>
            <p className="text-xs text-neutral-500">Try: A − B + C = ?</p>

            {/* Examples */}
            <div className="flex flex-wrap gap-1">
              {EXAMPLE_ANALOGIES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => handleLoadExample(ex)}
                  className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={arithmeticInputs.a}
                onChange={(e) => setArithmeticInputs((prev) => ({ ...prev, a: e.target.value }))}
                placeholder="king"
                className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
              />
              <span className="text-neutral-400 shrink-0">−</span>
              <input
                type="text"
                value={arithmeticInputs.b}
                onChange={(e) => setArithmeticInputs((prev) => ({ ...prev, b: e.target.value }))}
                placeholder="man"
                className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
              />
              <span className="text-neutral-400 shrink-0">+</span>
              <input
                type="text"
                value={arithmeticInputs.c}
                onChange={(e) => setArithmeticInputs((prev) => ({ ...prev, c: e.target.value }))}
                placeholder="woman"
                className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
              />
            </div>

            <button
              onClick={handleCompute}
              disabled={!arithmeticInputs.a || !arithmeticInputs.b || !arithmeticInputs.c || isEmbedding}
              className="w-full px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEmbedding ? "Embedding..." : "Compute"}
            </button>

            {/* Results */}
            {arithmeticResult && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 mb-2">
                  {arithmeticResult.a} − {arithmeticResult.b} + {arithmeticResult.c} ≈
                </p>
                <div className="space-y-1">
                  {arithmeticResult.nearest.map((n, i) => (
                    <div
                      key={n.word}
                      className={`flex justify-between text-sm px-2 py-1 rounded ${
                        i === 0
                          ? "bg-indigo-50 dark:bg-indigo-950 font-medium"
                          : "bg-neutral-50 dark:bg-neutral-900"
                      }`}
                    >
                      <span>{n.word}</span>
                      <span className="text-neutral-500">{(n.similarity * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add Word */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2">
            <h3 className="font-medium text-sm">Add Words</h3>
            <p className="text-xs text-neutral-500">You can embed any word or phrase</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                placeholder="Type any word or phrase..."
                className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
              />
              <button
                onClick={handleAddWord}
                disabled={!newWord.trim() || isEmbedding}
                className="px-3 py-1.5 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Debug Panel */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              <span>Diagnostics</span>
              <span className="text-xs">{showDebug ? '▲' : '▼'}</span>
            </button>

            {showDebug && (
              <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                {/* Backend info */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Backend:</span>
                    <span className={backend === 'webgpu' ? 'text-green-600' : 'text-yellow-600'}>
                      {backend?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  {stats && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Dimensions:</span>
                        <span>{stats.dimensions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Magnitude:</span>
                        <span>{stats.meanMagnitude.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">king↔queen:</span>
                        <span>{(stats.sampleSimilarity * 100).toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Sanity check */}
                <div className="space-y-2">
                  <button
                    onClick={handleSanityCheck}
                    disabled={!isModelReady || isRunningCheck}
                    className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isRunningCheck ? 'Running...' : 'Run Sanity Check'}
                  </button>

                  {sanityResult && (
                    <div className={`p-2 rounded text-xs ${
                      sanityResult.passed
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}>
                      <div className="font-medium mb-1">
                        {sanityResult.passed ? '✓ All checks passed' : '✗ Issues detected'}
                      </div>
                      <pre className="whitespace-pre-wrap text-[10px] opacity-80">
                        {sanityResult.details}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Cache clear */}
                <button
                  onClick={handleClearCache}
                  className="w-full px-3 py-1.5 text-xs border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Clear Model Cache
                </button>
                <p className="text-[10px] text-neutral-500">
                  If embeddings seem broken, clear the cache and reload. This forces a fresh model download.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center + Right: Visualization */}
        <div className="lg:col-span-2 space-y-4">
          <Visualization
            points={points}
            xAxisLabel={xAxisLabel}
            yAxisLabel={yAxisLabel}
            selectedWord={selectedWord}
            hoveredWord={hoveredWord}
            onSelectWord={setSelectedWord}
            onHoverWord={setHoveredWord}
          />

          {/* Word list */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">Words ({words.length})</h3>
              <button
                onClick={() => setWords(DEFAULT_WORDS)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {words.map((word) => (
                <span
                  key={word}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded cursor-pointer transition-colors ${
                    selectedWord === word
                      ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                      : hoveredWord === word
                      ? "bg-neutral-200 dark:bg-neutral-700"
                      : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                  onClick={() => setSelectedWord(selectedWord === word ? null : word)}
                  onDoubleClick={() => handleRemoveWord(word)}
                >
                  {word}
                  {!embeddingCache.has(word.toLowerCase()) && (
                    <span className="text-yellow-500 text-xs">⏳</span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Click to select, double-click to remove
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="mt-12 p-6 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <h3 className="font-semibold mb-2">How it works</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          This visualization runs <strong>mxbai-embed-xsmall-v1</strong>, a 24-million parameter neural network,
          directly in your browser using {backend === "webgpu" ? "WebGPU acceleration" : "WebAssembly"}.
          Unlike pre-computed embeddings, you can embed <em>any</em> word or phrase in real-time.
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          <strong>Axes</strong> are defined by the difference between two word embeddings. For example, &quot;woman − man&quot;
          creates a direction that captures gender semantics. Projecting words onto this axis shows
          where they fall on that spectrum.
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <strong>Vector arithmetic</strong> works because concepts are encoded as directions. The famous
          &quot;king − man + woman = queen&quot; demonstrates that the model has learned semantic relationships
          that can be manipulated algebraically.
        </p>
      </div>
    </div>
  );
}
