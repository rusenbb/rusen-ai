"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tiktoken } from "tiktoken";

// Token colors for visualization
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

interface TokenizerInterface {
  encode: (text: string) => Uint32Array;
  decode: (ids: Uint32Array) => string;
  encode_with_info: (text: string) => string;
  vocab_size: () => number;
  id_to_token: (id: number) => string | undefined;
}

const EXAMPLE_TEXTS = [
  "Merhaba dünya!",
  "kitaplarımdan",
  "evlerimizden",
  "göremeyecekmişsiniz",
  "Türkiye'nin başkenti Ankara'dır.",
  "Yapay zeka günümüzde hızla gelişmektedir.",
];

export default function RusenizerPage() {
  const [tokenizer, setTokenizer] = useState<TokenizerInterface | null>(null);
  const [gpt4Encoder, setGpt4Encoder] = useState<Tiktoken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("Merhaba dünya!");
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [gpt4Tokens, setGpt4Tokens] = useState<string[]>([]);
  const [vocabSize, setVocabSize] = useState<number>(0);

  // Initialize tokenizers
  useEffect(() => {
    async function initTokenizers() {
      try {
        // Initialize GPT-4 tokenizer (cl100k_base) - dynamic import to avoid SSR WASM issues
        const { get_encoding } = await import("tiktoken");
        const enc = get_encoding("cl100k_base");
        setGpt4Encoder(enc);

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
        setTokenizer(tok);
        setVocabSize(tok.vocab_size());
        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize tokenizer:", err);
        setError(err instanceof Error ? err.message : "Failed to load tokenizer");
        setLoading(false);
      }
    }

    initTokenizers();
  }, []);

  // Tokenize input text with both tokenizers
  const tokenize = useCallback(
    (text: string) => {
      if (!text) {
        setTokens([]);
        setGpt4Tokens([]);
        return;
      }

      // Rusenizer tokenization
      if (tokenizer) {
        try {
          const infoJson = tokenizer.encode_with_info(text);
          const tokenInfos: TokenInfo[] = JSON.parse(infoJson);
          setTokens(tokenInfos);
        } catch (err) {
          console.error("Rusenizer tokenization error:", err);
          setTokens([]);
        }
      }

      // GPT-4 tokenization
      if (gpt4Encoder) {
        try {
          const ids = gpt4Encoder.encode(text);
          const tokenStrings: string[] = [];
          for (const id of ids) {
            const bytes = gpt4Encoder.decode_single_token_bytes(id);
            const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
            tokenStrings.push(text);
          }
          setGpt4Tokens(tokenStrings);
        } catch (err) {
          console.error("GPT-4 tokenization error:", err);
          setGpt4Tokens([]);
        }
      }
    },
    [tokenizer, gpt4Encoder]
  );

  // Tokenize when input changes
  useEffect(() => {
    tokenize(inputText);
  }, [inputText, tokenize]);

  // Calculate stats
  const rusenTokenCount = tokens.length;
  const gpt4TokenCount = gpt4Tokens.length;
  const savings = gpt4TokenCount > 0
    ? (((gpt4TokenCount - rusenTokenCount) / gpt4TokenCount) * 100).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-neutral-500">Loading tokenizers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Rusenizer</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        A Turkish-optimized BPE tokenizer trained on Turkish Wikipedia. Uses{" "}
        <span className="font-mono text-sm">{vocabSize.toLocaleString()}</span> tokens
        and achieves ~45% fewer tokens than GPT-4 on Turkish text.
      </p>

      {/* Example buttons */}
      <div className="mb-6">
        <div className="text-sm text-neutral-500 mb-2">Try an example:</div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TEXTS.map((text) => (
            <button
              key={text}
              onClick={() => setInputText(text)}
              className={`px-3 py-1 text-sm rounded-full border transition ${
                inputText === text
                  ? "border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
              }`}
            >
              {text.length > 25 ? text.slice(0, 25) + "..." : text}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">Input Text</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-24 p-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-400"
          placeholder="Enter any text to tokenize..."
        />
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Rusenizer */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Rusenizer v1</h2>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {rusenTokenCount} tokens
            </span>
          </div>
          <div className="flex flex-wrap gap-1 min-h-[60px]">
            {tokens.map((token, i) => (
              <span
                key={i}
                className={`relative group px-2 py-1 rounded text-sm font-mono cursor-default ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}
              >
                {token.text.replace(/ /g, "·").replace(/\n/g, "↵")}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  ID: {token.id}
                </span>
              </span>
            ))}
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
          <div className="flex flex-wrap gap-1 min-h-[60px]">
            {gpt4Tokens.map((token, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-sm font-mono ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}
              >
                {token.replace(/ /g, "·").replace(/\n/g, "↵")}
              </span>
            ))}
          </div>
          {savings && Number(savings) > 0 && (
            <div className="mt-4 text-sm text-green-600 dark:text-green-400 font-medium">
              Rusenizer saves {savings}% tokens
            </div>
          )}
          {savings && Number(savings) < 0 && (
            <div className="mt-4 text-sm text-neutral-500 font-medium">
              GPT-4 uses {Math.abs(Number(savings))}% fewer tokens
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{inputText.length}</div>
          <div className="text-sm text-neutral-500">Characters</div>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{new TextEncoder().encode(inputText).length}</div>
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

      {/* Token Details */}
      {tokens.length > 0 && (
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
                {tokens.map((token, i) => (
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
