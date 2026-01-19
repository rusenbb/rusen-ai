"use client";

import { useReducer, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Tiktoken } from "tiktoken";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_COLORS = [
  "bg-red-200 dark:bg-red-900",
  "bg-blue-200 dark:bg-blue-900",
  "bg-green-200 dark:bg-green-900",
  "bg-yellow-200 dark:bg-yellow-900",
  "bg-purple-200 dark:bg-purple-900",
  "bg-pink-200 dark:bg-pink-900",
  "bg-indigo-200 dark:bg-indigo-900",
  "bg-orange-200 dark:bg-orange-900",
  "bg-teal-200 dark:bg-teal-900",
  "bg-cyan-200 dark:bg-cyan-900",
];

interface TokenInfo {
  text: string;
  id: number;
  bytes: number[];
}

interface GPT4TokenInfo {
  text: string;
  id: number;
}

interface TokenizerInterface {
  encode: (text: string) => Uint32Array;
  decode: (ids: Uint32Array) => string;
  encode_with_info: (text: string) => string;
  vocab_size: () => number;
  id_to_token: (id: number) => string | undefined;
}

type ExampleCategory = "turkish" | "english" | "code" | "mixed";

const EXAMPLE_CATEGORIES: Record<ExampleCategory, { text: string; label: string }[]> = {
  turkish: [
    { text: "Merhaba dünya!", label: "Merhaba dünya!" },
    { text: "kitaplarımdan", label: "kitaplarımdan" },
    { text: "evlerimizden", label: "evlerimizden" },
    { text: "göremeyecekmişsiniz", label: "göremeyecek..." },
    { text: "Türkiye'nin başkenti Ankara'dır.", label: "Türkiye'nin başkenti..." },
    { text: "Yapay zeka günümüzde hızla gelişmektedir.", label: "Yapay zeka..." },
  ],
  english: [
    { text: "Hello world!", label: "Hello world!" },
    { text: "The quick brown fox jumps over the lazy dog.", label: "Quick brown fox..." },
    { text: "Artificial intelligence is rapidly evolving.", label: "AI is evolving..." },
    { text: "tokenization", label: "tokenization" },
  ],
  code: [
    { text: "function tokenize(text) { return text.split(' '); }", label: "JS function" },
    { text: "SELECT * FROM users WHERE id = 1", label: "SQL query" },
    { text: "const API_KEY = process.env.OPENAI_KEY;", label: "API key" },
  ],
  mixed: [
    { text: "The API returns 'Merhaba' as greeting", label: "API greeting" },
    { text: "Istanbul değil, İstanbul yazılır", label: "Istanbul spelling" },
    { text: "Python ile Türkçe NLP", label: "Python NLP" },
  ],
};

type DetectedLanguage = "turkish" | "english" | "mixed" | "unknown";

interface BatchResult {
  text: string;
  rusenTokens: number;
  gptTokens: number;
  savings: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

interface RusenizerState {
  inputText: string;
  tokens: TokenInfo[];
  gpt4Tokens: GPT4TokenInfo[];
  loading: boolean;
  error: string | null;
  vocabSize: number;
  activeCategory: ExampleCategory;
  batchMode: boolean;
  efficiencyHistory: number[];
  tokenAnimationKey: number; // For triggering re-animation
}

type RusenizerAction =
  | { type: "SET_INPUT"; text: string }
  | { type: "SET_TOKENS"; tokens: TokenInfo[]; gpt4Tokens: GPT4TokenInfo[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_VOCAB_SIZE"; size: number }
  | { type: "SET_CATEGORY"; category: ExampleCategory }
  | { type: "TOGGLE_BATCH_MODE" }
  | { type: "ADD_EFFICIENCY_POINT"; value: number }
  | { type: "CLEAR_EFFICIENCY_HISTORY" };

function rusenizerReducer(state: RusenizerState, action: RusenizerAction): RusenizerState {
  switch (action.type) {
    case "SET_INPUT":
      return {
        ...state,
        inputText: action.text,
        tokenAnimationKey: state.tokenAnimationKey + 1,
      };
    case "SET_TOKENS":
      return { ...state, tokens: action.tokens, gpt4Tokens: action.gpt4Tokens };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_VOCAB_SIZE":
      return { ...state, vocabSize: action.size };
    case "SET_CATEGORY":
      return { ...state, activeCategory: action.category };
    case "TOGGLE_BATCH_MODE":
      return { ...state, batchMode: !state.batchMode, efficiencyHistory: [] };
    case "ADD_EFFICIENCY_POINT":
      return {
        ...state,
        efficiencyHistory: [...state.efficiencyHistory.slice(-19), action.value],
      };
    case "CLEAR_EFFICIENCY_HISTORY":
      return { ...state, efficiencyHistory: [] };
    default:
      return state;
  }
}

const initialState: RusenizerState = {
  inputText: "Merhaba dünya!",
  tokens: [],
  gpt4Tokens: [],
  loading: true,
  error: null,
  vocabSize: 0,
  activeCategory: "turkish",
  batchMode: false,
  efficiencyHistory: [],
  tokenAnimationKey: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function detectLanguage(text: string): DetectedLanguage {
  if (!text.trim()) return "unknown";

  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/g;
  const turkishMatches = (text.match(turkishChars) || []).length;
  const ratio = turkishMatches / text.length;

  if (ratio > 0.02) return "turkish";
  if (ratio === 0 && /^[a-zA-Z0-9\s.,!?'"():;\-_]+$/.test(text)) return "english";
  if (turkishMatches > 0) return "mixed";
  return "unknown";
}

function computeTokenBoundaries(tokens: { text: string }[]): Set<number> {
  const boundaries = new Set<number>();
  let pos = 0;
  for (const token of tokens) {
    pos += token.text.length;
    boundaries.add(pos);
  }
  return boundaries;
}

function findDivergentBoundaries(
  rusenTokens: TokenInfo[],
  gpt4Tokens: GPT4TokenInfo[]
): { rusenDivergent: Set<number>; gptDivergent: Set<number> } {
  const rusenBoundaries = computeTokenBoundaries(rusenTokens);
  const gptBoundaries = computeTokenBoundaries(gpt4Tokens);

  const rusenDivergent = new Set<number>();
  const gptDivergent = new Set<number>();

  rusenBoundaries.forEach((pos) => {
    if (!gptBoundaries.has(pos)) rusenDivergent.add(pos);
  });
  gptBoundaries.forEach((pos) => {
    if (!rusenBoundaries.has(pos)) gptDivergent.add(pos);
  });

  return { rusenDivergent, gptDivergent };
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 animate-pulse">
      {/* Header skeleton */}
      <div className="h-10 w-48 bg-neutral-200 dark:bg-neutral-800 rounded mb-4" />
      <div className="h-6 w-96 bg-neutral-200 dark:bg-neutral-800 rounded mb-8" />

      {/* Category tabs skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
        ))}
      </div>

      {/* Example buttons skeleton */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
        ))}
      </div>

      {/* Input skeleton */}
      <div className="h-24 w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg mb-8" />

      {/* Results grid skeleton */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <div className="flex justify-between mb-4">
            <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
          <div className="flex flex-wrap gap-1 min-h-[60px]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
            ))}
          </div>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <div className="flex justify-between mb-4">
            <div className="h-6 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
          <div className="flex flex-wrap gap-1 min-h-[60px]">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-8 w-12 bg-neutral-200 dark:bg-neutral-800 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
            <div className="h-8 w-12 mx-auto bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
            <div className="h-4 w-20 mx-auto bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-neutral-500">
        <span className="inline-block w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin mr-2" />
        Loading tokenizers...
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPARKLINE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function EfficiencySparkline({ history }: { history: number[] }) {
  if (history.length < 2) return null;

  const maxVal = Math.max(...history.map(Math.abs), 1);

  return (
    <div className="inline-flex items-center gap-2 ml-3">
      <svg width="100" height="24" className="overflow-visible">
        {history.map((val, i) => {
          const normalizedHeight = (Math.abs(val) / maxVal) * 20;
          const isPositive = val > 0;
          return (
            <rect
              key={i}
              x={i * 5}
              y={isPositive ? 12 - normalizedHeight : 12}
              width="4"
              height={Math.max(normalizedHeight, 2)}
              className={isPositive ? "fill-green-500" : "fill-red-400"}
              rx="1"
            />
          );
        })}
        {/* Zero line */}
        <line x1="0" y1="12" x2="100" y2="12" stroke="currentColor" strokeOpacity="0.2" />
      </svg>
      <span className="text-xs text-neutral-400">efficiency over time</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT (inner, with searchParams access)
// ─────────────────────────────────────────────────────────────────────────────

function RusenizerPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get initial text from URL or default
  const urlText = searchParams.get("text");
  const [state, dispatch] = useReducer(rusenizerReducer, {
    ...initialState,
    inputText: urlText || initialState.inputText,
  });

  const tokenizerRef = useRef<TokenizerInterface | null>(null);
  const gpt4EncoderRef = useRef<Tiktoken | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // URL State Sync (debounced)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (state.inputText && state.inputText !== initialState.inputText) {
        params.set("text", state.inputText);
      }
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }, 500);
    return () => clearTimeout(timeout);
  }, [state.inputText, router]);

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard Shortcuts
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      const examples = EXAMPLE_CATEGORIES[state.activeCategory];
      const num = parseInt(e.key);
      if (num >= 1 && num <= examples.length) {
        dispatch({ type: "SET_INPUT", text: examples[num - 1].text });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.activeCategory]);

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize Tokenizers
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function initTokenizers() {
      try {
        // Initialize GPT-4 tokenizer (cl100k_base)
        const { get_encoding } = await import("tiktoken");
        const enc = get_encoding("cl100k_base");
        gpt4EncoderRef.current = enc;

        // Load WASM binary
        const wasmResponse = await fetch("/wasm/rusenizer_wasm_bg.wasm");
        const wasmBytes = await wasmResponse.arrayBuffer();

        // Load JS glue code as text and create module
        const jsResponse = await fetch("/wasm/rusenizer_wasm.js");
        const jsCode = await jsResponse.text();

        // Create a blob URL for the JS module
        const blob = new Blob([jsCode], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);

        // Dynamic import from blob URL
        const wasmModule = await import(/* webpackIgnore: true */ blobUrl);
        URL.revokeObjectURL(blobUrl);

        // Initialize WASM
        await wasmModule.default(wasmBytes);

        // Load mergeable ranks
        const response = await fetch("/models/v1/mergeable_ranks.json");
        const mergeableRanks = await response.json();

        // Create tokenizer instance
        const tok = new wasmModule.Tokenizer(JSON.stringify(mergeableRanks));
        tokenizerRef.current = tok;
        dispatch({ type: "SET_VOCAB_SIZE", size: tok.vocab_size() });
        dispatch({ type: "SET_LOADING", loading: false });
      } catch (err) {
        console.error("Failed to initialize tokenizer:", err);
        dispatch({
          type: "SET_ERROR",
          error: err instanceof Error ? err.message : "Failed to load tokenizer",
        });
        dispatch({ type: "SET_LOADING", loading: false });
      }
    }

    initTokenizers();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Tokenization
  // ─────────────────────────────────────────────────────────────────────────
  const tokenize = useCallback((text: string) => {
    if (!text) {
      dispatch({ type: "SET_TOKENS", tokens: [], gpt4Tokens: [] });
      return;
    }

    let rusenTokens: TokenInfo[] = [];
    let gpt4Tokens: GPT4TokenInfo[] = [];

    // Rusenizer tokenization
    if (tokenizerRef.current) {
      try {
        const infoJson = tokenizerRef.current.encode_with_info(text);
        rusenTokens = JSON.parse(infoJson);
      } catch (err) {
        console.error("Rusenizer tokenization error:", err);
      }
    }

    // GPT-4 tokenization
    if (gpt4EncoderRef.current) {
      try {
        const ids = gpt4EncoderRef.current.encode(text);
        for (const id of ids) {
          const bytes = gpt4EncoderRef.current.decode_single_token_bytes(id);
          const tokenText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          gpt4Tokens.push({ text: tokenText, id });
        }
      } catch (err) {
        console.error("GPT-4 tokenization error:", err);
      }
    }

    dispatch({ type: "SET_TOKENS", tokens: rusenTokens, gpt4Tokens });

    // Update efficiency history
    if (gpt4Tokens.length > 0) {
      const efficiency = ((gpt4Tokens.length - rusenTokens.length) / gpt4Tokens.length) * 100;
      dispatch({ type: "ADD_EFFICIENCY_POINT", value: efficiency });
    }
  }, []);

  // Tokenize when input changes
  useEffect(() => {
    if (!state.loading) {
      tokenize(state.inputText);
    }
  }, [state.inputText, state.loading, tokenize]);

  // ─────────────────────────────────────────────────────────────────────────
  // Batch Processing
  // ─────────────────────────────────────────────────────────────────────────
  const batchResults: BatchResult[] = state.batchMode
    ? state.inputText
        .split(/[.!?]+/)
        .filter((s) => s.trim())
        .map((sentence) => {
          const trimmed = sentence.trim();
          let rusenCount = 0;
          let gptCount = 0;

          if (tokenizerRef.current) {
            try {
              rusenCount = tokenizerRef.current.encode(trimmed).length;
            } catch {}
          }
          if (gpt4EncoderRef.current) {
            try {
              gptCount = gpt4EncoderRef.current.encode(trimmed).length;
            } catch {}
          }

          const savings = gptCount > 0 ? ((gptCount - rusenCount) / gptCount) * 100 : 0;
          return { text: trimmed, rusenTokens: rusenCount, gptTokens: gptCount, savings };
        })
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────
  const rusenTokenCount = state.tokens.length;
  const gpt4TokenCount = state.gpt4Tokens.length;
  const savings =
    gpt4TokenCount > 0
      ? (((gpt4TokenCount - rusenTokenCount) / gpt4TokenCount) * 100).toFixed(1)
      : null;
  const detectedLanguage = detectLanguage(state.inputText);
  const { rusenDivergent, gptDivergent } = findDivergentBoundaries(state.tokens, state.gpt4Tokens);

  // Calculate cumulative character positions for diff highlighting
  let rusenCumulativePos = 0;
  const rusenTokensWithPos = state.tokens.map((token) => {
    rusenCumulativePos += token.text.length;
    return { ...token, endPos: rusenCumulativePos };
  });

  let gptCumulativePos = 0;
  const gptTokensWithPos = state.gpt4Tokens.map((token) => {
    gptCumulativePos += token.text.length;
    return { ...token, endPos: gptCumulativePos };
  });

  const examples = EXAMPLE_CATEGORIES[state.activeCategory];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Loading State
  // ─────────────────────────────────────────────────────────────────────────
  if (state.loading) {
    return <SkeletonLoader />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Error State
  // ─────────────────────────────────────────────────────────────────────────
  if (state.error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-500">Error: {state.error}</div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Rusenizer</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        A Turkish-optimized BPE tokenizer trained on Turkish Wikipedia. Uses{" "}
        <span className="font-mono text-sm">{state.vocabSize.toLocaleString()}</span> tokens
        and achieves ~45% fewer tokens than GPT-4 on Turkish text.
      </p>

      {/* Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => dispatch({ type: "TOGGLE_BATCH_MODE" })}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            !state.batchMode
              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          Single Text
        </button>
        <button
          onClick={() => dispatch({ type: "TOGGLE_BATCH_MODE" })}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            state.batchMode
              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          Batch Mode
        </button>
      </div>

      {/* Category Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EXAMPLE_CATEGORIES) as ExampleCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => dispatch({ type: "SET_CATEGORY", category: cat })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                state.activeCategory === cat
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Example Buttons */}
      <div className="mb-6">
        <div className="text-sm text-neutral-500 mb-2">
          Try an example: <span className="text-neutral-400">(or press 1-{examples.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((example, idx) => (
            <button
              key={example.text}
              onClick={() => dispatch({ type: "SET_INPUT", text: example.text })}
              className={`px-3 py-1 text-sm rounded-full border transition ${
                state.inputText === example.text
                  ? "border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
              }`}
            >
              <span className="text-neutral-400 mr-1">{idx + 1}.</span>
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language Detection Hint */}
      {state.inputText && (
        <div className="mb-4 text-sm">
          {detectedLanguage === "turkish" && (
            <span className="text-green-600 dark:text-green-400">
              Detected: Turkish - Rusenizer is optimized for this!
            </span>
          )}
          {detectedLanguage === "english" && (
            <span className="text-amber-600 dark:text-amber-400">
              Detected: English - Rusenizer still works but savings may be lower
            </span>
          )}
          {detectedLanguage === "mixed" && (
            <span className="text-blue-600 dark:text-blue-400">
              Detected: Mixed Turkish/English
            </span>
          )}
        </div>
      )}

      {/* Input */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">
          {state.batchMode ? "Input Text (split by sentences)" : "Input Text"}
        </label>
        <textarea
          value={state.inputText}
          onChange={(e) => dispatch({ type: "SET_INPUT", text: e.target.value })}
          className="w-full h-24 p-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-400"
          placeholder={state.batchMode ? "Paste multiple sentences to compare..." : "Enter any text to tokenize..."}
        />
      </div>

      {/* Empty State */}
      {!state.inputText && (
        <div className="text-center py-12 mb-8 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
          <p className="text-neutral-500 mb-2 text-lg">Type Turkish text to see the magic!</p>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            Agglutinative languages like Turkish often need 40-50% fewer tokens
            with a specialized tokenizer. Try &quot;göremeyecekmişsiniz&quot; to see how
            Rusenizer handles complex suffixes.
          </p>
        </div>
      )}

      {/* Batch Mode Results */}
      {state.batchMode && batchResults.length > 0 && (
        <div className="mb-8 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="font-semibold">Batch Comparison ({batchResults.length} sentences)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30">
                  <th className="px-4 py-2">Sentence</th>
                  <th className="px-4 py-2 text-right">Rusenizer</th>
                  <th className="px-4 py-2 text-right">GPT-4</th>
                  <th className="px-4 py-2 text-right">Savings</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map((result, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="px-4 py-3 max-w-xs truncate" title={result.text}>
                      {result.text.slice(0, 50)}{result.text.length > 50 ? "..." : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">
                      {result.rusenTokens}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {result.gptTokens}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      result.savings > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                    }`}>
                      {result.savings > 0 ? "-" : "+"}{Math.abs(result.savings).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 dark:bg-neutral-800/30 font-medium">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">
                    {batchResults.reduce((sum, r) => sum + r.rusenTokens, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {batchResults.reduce((sum, r) => sum + r.gptTokens, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-600 dark:text-green-400">
                    {(() => {
                      const totalRusen = batchResults.reduce((sum, r) => sum + r.rusenTokens, 0);
                      const totalGpt = batchResults.reduce((sum, r) => sum + r.gptTokens, 0);
                      const totalSavings = totalGpt > 0 ? ((totalGpt - totalRusen) / totalGpt) * 100 : 0;
                      return `${totalSavings > 0 ? "-" : "+"}${Math.abs(totalSavings).toFixed(1)}%`;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Single Mode Results */}
      {!state.batchMode && state.inputText && (
        <>
          {/* Results Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Rusenizer */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Rusenizer v1</h2>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {rusenTokenCount} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-1 min-h-[60px]" key={`rusen-${state.tokenAnimationKey}`}>
                {rusenTokensWithPos.map((token, i) => {
                  const isDivergent = rusenDivergent.has(token.endPos);
                  return (
                    <span
                      key={i}
                      className={`relative group px-2 py-1 rounded text-sm font-mono cursor-pointer
                        hover:scale-105 transition-all duration-150
                        ${TOKEN_COLORS[i % TOKEN_COLORS.length]}
                        ${isDivergent ? "ring-2 ring-amber-400 ring-offset-1" : ""}
                        animate-[token-appear_0.2s_ease-out_forwards]`}
                      style={{ animationDelay: `${i * 30}ms`, opacity: 0 }}
                      onClick={() => navigator.clipboard.writeText(token.text)}
                      title="Click to copy"
                    >
                      {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                      {/* Enhanced Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                        <div><strong>ID:</strong> {token.id}</div>
                        <div><strong>Bytes:</strong> [{token.bytes.join(", ")}]</div>
                        <div><strong>Chars:</strong> {token.text.length}</div>
                        {isDivergent && (
                          <div className="text-amber-400 mt-1">Divergent boundary</div>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* GPT-4 */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">GPT-4 (cl100k_base)</h2>
                <span className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                  {gpt4TokenCount} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-1 min-h-[60px]" key={`gpt-${state.tokenAnimationKey}`}>
                {gptTokensWithPos.map((token, i) => {
                  const isDivergent = gptDivergent.has(token.endPos);
                  return (
                    <span
                      key={i}
                      className={`relative group px-2 py-1 rounded text-sm font-mono cursor-pointer
                        hover:scale-105 transition-all duration-150
                        ${TOKEN_COLORS[i % TOKEN_COLORS.length]}
                        ${isDivergent ? "ring-2 ring-amber-400 ring-offset-1" : ""}
                        animate-[token-appear_0.2s_ease-out_forwards]`}
                      style={{ animationDelay: `${i * 30}ms`, opacity: 0 }}
                      onClick={() => navigator.clipboard.writeText(token.text)}
                      title="Click to copy"
                    >
                      {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                        <div><strong>ID:</strong> {token.id}</div>
                        <div><strong>Chars:</strong> {token.text.length}</div>
                        {isDivergent && (
                          <div className="text-amber-400 mt-1">Divergent boundary</div>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
              {savings && Number(savings) > 0 && (
                <div className="mt-4 text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
                  Rusenizer saves {savings}% tokens
                  {/* Why This Matters Tooltip */}
                  <span className="relative group ml-2">
                    <span className="text-neutral-400 cursor-help text-lg">ⓘ</span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 text-xs bg-neutral-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 z-30 shadow-lg">
                      <strong className="block mb-1">Cost Impact:</strong>
                      Each token costs ~$0.01-0.03 in API calls.
                      {Number(savings) > 0 && (
                        <span> {savings}% fewer tokens = {savings}% cost reduction for Turkish text.</span>
                      )}
                    </span>
                  </span>
                </div>
              )}
              {savings && Number(savings) < 0 && (
                <div className="mt-4 text-sm text-neutral-500 font-medium">
                  GPT-4 uses {Math.abs(Number(savings))}% fewer tokens
                </div>
              )}
            </div>
          </div>

          {/* Diff Legend */}
          {(rusenDivergent.size > 0 || gptDivergent.size > 0) && (
            <div className="mb-8 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <span className="inline-block w-4 h-4 ring-2 ring-amber-400 ring-offset-1 rounded mr-2 align-middle" />
              <span className="text-amber-800 dark:text-amber-200">
                Highlighted tokens show where tokenizers split differently
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{state.inputText.length}</div>
              <div className="text-sm text-neutral-500">Characters</div>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{new TextEncoder().encode(state.inputText).length}</div>
              <div className="text-sm text-neutral-500">Bytes</div>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{rusenTokenCount}</div>
              <div className="text-sm text-neutral-500">Rusenizer</div>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{gpt4TokenCount}</div>
              <div className="text-sm text-neutral-500">GPT-4</div>
            </div>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${Number(savings) > 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                {savings ? `${Number(savings) > 0 ? "-" : "+"}${Math.abs(Number(savings))}%` : "—"}
              </div>
              <div className="text-sm text-neutral-500">Difference</div>
            </div>
          </div>

          {/* Efficiency Sparkline */}
          {state.efficiencyHistory.length >= 2 && (
            <div className="mb-8 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <div className="flex items-center">
                <span className="text-sm font-medium">Efficiency Trend</span>
                <EfficiencySparkline history={state.efficiencyHistory} />
              </div>
            </div>
          )}

          {/* Token Details */}
          {state.tokens.length > 0 && (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Rusenizer Token Details</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Token</th>
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2">Bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tokens.map((token, i) => (
                      <tr key={i} className="border-b border-neutral-100 dark:border-neutral-900">
                        <td className="py-2 pr-4 text-neutral-400">{i}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}>
                            {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-neutral-500">{token.id}</td>
                        <td className="py-2 text-neutral-500">[{token.bytes.join(", ")}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* About */}
      <div className="mt-12 text-sm text-neutral-500">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          About Rusenizer
        </h3>
        <p className="mb-2">
          Rusenizer is a BPE (Byte Pair Encoding) tokenizer trained specifically on Turkish
          Wikipedia (67M words). Turkish is an agglutinative language where words can have
          many suffixes, making generic tokenizers inefficient.
        </p>
        <p>
          By training on Turkish text, Rusenizer learns common Turkish morphemes and word
          patterns, resulting in significantly fewer tokens for the same text compared to
          multilingual tokenizers like GPT-4&apos;s cl100k_base.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT (with Suspense for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

export default function RusenizerPage() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <RusenizerPageInner />
    </Suspense>
  );
}
