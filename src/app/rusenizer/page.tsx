"use client";

import { useReducer, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Tiktoken } from "tiktoken";
import benchmark from "@/content/tokenizer-benchmark.generated.json";
import { Alert, Card, Chip, Details, DemoHeader, DemoPage, Segmented, Stat } from "@/components/ui";
import { byteBoundaries, characterHint, tokenDisplay } from "./bytes";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Token swatches: the five series tokens, tinted so text stays readable.
const TOKEN_COLORS = [
  "bg-[color-mix(in_srgb,var(--accent)_28%,transparent)]",
  "bg-[color-mix(in_srgb,var(--accent-2)_28%,transparent)]",
  "bg-[color-mix(in_srgb,var(--accent-3)_28%,transparent)]",
  "bg-[color-mix(in_srgb,var(--accent-4)_28%,transparent)]",
  "bg-[color-mix(in_srgb,var(--accent-5)_28%,transparent)]",
];

interface TokenInfo {
  text: string;
  id: number;
  bytes: number[];
}

interface GPT4TokenInfo {
  text: string;
  id: number;
  bytes: number[];
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

function findDivergentBoundaries(
  rusenTokens: TokenInfo[],
  gpt4Tokens: GPT4TokenInfo[]
): { rusenDivergent: Set<number>; gptDivergent: Set<number> } {
  const rusenBoundaries = byteBoundaries(rusenTokens);
  const gptBoundaries = byteBoundaries(gpt4Tokens);

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
    <DemoPage>
      <h1 className="text-3xl sm:text-4xl font-bold mb-4">Rusenizer</h1>
      <p role="status" className="text-sub">Loading tokenizers…</p>
    </DemoPage>
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
              className={isPositive ? "fill-signal" : "fill-danger"}
              rx="1"
            />
          );
        })}
        {/* Zero line */}
        <line x1="0" y1="12" x2="100" y2="12" stroke="currentColor" strokeOpacity="0.2" />
      </svg>
      <span className="text-xs text-sub">efficiency over time</span>
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
        await wasmModule.default({ module_or_path: wasmBytes });

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
    const gpt4Tokens: GPT4TokenInfo[] = [];

    // Rusenizer tokenization
    if (tokenizerRef.current) {
      try {
        const infoJson = tokenizerRef.current.encode_with_info(text);
        rusenTokens = (JSON.parse(infoJson) as TokenInfo[]).map((token) => ({ ...token, text: tokenDisplay(token.bytes) }));
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
          const tokenBytes = Array.from(bytes);
          gpt4Tokens.push({ text: tokenDisplay(tokenBytes), id, bytes: tokenBytes });
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
  const { rusenDivergent, gptDivergent } = findDivergentBoundaries(state.tokens, state.gpt4Tokens);

  // Calculate cumulative character positions for diff highlighting
  let rusenCumulativePos = 0;
  const rusenTokensWithPos = state.tokens.map((token) => {
    rusenCumulativePos += token.bytes.length;
    return { ...token, endPos: rusenCumulativePos };
  });

  let gptCumulativePos = 0;
  const gptTokensWithPos = state.gpt4Tokens.map((token) => {
    gptCumulativePos += token.bytes.length;
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
      <DemoPage>
        <div className="flex items-center justify-center min-h-[400px]">
          <div><h1 className="text-3xl font-bold mb-4">Rusenizer</h1><Alert variant="error">Error: {state.error}</Alert></div>
        </div>
      </DemoPage>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DemoPage>
      <DemoHeader
        title="Rusenizer"
        description={
          <>
            A Turkish-optimized BPE tokenizer trained on Turkish Wikipedia. Uses{" "}
            <span className="font-mono text-sm">{state.vocabSize.toLocaleString()}</span> tokens
            Compare its actual token count with cl100k_base on your text.
          </>
        }
      />

      <Details className="mb-6" summary={<>Measured comparison: {benchmark.rows.length} bundled examples</>}>
        <p>{benchmark.totalRusen} Rusenizer tokens vs {benchmark.totalBaseline} {benchmark.baseline} tokens: {benchmark.reductionPercent.toFixed(2)}% reduction on this corpus only. {benchmark.scope}</p>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Text</th><th>Rusenizer</th><th>cl100k_base</th></tr></thead><tbody>{benchmark.rows.map((row) => <tr key={row.text}><td className="py-1 pr-3">{row.text}</td><td>{row.rusen}</td><td>{row.baseline}</td></tr>)}</tbody></table></div>
        <p className="mt-3 break-all text-xs text-sub">Corpus SHA-256: {benchmark.corpusSha256}. Baseline library: tiktoken {benchmark.tiktokenVersion}. Reproduce with npm run benchmark:tokenizer.</p>
      </Details>
      {/* Mode Toggle */}
      <div className="mb-6">
        <Segmented
          label="Mode"
          value={state.batchMode ? "batch" : "single"}
          options={[
            { value: "single", label: "Single Text" },
            { value: "batch", label: "Batch Mode" },
          ]}
          onChange={(mode) => {
            if ((mode === "batch") !== state.batchMode) dispatch({ type: "TOGGLE_BATCH_MODE" });
          }}
        />
      </div>

      {/* Category Tabs */}
      <div className="mb-4">
        <Segmented
          label="Example category"
          value={state.activeCategory}
          options={(Object.keys(EXAMPLE_CATEGORIES) as ExampleCategory[]).map((cat) => ({
            value: cat,
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
          }))}
          onChange={(category) => dispatch({ type: "SET_CATEGORY", category })}
        />
      </div>

      {/* Example Buttons */}
      <div className="mb-6">
        <div className="text-sm text-muted mb-2">
          Try an example: <span className="text-sub">(or press 1-{examples.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((example, idx) => (
            <Chip
              key={example.text}
              selected={state.inputText === example.text}
              onClick={() => dispatch({ type: "SET_INPUT", text: example.text })}
              className="!normal-case !tracking-normal"
            >
              <span className="opacity-60">{idx + 1}.</span>
              {example.label}
            </Chip>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted">{characterHint(state.inputText)} Partial UTF-8 tokens appear as hexadecimal bytes in ⟦brackets⟧; highlighted boundaries use byte positions.</p>

      {/* Input */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">
          {state.batchMode ? "Input Text (split by sentences)" : "Input Text"}
        </label>
        <textarea
          value={state.inputText}
          onChange={(e) => dispatch({ type: "SET_INPUT", text: e.target.value })}
          className="w-full h-24 p-4 border border-line bg-surface text-foreground font-mono text-sm resize-none focus:outline-none focus:border-line-strong"
          placeholder={state.batchMode ? "Paste multiple sentences to compare..." : "Enter any text to tokenize..."}
        />
      </div>

      {/* Empty State */}
      {!state.inputText && (
        <div className="text-center py-12 mb-8 border border-dashed border-line">
          <p className="text-muted mb-2 text-lg">Type Turkish text to see the magic!</p>
          <p className="text-sm text-sub max-w-md mx-auto">
            Token savings depend on the input and vocabulary. Try &quot;göremeyecekmişsiniz&quot; to see how
            Rusenizer handles complex suffixes.
          </p>
        </div>
      )}

      {/* Batch Mode Results */}
      {state.batchMode && batchResults.length > 0 && (
        <div className="mb-8 border border-line bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-semibold">Batch Comparison ({batchResults.length} sentences)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sub border-b border-line">
                  <th className="px-4 py-2">Sentence</th>
                  <th className="px-4 py-2 text-right">Rusenizer</th>
                  <th className="px-4 py-2 text-right">GPT-4</th>
                  <th className="px-4 py-2 text-right">Savings</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map((result, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="px-4 py-3 max-w-xs truncate" title={result.text}>
                      {result.text.slice(0, 50)}{result.text.length > 50 ? "..." : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-signal">
                      {result.rusenTokens}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {result.gptTokens}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      result.savings > 0 ? "text-signal" : "text-danger"
                    }`}>
                      {result.savings > 0 ? "-" : "+"}{Math.abs(result.savings).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-medium">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right font-mono text-signal">
                    {batchResults.reduce((sum, r) => sum + r.rusenTokens, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {batchResults.reduce((sum, r) => sum + r.gptTokens, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-signal">
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
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-8">
            {/* Rusenizer */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Rusenizer v1</h2>
                <span className="text-2xl font-bold text-signal">
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
                        ${isDivergent ? "ring-2 ring-accent-2 ring-offset-1 ring-offset-surface" : ""}
                        animate-[token-appear_0.2s_ease-out_forwards]`}
                      style={{ animationDelay: `${i * 30}ms`, opacity: 0 }}
                      onClick={() => navigator.clipboard.writeText(token.text)}
                      title="Click to copy"
                    >
                      {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                      {/* Enhanced Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                        <div><strong>ID:</strong> {token.id}</div>
                        <div><strong>Bytes:</strong> [{token.bytes.join(", ")}]</div>
                        <div><strong>Chars:</strong> {token.text.length}</div>
                        {isDivergent && (
                          <div className="text-accent-2 mt-1">Divergent boundary</div>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
            </Card>

            {/* GPT-4 */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">GPT-4 (cl100k_base)</h2>
                <span className="text-2xl font-bold text-muted">
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
                        ${isDivergent ? "ring-2 ring-accent-2 ring-offset-1 ring-offset-surface" : ""}
                        animate-[token-appear_0.2s_ease-out_forwards]`}
                      style={{ animationDelay: `${i * 30}ms`, opacity: 0 }}
                      onClick={() => navigator.clipboard.writeText(token.text)}
                      title="Click to copy"
                    >
                      {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                        <div><strong>ID:</strong> {token.id}</div>
                        <div><strong>Chars:</strong> {token.text.length}</div>
                        {isDivergent && (
                          <div className="text-accent-2 mt-1">Divergent boundary</div>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
              {savings && Number(savings) > 0 && (
                <div className="mt-4 text-sm text-signal font-medium flex items-center">
                  Rusenizer saves {savings}% tokens
                  {/* Why This Matters Tooltip */}
                  <span className="relative group ml-2">
                    <span className="text-sub cursor-help text-lg">ⓘ</span>
                    <span className="absolute bottom-full right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mb-2 p-3 text-xs bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 z-30">
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
                <div className="mt-4 text-sm text-sub font-medium">
                  GPT-4 uses {Math.abs(Number(savings))}% fewer tokens
                </div>
              )}
            </Card>
          </div>

          {/* Diff Legend */}
          {(rusenDivergent.size > 0 || gptDivergent.size > 0) && (
            <div className="mb-8 p-3 bg-accent-2/10 border border-accent-2/40 text-sm">
              <span className="inline-block w-4 h-4 ring-2 ring-accent-2 ring-offset-1 ring-offset-surface rounded mr-2 align-middle" />
              <span className="text-foreground">
                Highlighted tokens show where tokenizers split differently
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card padding="md"><Stat label="Characters" value={state.inputText.length} /></Card>
            <Card padding="md"><Stat label="Bytes" value={new TextEncoder().encode(state.inputText).length} /></Card>
            <Card padding="md"><Stat label="Rusenizer" value={<span className="text-signal">{rusenTokenCount}</span>} /></Card>
            <Card padding="md"><Stat label="GPT-4" value={gpt4TokenCount} /></Card>
            <Card padding="md">
              <Stat
                label="Difference"
                value={
                  <span className={Number(savings) > 0 ? "text-signal" : ""}>
                    {savings ? `${Number(savings) > 0 ? "-" : "+"}${Math.abs(Number(savings))}%` : "·"}
                  </span>
                }
              />
            </Card>
          </div>

          {/* Efficiency Sparkline */}
          {state.efficiencyHistory.length >= 2 && (
            <Card padding="md" className="mb-8">
              <div className="flex items-center">
                <span className="text-sm font-medium">Efficiency Trend</span>
                <EfficiencySparkline history={state.efficiencyHistory} />
              </div>
            </Card>
          )}

          {/* Token Details */}
          {state.tokens.length > 0 && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold mb-4">Rusenizer Token Details</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="text-left text-sub border-b border-line">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Token</th>
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2">Bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tokens.map((token, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="py-2 pr-4 text-sub">{i}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}>
                            {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-muted">{token.id}</td>
                        <td className="py-2 text-muted">[{token.bytes.join(", ")}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* About */}
      <div className="mt-12 text-sm text-muted">
        <h3 className="font-semibold text-foreground mb-2">
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
    </DemoPage>
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
