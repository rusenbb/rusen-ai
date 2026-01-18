"use client";

import { useState, useCallback } from "react";
import { getApiUrl } from "@/lib/api";

interface TokenInfo {
  token: string;
  logprob: number;
  probability: number;
  alternatives: {
    token: string;
    logprob: number;
    probability: number;
  }[];
}

interface TokenExplorerProps {
  disabled?: boolean;
}

const SYSTEM_PROMPT = `You are a helpful assistant. Continue the given text naturally with a single short phrase or sentence.`;

export default function TokenExplorer({ disabled }: TokenExplorerProps) {
  const [inputText, setInputText] = useState("");
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemp, setSelectedTemp] = useState(0.7);

  const fetchTokens = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl("/api/llm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Continue this text: "${prompt}"` },
          ],
          stream: false,
          max_tokens: 50,
          temperature: selectedTemp,
          logprobs: true,
          top_logprobs: 5,
          use_case: "temperature-playground",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      const logprobsData = data.choices?.[0]?.logprobs?.content;

      if (!logprobsData || !Array.isArray(logprobsData)) {
        setTokens([]);
        setError("Model did not return logprobs. Try a different model.");
        return;
      }

      const parsedTokens: TokenInfo[] = logprobsData.map((tokenData: {
        token: string;
        logprob: number;
        top_logprobs?: Array<{ token: string; logprob: number }>;
      }) => ({
        token: tokenData.token,
        logprob: tokenData.logprob,
        probability: Math.exp(tokenData.logprob),
        alternatives: (tokenData.top_logprobs || []).map((alt) => ({
          token: alt.token,
          logprob: alt.logprob,
          probability: Math.exp(alt.logprob),
        })),
      }));

      setTokens(parsedTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tokens");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemp]);

  const handleBranch = useCallback((upToIndex: number, alternativeToken: string) => {
    const newPrompt = inputText + tokens.slice(0, upToIndex).map(t => t.token).join("") + alternativeToken;
    setInputText(newPrompt);
    fetchTokens(newPrompt);
  }, [inputText, tokens, fetchTokens]);

  return (
    <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      <h3 className="font-semibold mb-2">Token Explorer</h3>
      <p className="text-sm text-neutral-500 mb-4">
        See the actual token probabilities from the model and explore alternative paths.
        Click on alternative tokens to "steer" the generation in a different direction.
      </p>

      {/* Input and controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to continue..."
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:outline-none"
            disabled={disabled || isLoading}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Temp:</label>
          <select
            value={selectedTemp}
            onChange={(e) => setSelectedTemp(parseFloat(e.target.value))}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
            disabled={disabled || isLoading}
          >
            <option value={0}>0.0</option>
            <option value={0.3}>0.3</option>
            <option value={0.5}>0.5</option>
            <option value={0.7}>0.7</option>
            <option value={1.0}>1.0</option>
          </select>
          <button
            onClick={() => fetchTokens(inputText)}
            disabled={disabled || isLoading || !inputText.trim()}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Explore"}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Token display */}
      {tokens.length > 0 && (
        <div className="space-y-4">
          {/* Generated text */}
          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <div className="text-xs text-neutral-500 mb-2">Generated continuation:</div>
            <div className="font-mono text-sm">
              <span className="text-neutral-400">{inputText}</span>
              <span className="text-neutral-900 dark:text-white">
                {tokens.map(t => t.token).join("")}
              </span>
            </div>
          </div>

          {/* Token-by-token breakdown */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Token breakdown (click alternatives to branch):</div>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token, idx) => (
                <div
                  key={idx}
                  className="group relative"
                >
                  {/* Main token */}
                  <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm font-mono cursor-default">
                    <span className="text-green-800 dark:text-green-200">
                      {token.token.replace(/\n/g, "\\n").replace(/\t/g, "\\t")}
                    </span>
                    <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                      {(token.probability * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Alternatives dropdown on hover */}
                  {token.alternatives.length > 1 && (
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-10 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-2 min-w-[150px]">
                      <div className="text-xs text-neutral-500 mb-1">Alternative tokens:</div>
                      {token.alternatives.slice(0, 5).map((alt, altIdx) => (
                        <button
                          key={altIdx}
                          onClick={() => handleBranch(idx, alt.token)}
                          className="w-full text-left px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm font-mono flex justify-between items-center"
                        >
                          <span className={alt.token === token.token ? "text-green-600" : ""}>
                            {alt.token.replace(/\n/g, "\\n").replace(/\t/g, "\\t")}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {(alt.probability * 100).toFixed(1)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Probability bars */}
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Probability distribution per token:</div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {tokens.slice(0, 10).map((token, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-20 text-xs font-mono truncate text-right">
                    {token.token.replace(/\n/g, "\\n")}
                  </span>
                  <div className="flex-1 h-4 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(token.probability * 100, 100)}%` }}
                    />
                  </div>
                  <span className="w-14 text-xs text-right">
                    {(token.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {tokens.length === 0 && !isLoading && !error && (
        <div className="text-center text-neutral-400 py-8">
          Enter some text and click "Explore" to see token probabilities
        </div>
      )}
    </div>
  );
}
