"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Visualization from "./components/Visualization";
import type {
  EmbeddingCache,
  Point,
  Axis,
  ArithmeticResult,
  ArithmeticMode,
  ArithmeticTerm,
  ProjectionMode,
} from "./types";
import { useEmbedding } from "./hooks/useEmbedding";
import {
  computeAxis,
  projectTo2D,
  projectVectorTo2D,
  findNearest,
  normalizePoints,
} from "./utils/vectors";
import {
  buildExplorerShareUrl,
  readExplorerState,
  type ExplorerUrlState,
} from "./utils/urlState";
import { Alert, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

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
  "doctor",
  "nurse",
  "hero",
  "heroine",
  "scientist",
  "teacher",
];

const EXAMPLE_ANALOGIES = [
  { a: "king", b: "man", c: "woman", label: "king - man + woman" },
  { a: "paris", b: "france", c: "germany", label: "paris - france + germany" },
  { a: "walking", b: "walked", c: "swimming", label: "walking - walked + swimming" },
  { a: "good", b: "better", c: "bad", label: "good - better + bad" },
];

const WORD_SETS = [
  {
    id: "family-royalty",
    title: "Family + Royalty",
    description: "Roles, kinship, and court titles for analogy-heavy exploration.",
    words: DEFAULT_WORDS,
  },
  {
    id: "cities-countries",
    title: "Cities + Countries",
    description: "Capitals, countries, and regions for geography analogies.",
    words: [
      "paris",
      "france",
      "berlin",
      "germany",
      "rome",
      "italy",
      "madrid",
      "spain",
      "ankara",
      "turkey",
      "istanbul",
      "london",
      "england",
      "tokyo",
      "japan",
      "athens",
      "greece",
      "europe",
    ],
  },
  {
    id: "emotions-values",
    title: "Emotions + Values",
    description: "Mood, ethics, and judgment words that work well with semantic axes.",
    words: [
      "good",
      "bad",
      "happy",
      "sad",
      "joy",
      "grief",
      "calm",
      "anxious",
      "brave",
      "afraid",
      "kind",
      "cruel",
      "honest",
      "deceitful",
      "hopeful",
      "angry",
      "gentle",
      "harsh",
    ],
  },
  {
    id: "professions",
    title: "Professions",
    description: "Careers and social roles for occupational clustering.",
    words: [
      "doctor",
      "nurse",
      "teacher",
      "scientist",
      "engineer",
      "artist",
      "writer",
      "lawyer",
      "chef",
      "pilot",
      "farmer",
      "designer",
      "manager",
      "student",
      "researcher",
      "musician",
      "programmer",
      "architect",
    ],
  },
  {
    id: "animals-nature",
    title: "Animals + Nature",
    description: "Animals, habitats, and landscape terms for cluster discovery.",
    words: [
      "lion",
      "tiger",
      "wolf",
      "dog",
      "cat",
      "eagle",
      "shark",
      "whale",
      "forest",
      "river",
      "mountain",
      "ocean",
      "desert",
      "jungle",
      "island",
      "storm",
      "rain",
      "sunlight",
    ],
  },
  {
    id: "technology",
    title: "Technology",
    description: "Hardware, software, and AI concepts for contemporary semantic neighborhoods.",
    words: [
      "computer",
      "laptop",
      "phone",
      "tablet",
      "internet",
      "browser",
      "server",
      "database",
      "algorithm",
      "robot",
      "software",
      "hardware",
      "network",
      "cloud",
      "model",
      "embedding",
      "token",
      "prompt",
    ],
  },
] as const;

const DEFAULT_X_AXIS = { positive: "woman", negative: "man" };
const DEFAULT_Y_AXIS = { positive: "good", negative: "bad" };
const DEFAULT_ARITHMETIC = { a: "", b: "", c: "" };
const DEFAULT_OPEN_ARITHMETIC_TERMS: ArithmeticTerm[] = [
  { operation: "+", value: "king" },
  { operation: "-", value: "man" },
  { operation: "+", value: "woman" },
];
const DEFAULT_WORD_SET_ID = "family-royalty";
const DEFAULT_ARITHMETIC_MODE: ArithmeticMode = "classic";
const DEFAULT_PROJECTION_MODE: ProjectionMode = "axes";

function normalizeTerm(value: string): string {
  return value.toLowerCase().trim();
}

function uniqueTerms(values: string[]): string[] {
  return [...new Set(values.map(normalizeTerm).filter(Boolean))];
}

function normalizeArithmeticTerms(terms: ArithmeticTerm[]): ArithmeticTerm[] {
  const normalized = terms.map((term, index) => ({
    operation: index === 0 ? (term.operation === "-" ? "-" : "+") : term.operation,
    value: normalizeTerm(term.value),
  }));

  return normalized.length > 0 ? normalized : DEFAULT_OPEN_ARITHMETIC_TERMS;
}

function buildClassicTerms(inputs: { a: string; b: string; c: string }): ArithmeticTerm[] {
  return [
    { operation: "+", value: normalizeTerm(inputs.a) },
    { operation: "-", value: normalizeTerm(inputs.b) },
    { operation: "+", value: normalizeTerm(inputs.c) },
  ];
}

function buildArithmeticExpression(terms: ArithmeticTerm[]): string {
  return terms
    .map((term, index) => {
      const value = normalizeTerm(term.value);
      if (!value) return null;
      if (index === 0) {
        return term.operation === "-" ? `- ${value}` : value;
      }
      return `${term.operation} ${value}`;
    })
    .filter((term): term is string => term !== null)
    .join(" ");
}

function getWordSetWords(ids: string[]): string[] {
  return uniqueTerms(
    WORD_SETS.filter((set) => ids.includes(set.id)).flatMap((set) => set.words)
  );
}

function createSeededRandom(seedText: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createInitialState(): ExplorerUrlState {
  const fallback: ExplorerUrlState = {
    projectionMode: DEFAULT_PROJECTION_MODE,
    words: DEFAULT_WORDS,
    selectedWordSetIds: [DEFAULT_WORD_SET_ID],
    xAxis: DEFAULT_X_AXIS,
    yAxis: DEFAULT_Y_AXIS,
    arithmeticMode: DEFAULT_ARITHMETIC_MODE,
    arithmeticInputs: DEFAULT_ARITHMETIC,
    openArithmeticTerms: DEFAULT_OPEN_ARITHMETIC_TERMS,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const state = readExplorerState(window.location.search);

  return {
    projectionMode: state?.projectionMode ?? DEFAULT_PROJECTION_MODE,
    words: state?.words && state.words.length > 0 ? uniqueTerms(state.words) : DEFAULT_WORDS,
    selectedWordSetIds:
      state?.selectedWordSetIds && state.selectedWordSetIds.length > 0
        ? uniqueTerms(state.selectedWordSetIds)
        : [DEFAULT_WORD_SET_ID],
    xAxis: {
      positive: normalizeTerm(state?.xAxis?.positive ?? DEFAULT_X_AXIS.positive),
      negative: normalizeTerm(state?.xAxis?.negative ?? DEFAULT_X_AXIS.negative),
    },
    yAxis: {
      positive: normalizeTerm(state?.yAxis?.positive ?? DEFAULT_Y_AXIS.positive),
      negative: normalizeTerm(state?.yAxis?.negative ?? DEFAULT_Y_AXIS.negative),
    },
    arithmeticMode: state?.arithmeticMode ?? DEFAULT_ARITHMETIC_MODE,
    arithmeticInputs: {
      a: normalizeTerm(state?.arithmeticInputs?.a ?? DEFAULT_ARITHMETIC.a),
      b: normalizeTerm(state?.arithmeticInputs?.b ?? DEFAULT_ARITHMETIC.b),
      c: normalizeTerm(state?.arithmeticInputs?.c ?? DEFAULT_ARITHMETIC.c),
    },
    openArithmeticTerms: normalizeArithmeticTerms(
      state?.openArithmeticTerms ?? DEFAULT_OPEN_ARITHMETIC_TERMS
    ),
  };
}

export default function EmbeddingExplorerPage() {
  const initialState = useMemo(() => createInitialState(), []);
  const {
    isLoading: isModelLoading,
    isModelReady,
    loadProgress,
    error: modelError,
    backend,
    embed,
    cacheSize,
  } = useEmbedding();

  const [embeddingCache, setEmbeddingCache] = useState<EmbeddingCache>(new Map());
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState(0);
  const [embeddingLabel, setEmbeddingLabel] = useState("Embedding words");

  const [projectionMode, setProjectionMode] = useState<ProjectionMode>(initialState.projectionMode);
  const [isProjecting, setIsProjecting] = useState(false);
  const [projectionNotice, setProjectionNotice] = useState("UMAP manifold is ready when you are.");
  const [umapPoints, setUmapPoints] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [umapResultPoint, setUmapResultPoint] = useState<{ x: number; y: number } | null>(null);

  const [xAxis, setXAxis] = useState<Axis>({ ...initialState.xAxis, vector: null });
  const [yAxis, setYAxis] = useState<Axis>({ ...initialState.yAxis, vector: null });

  const [selectedWordSetIds, setSelectedWordSetIds] = useState<string[]>(initialState.selectedWordSetIds);
  const [hoveredWordSetId, setHoveredWordSetId] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>(initialState.words);
  const [newWord, setNewWord] = useState("");

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const [arithmeticMode, setArithmeticMode] = useState<ArithmeticMode>(initialState.arithmeticMode);
  const [arithmeticInputs, setArithmeticInputs] = useState(initialState.arithmeticInputs);
  const [openArithmeticTerms, setOpenArithmeticTerms] = useState<ArithmeticTerm[]>(
    initialState.openArithmeticTerms
  );
  const [arithmeticResult, setArithmeticResult] = useState<ArithmeticResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const hasInitializedRef = useRef(false);
  const isBootstrappingRef = useRef(false);
  const activeEmbeddingJobsRef = useRef(0);
  const umapTransformRef = useRef<{ transform: (vectors: number[][]) => number[][] } | null>(null);

  const mergeEmbeddings = useCallback((entries: Map<string, number[]>) => {
    if (entries.size === 0) return;

    setEmbeddingCache((prev) => {
      const next = new Map(prev);
      entries.forEach((vector, word) => {
        next.set(normalizeTerm(word), vector);
      });
      return next;
    });
  }, []);

  const embedWords = useCallback(
    async (wordsToEmbed: string[], label: string) => {
      if (!isModelReady) return new Map<string, number[]>();

      const uncachedWords = uniqueTerms(wordsToEmbed).filter((word) => !embeddingCache.has(word));
      if (uncachedWords.length === 0) return new Map<string, number[]>();

      activeEmbeddingJobsRef.current += 1;
      setIsEmbedding(true);
      setEmbeddingLabel(label);
      setEmbeddingProgress(0);

      const freshEmbeddings = new Map<string, number[]>();
      let completed = 0;

      try {
        for (const word of uncachedWords) {
          const embedding = await embed(word);
          if (embedding) {
            freshEmbeddings.set(word, embedding);
          }

          completed += 1;
          setEmbeddingProgress(Math.round((completed / uncachedWords.length) * 100));
        }

        mergeEmbeddings(freshEmbeddings);
        return freshEmbeddings;
      } finally {
        activeEmbeddingJobsRef.current -= 1;
        if (activeEmbeddingJobsRef.current <= 0) {
          activeEmbeddingJobsRef.current = 0;
          setIsEmbedding(false);
          setEmbeddingProgress(0);
        }
      }
    },
    [embed, embeddingCache, isModelReady, mergeEmbeddings]
  );

  useEffect(() => {
    if (!isModelReady || hasInitializedRef.current) return;

    hasInitializedRef.current = true;
    isBootstrappingRef.current = true;

    const starterWords = uniqueTerms([
      ...words,
      xAxis.positive,
      xAxis.negative,
      yAxis.positive,
      yAxis.negative,
    ]);

    void (async () => {
      await embedWords(starterWords, "Embedding starter set");
      isBootstrappingRef.current = false;
    })();
  }, [embedWords, isModelReady, words, xAxis.negative, xAxis.positive, yAxis.negative, yAxis.positive]);

  useEffect(() => {
    if (!isModelReady || isBootstrappingRef.current) return;

    const timer = window.setTimeout(() => {
      void embedWords(
        [xAxis.positive, xAxis.negative, yAxis.positive, yAxis.negative],
        "Embedding axis words"
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [embedWords, isModelReady, xAxis.negative, xAxis.positive, yAxis.negative, yAxis.positive]);

  useEffect(() => {
    if (embeddingCache.size === 0) return;

    const nextXVector = computeAxis(embeddingCache, xAxis.positive, xAxis.negative);
    const nextYVector = computeAxis(embeddingCache, yAxis.positive, yAxis.negative);

    setXAxis((prev) => ({ ...prev, vector: nextXVector }));
    setYAxis((prev) => ({ ...prev, vector: nextYVector }));
  }, [embeddingCache, xAxis.negative, xAxis.positive, yAxis.negative, yAxis.positive]);

  useEffect(() => {
    if (projectionMode !== "umap") {
      umapTransformRef.current = null;
      setUmapPoints(new Map());
      setUmapResultPoint(null);
      setProjectionNotice("Semantic axes stay stable while you add more words.");
      return;
    }

    const validWords = words.filter((word) => embeddingCache.has(normalizeTerm(word)));
    if (validWords.length < 3) {
      umapTransformRef.current = null;
      setUmapPoints(new Map());
      setUmapResultPoint(null);
      setProjectionNotice("UMAP needs at least three embedded items.");
      return;
    }

    let isCancelled = false;

    void (async () => {
      setIsProjecting(true);
      setProjectionNotice(`Projecting ${validWords.length} items with UMAP...`);

      try {
        const { UMAP } = await import("umap-js");
        if (isCancelled) return;

        const dataset = validWords.map((word) => embeddingCache.get(normalizeTerm(word)) as number[]);
        const umap = new UMAP({
          nComponents: 2,
          nNeighbors: Math.max(2, Math.min(12, validWords.length - 1)),
          minDist: 0.18,
          spread: 1,
          nEpochs: Math.max(200, validWords.length * 10),
          random: createSeededRandom(validWords.join("|")),
        });

        const embedding = await umap.fitAsync(dataset, () => !isCancelled);
        if (isCancelled) return;

        const nextPoints = new Map<string, { x: number; y: number }>();
        validWords.forEach((word, index) => {
          const [x, y] = embedding[index] ?? [0, 0];
          nextPoints.set(normalizeTerm(word), { x, y });
        });

        umapTransformRef.current = umap;
        setUmapPoints(nextPoints);
        setProjectionNotice(`UMAP shows local neighborhoods across ${validWords.length} items.`);
      } catch (error) {
        console.error("Error computing UMAP projection:", error);
        umapTransformRef.current = null;
        setUmapPoints(new Map());
        setProjectionNotice("UMAP projection failed. The axis view is still available.");
      } finally {
        if (!isCancelled) {
          setIsProjecting(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [embeddingCache, projectionMode, words]);

  useEffect(() => {
    if (projectionMode !== "umap" || !arithmeticResult || !umapTransformRef.current) {
      setUmapResultPoint(null);
      return;
    }

    try {
      const transformed = umapTransformRef.current.transform([arithmeticResult.result]);
      const [x, y] = transformed[0] ?? [NaN, NaN];

      if (Number.isFinite(x) && Number.isFinite(y)) {
        setUmapResultPoint({ x, y });
      } else {
        setUmapResultPoint(null);
      }
    } catch (error) {
      console.error("Error transforming arithmetic result with UMAP:", error);
      setUmapResultPoint(null);
    }
  }, [arithmeticResult, projectionMode, umapPoints]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextUrl = buildExplorerShareUrl(window.location.pathname, window.location.search, {
      projectionMode,
      words,
      selectedWordSetIds,
      xAxis: { positive: xAxis.positive, negative: xAxis.negative },
      yAxis: { positive: yAxis.positive, negative: yAxis.negative },
      arithmeticMode,
      arithmeticInputs,
      openArithmeticTerms,
    });

    window.history.replaceState(null, "", nextUrl);
  }, [arithmeticInputs, arithmeticMode, openArithmeticTerms, projectionMode, selectedWordSetIds, words, xAxis.negative, xAxis.positive, yAxis.negative, yAxis.positive]);

  useEffect(() => {
    if (copyStatus === "idle") return;

    const timer = window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const points = useMemo((): Point[] => {
    if (projectionMode === "umap") {
      const manifoldPoints: Point[] = [];

      for (const word of words) {
        const point = umapPoints.get(normalizeTerm(word));
        if (!point) continue;

        manifoldPoints.push({
          word,
          x: point.x,
          y: point.y,
          isHighlighted: arithmeticResult?.nearest.some((candidate) => candidate.word === normalizeTerm(word)),
        });
      }

      const withResult = arithmeticResult && umapResultPoint
        ? [
            ...manifoldPoints,
            {
              word: "=result",
              x: umapResultPoint.x,
              y: umapResultPoint.y,
              isArithmeticResult: true,
            },
          ]
        : manifoldPoints;

      return normalizePoints(withResult);
    }

    if (!xAxis.vector || !yAxis.vector || embeddingCache.size === 0) return [];

    const projected = projectTo2D(
      words.filter((word) => embeddingCache.has(normalizeTerm(word))),
      embeddingCache,
      xAxis.vector,
      yAxis.vector
    );

    const axisPoints: Point[] = projected.map((point) => ({
      word: point.word,
      x: point.x,
      y: point.y,
      isHighlighted: arithmeticResult?.nearest.some((candidate) => candidate.word === normalizeTerm(point.word)),
    }));

    if (arithmeticResult) {
      const resultPoint = projectVectorTo2D(arithmeticResult.result, xAxis.vector, yAxis.vector);
      axisPoints.push({
        word: "=result",
        x: resultPoint.x,
        y: resultPoint.y,
        isArithmeticResult: true,
      });
    }

    return axisPoints;
  }, [arithmeticResult, embeddingCache, projectionMode, umapPoints, umapResultPoint, words, xAxis.vector, yAxis.vector]);

  const selectedNeighbors = useMemo(() => {
    if (!selectedWord || selectedWord === "=result") return [];

    const vector = embeddingCache.get(normalizeTerm(selectedWord));
    if (!vector) return [];

    return findNearest(vector, embeddingCache, 5, new Set([normalizeTerm(selectedWord)]));
  }, [embeddingCache, selectedWord]);

  const activeArithmeticTerms = useMemo(
    () =>
      arithmeticMode === "open"
        ? normalizeArithmeticTerms(openArithmeticTerms)
        : buildClassicTerms(arithmeticInputs),
    [arithmeticInputs, arithmeticMode, openArithmeticTerms]
  );

  const canCompute = useMemo(() => {
    const normalizedTerms = activeArithmeticTerms.filter((term) => normalizeTerm(term.value));
    return normalizedTerms.length > 0 && normalizedTerms.length === activeArithmeticTerms.length;
  }, [activeArithmeticTerms]);

  const displayedWordSet = useMemo(() => {
    const fallbackId = hoveredWordSetId ?? selectedWordSetIds[0] ?? DEFAULT_WORD_SET_ID;
    return WORD_SETS.find((wordSet) => wordSet.id === fallbackId) ?? WORD_SETS[0];
  }, [hoveredWordSetId, selectedWordSetIds]);

  const handleAxisChange = useCallback(
    (axis: "x" | "y", field: "positive" | "negative", value: string) => {
      const normalized = normalizeTerm(value);

      if (axis === "x") {
        setXAxis((prev) => ({ ...prev, [field]: normalized, vector: null }));
        return;
      }

      setYAxis((prev) => ({ ...prev, [field]: normalized, vector: null }));
    },
    []
  );

  const handleAddWord = useCallback(async () => {
    const word = normalizeTerm(newWord);
    if (!word) return;

    const freshEmbeddings = await embedWords([word], `Embedding "${word}"`);
    const nextCache = new Map(embeddingCache);
    freshEmbeddings.forEach((vector, key) => nextCache.set(key, vector));

    if (!nextCache.has(word)) {
      alert(`Could not embed "${word}"`);
      return;
    }

    if (!words.includes(word)) {
      setWords((prev) => [...prev, word]);
    }

    setNewWord("");
  }, [embedWords, embeddingCache, newWord, words]);

  const handleRemoveWord = useCallback((word: string) => {
    setWords((prev) => prev.filter((candidate) => candidate !== word));
    setSelectedWord((prev) => (prev === word ? null : prev));
    setHoveredWord((prev) => (prev === word ? null : prev));
  }, []);

  const handleToggleWordSet = useCallback(
    async (wordSetId: string) => {
      const currentPresetWords = new Set(getWordSetWords(selectedWordSetIds));
      const customWords = words.filter((word) => !currentPresetWords.has(word));

      const nextSelectedIds = selectedWordSetIds.includes(wordSetId)
        ? selectedWordSetIds.filter((id) => id !== wordSetId)
        : [...selectedWordSetIds, wordSetId];

      const nextWords = uniqueTerms([...customWords, ...getWordSetWords(nextSelectedIds)]);

      setSelectedWordSetIds(nextSelectedIds);
      setWords(nextWords);
      setSelectedWord(null);
      setHoveredWord(null);
      setArithmeticResult(null);

      if (nextWords.length > 0) {
        await embedWords(nextWords, "Embedding selected word sets");
      }
    },
    [embedWords, selectedWordSetIds, words]
  );

  const handleCompute = useCallback(async () => {
    const normalizedTerms = activeArithmeticTerms.map((term, index) => ({
      operation: index === 0 ? (term.operation === "-" ? "-" : "+") : term.operation,
      value: normalizeTerm(term.value),
    }));
    const termValues = normalizedTerms.map((term) => term.value);
    if (termValues.some((value) => !value)) return;

    const freshEmbeddings = await embedWords(termValues, "Embedding arithmetic inputs");
    const nextCache = new Map(embeddingCache);
    freshEmbeddings.forEach((vector, key) => nextCache.set(key, vector));

    let result: number[] | null = null;

    for (const term of normalizedTerms) {
      const vector = nextCache.get(term.value);
      if (!vector) {
        alert("Could not embed one or more inputs");
        return;
      }

      if (result === null) {
        result = term.operation === "-" ? vector.map((value) => -value) : [...vector];
        continue;
      }

      result = term.operation === "+"
        ? result.map((value, index) => value + vector[index])
        : result.map((value, index) => value - vector[index]);
    }

    if (!result) return;

    const expression = buildArithmeticExpression(normalizedTerms);
    const nearest = findNearest(result, nextCache, 5, new Set(termValues));

    setArithmeticResult({ expression, terms: normalizedTerms, result, nearest });

    const topResults = nearest.slice(0, 3).map((candidate) => candidate.word);
    setWords((prev) => {
      const nextWords = [...prev];
      for (const word of topResults) {
        if (!nextWords.includes(word)) {
          nextWords.push(word);
        }
      }
      return nextWords;
    });
  }, [activeArithmeticTerms, embedWords, embeddingCache]);

  const handleLoadExample = useCallback((example: (typeof EXAMPLE_ANALOGIES)[number]) => {
    setArithmeticInputs({ a: example.a, b: example.b, c: example.c });
    setOpenArithmeticTerms(buildClassicTerms(example));
  }, []);

  const handleOpenArithmeticTermChange = useCallback(
    (index: number, field: "operation" | "value", value: string) => {
      setOpenArithmeticTerms((prev) =>
        prev.map((term, termIndex) => {
          if (termIndex !== index) return term;

          if (field === "operation") {
            return {
              ...term,
              operation: value === "-" ? "-" : "+",
            };
          }

          return {
            ...term,
            value: normalizeTerm(value),
          };
        })
      );
    },
    []
  );

  const handleAddArithmeticTerm = useCallback(() => {
    setOpenArithmeticTerms((prev) => [...prev, { operation: "+", value: "" }]);
  }, []);

  const handleRemoveArithmeticTerm = useCallback((index: number) => {
    setOpenArithmeticTerms((prev) => {
      if (prev.length === 1) {
        return [{ operation: "+", value: "" }];
      }

      return prev.filter((_, termIndex) => termIndex !== index);
    });
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }, []);

  const axisLabels = {
    xPositive: projectionMode === "axes" ? xAxis.positive : null,
    xNegative: projectionMode === "axes" ? xAxis.negative : null,
    yPositive: projectionMode === "axes" ? yAxis.positive : null,
    yNegative: projectionMode === "axes" ? yAxis.negative : null,
  };

  if (!isModelReady) {
    return (
      <DemoPage width="lg">
        <DemoHeader eyebrow="NLP / Embeddings" title="Embedding Explorer" description="Load a local embedding model and inspect semantic geometry in a shareable workspace." />
        <DemoPanel
          title="Model Loading"
          description="The embedding runtime needs a short initialization before the explorer becomes interactive."
        >
          <div className="space-y-4">
          <div className="flex items-center gap-3 text-neutral-500">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>
              {isModelLoading ? `Loading embedding model... ${loadProgress}%` : "Initializing..."}
            </span>
          </div>

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
            <Alert variant="error">{modelError}</Alert>
          )}
          </div>
        </DemoPanel>
      </DemoPage>
    );
  }

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="NLP / Embeddings"
        title="Embedding Explorer"
        actions={
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {copyStatus === "copied" ? "Link copied" : copyStatus === "error" ? "Copy failed" : "Copy share link"}
          </button>
        }
        description={
          <>
            Explore semantic geometry in two ways: define interpretable axes by hand or switch to a true UMAP manifold view.
            Run analogies, inspect nearest neighbors, and share the exact explorer state with one link.
          </>
        }
      />
      <p className="mb-6 -mt-4 text-xs text-neutral-500">
        Model: mxbai-embed-xsmall | {backend?.toUpperCase()} | {cacheSize} cached embeddings
      </p>

      {isEmbedding && (
        <Alert variant="info" className="mb-4">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          {" "}
          {embeddingLabel}... {embeddingProgress}%
        </Alert>
      )}

      {isProjecting && (
        <Alert variant="warning" className="mb-4">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          {" "}
          {projectionNotice}
        </Alert>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 sm:gap-6">
        <div className="space-y-4">
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3 bg-white/70 dark:bg-neutral-950/60 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium text-sm">Projection Mode</h3>
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
                {projectionMode === "umap" ? "manifold" : "interpretable"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setProjectionMode("axes")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  projectionMode === "axes"
                    ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                    : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                Axis View
              </button>
              <button
                onClick={() => setProjectionMode("umap")}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  projectionMode === "umap"
                    ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                    : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                UMAP View
              </button>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">{projectionNotice}</p>
          </div>

          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4 overflow-hidden">
            <h3 className="font-medium text-sm">Define Axes</h3>

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
            </div>

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
            </div>

            <p className="text-xs text-neutral-500">
              Axis words embed after a short pause, so typing doesn&apos;t fire a model request on every keystroke.
            </p>
          </div>

          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium text-sm">Vector Arithmetic</h3>
              <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                <button
                  onClick={() => setArithmeticMode("classic")}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    arithmeticMode === "classic"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => setArithmeticMode("open")}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    arithmeticMode === "open"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
                  }`}
                >
                  Open Form
                </button>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              The red point is the true computed vector. Switch to open form to build expressions with as many `+` and `-` terms as you want.
            </p>

            <div className="flex flex-wrap gap-1">
              {EXAMPLE_ANALOGIES.map((example) => (
                <button
                  key={example.label}
                  onClick={() => handleLoadExample(example)}
                  className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                >
                  {example.label}
                </button>
              ))}
            </div>

            {arithmeticMode === "classic" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={arithmeticInputs.a}
                  onChange={(e) => setArithmeticInputs((prev) => ({ ...prev, a: normalizeTerm(e.target.value) }))}
                  placeholder="king"
                  className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
                <span className="text-neutral-400 shrink-0">−</span>
                <input
                  type="text"
                  value={arithmeticInputs.b}
                  onChange={(e) => setArithmeticInputs((prev) => ({ ...prev, b: normalizeTerm(e.target.value) }))}
                  placeholder="man"
                  className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
                <span className="text-neutral-400 shrink-0">+</span>
                <input
                  type="text"
                  value={arithmeticInputs.c}
                  onChange={(e) => setArithmeticInputs((prev) => ({ ...prev, c: normalizeTerm(e.target.value) }))}
                  placeholder="woman"
                  className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                />
              </div>
            ) : (
              <div className="space-y-2">
                {openArithmeticTerms.map((term, index) => (
                  <div key={`${index}-${term.operation}`} className="flex items-center gap-2">
                    <select
                      value={term.operation}
                      onChange={(e) => handleOpenArithmeticTermChange(index, "operation", e.target.value)}
                      className="w-16 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                    >
                      <option value="+">+</option>
                      <option value="-">-</option>
                    </select>
                    <input
                      type="text"
                      value={term.value}
                      onChange={(e) => handleOpenArithmeticTermChange(index, "value", e.target.value)}
                      placeholder={index === 0 ? "king" : "another term"}
                      className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                    />
                    <button
                      onClick={() => handleRemoveArithmeticTerm(index)}
                      className="shrink-0 px-2 py-1.5 text-xs whitespace-nowrap rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleAddArithmeticTerm}
                  className="px-3 py-1.5 text-xs rounded border border-dashed border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Add term
                </button>
              </div>
            )}

            <button
              onClick={handleCompute}
              disabled={!canCompute || isEmbedding}
              className="w-full px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEmbedding ? "Embedding..." : "Compute"}
            </button>

            {arithmeticResult && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 mb-2">
                  {arithmeticResult.expression} ≈
                </p>
                <div className="space-y-1">
                  {arithmeticResult.nearest.map((candidate, index) => (
                    <div
                      key={candidate.word}
                      className={`flex justify-between text-sm px-2 py-1 rounded ${
                        index === 0
                          ? "bg-indigo-50 dark:bg-indigo-950 font-medium"
                          : "bg-neutral-50 dark:bg-neutral-900"
                      }`}
                    >
                      <span>{candidate.word}</span>
                      <span className="text-neutral-500">{(candidate.similarity * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="space-y-4">
          <Visualization
            points={points}
            projectionMode={projectionMode}
            axisLabels={axisLabels}
            selectedWord={selectedWord}
            hoveredWord={hoveredWord}
            onSelectWord={setSelectedWord}
            onHoverWord={setHoveredWord}
          />

          <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
            <div className="space-y-4">
              <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4 overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-medium text-sm">Word Sets</h3>
                  <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">
                    {selectedWordSetIds.length} active
                  </span>
                </div>

                <p className="text-xs text-neutral-500">
                  Toggle multiple curated sets to build a more interesting shared vocabulary. Active sets merge together.
                </p>

                <div className="flex flex-wrap gap-2">
                  {WORD_SETS.map((wordSet) => {
                    const isActive = selectedWordSetIds.includes(wordSet.id);

                    return (
                      <button
                        key={wordSet.id}
                        onClick={() => void handleToggleWordSet(wordSet.id)}
                        onMouseEnter={() => setHoveredWordSetId(wordSet.id)}
                        onMouseLeave={() => setHoveredWordSetId(null)}
                        onFocus={() => setHoveredWordSetId(wordSet.id)}
                        onBlur={() => setHoveredWordSetId(null)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
                            : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 hover:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {wordSet.title}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-neutral-50/80 dark:bg-neutral-900/60">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">{displayedWordSet.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                      {displayedWordSet.words.length} words
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {displayedWordSet.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                  <h4 className="font-medium text-sm">Add Words</h4>
                  <p className="text-xs text-neutral-500">Single words, phrases, or short sentences all work.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleAddWord()}
                      placeholder="Type any word or phrase..."
                      className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-transparent"
                    />
                    <button
                      onClick={() => void handleAddWord()}
                      disabled={!newWord.trim() || isEmbedding}
                      className="px-3 py-1.5 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <div className="flex items-center justify-between mb-2 gap-4">
                  <h3 className="font-medium text-sm">Words ({words.length})</h3>
                  <button
                  onClick={() => {
                    setSelectedWordSetIds([DEFAULT_WORD_SET_ID]);
                    setWords(DEFAULT_WORDS);
                  }}
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
                    onClick={() => setSelectedWord((prev) => (prev === word ? null : word))}
                    onDoubleClick={() => handleRemoveWord(word)}
                  >
                    {word}
                    {!embeddingCache.has(normalizeTerm(word)) && <span className="text-yellow-500 text-xs">⏳</span>}
                  </span>
                ))}
                </div>
                <p className="text-xs text-neutral-500 mt-2">Click to inspect, double-click to remove.</p>
              </div>
            </div>

            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
              <h3 className="font-medium text-sm">Word Inspector</h3>
              {selectedWord && selectedWord !== "=result" ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-1">Selected</p>
                    <p className="text-lg font-semibold">{selectedWord}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-2">Nearest Cached Neighbors</p>
                    <div className="space-y-1">
                      {selectedNeighbors.length > 0 ? (
                        selectedNeighbors.map((candidate) => (
                          <div key={candidate.word} className="flex justify-between text-sm bg-neutral-50 dark:bg-neutral-900 rounded px-2 py-1">
                            <span>{candidate.word}</span>
                            <span className="text-neutral-500">{(candidate.similarity * 100).toFixed(1)}%</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-neutral-500">Embed more items to inspect local neighbors.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-neutral-500">
                  Select a point or word chip to inspect its nearest neighbors inside the current cache.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <h3 className="font-semibold mb-2">Two complementary views</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Axis view is interpretable: each dimension is a semantic contrast you define. UMAP view is exploratory:
            it preserves local neighborhoods and reveals clusters you might not think to ask for explicitly.
          </p>
        </div>
        <div className="p-5 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <h3 className="font-semibold mb-2">Real arithmetic geometry</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The red point now represents the actual vector result. Nearest neighbors are ranked separately, which makes the analogy output much easier to reason about.
          </p>
        </div>
        <div className="p-5 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <h3 className="font-semibold mb-2">Shareable state</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Projection mode, axes, word set, and arithmetic inputs are encoded in the URL, so every interesting view can be copied and shared directly.
          </p>
        </div>
      </div>
    </DemoPage>
  );
}
