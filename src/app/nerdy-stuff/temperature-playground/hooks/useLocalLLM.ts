"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TokenProbability, GeneratedToken } from "../types";

// Model to use - DistilGPT-2 is small (~82MB ONNX) and good for demonstration
const MODEL_NAME = "Xenova/distilgpt2";
const TOP_K = 10; // Number of top tokens to show in visualization

export interface GenerationCallbacks {
  onToken: (token: GeneratedToken) => Promise<void> | void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface GenerationOptions {
  temperature: number;
  maxTokens: number;
  topK?: number;
}

export interface UseLocalLLMReturn {
  isModelLoading: boolean;
  modelProgress: number;
  modelError: string | null;
  isReady: boolean;
  generateTokenByToken: (
    prompt: string,
    options: GenerationOptions,
    callbacks: GenerationCallbacks
  ) => AbortController;
}

// Softmax with numerical stability
function softmax(logits: Float32Array, temperature: number): Float32Array {
  const T = Math.max(temperature, 0.001); // Prevent division by zero
  const scaledLogits = new Float32Array(logits.length);

  // Scale by temperature
  for (let i = 0; i < logits.length; i++) {
    scaledLogits[i] = logits[i] / T;
  }

  // Find max for numerical stability
  let maxLogit = -Infinity;
  for (let i = 0; i < scaledLogits.length; i++) {
    if (scaledLogits[i] > maxLogit) maxLogit = scaledLogits[i];
  }

  // Compute exp(x - max) and sum
  let sumExp = 0;
  const expLogits = new Float32Array(logits.length);
  for (let i = 0; i < scaledLogits.length; i++) {
    expLogits[i] = Math.exp(scaledLogits[i] - maxLogit);
    sumExp += expLogits[i];
  }

  // Normalize
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < expLogits.length; i++) {
    probs[i] = expLogits[i] / sumExp;
  }

  return probs;
}

// Sample from probability distribution
function sampleFromDistribution(probs: Float32Array): number {
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (random < cumulative) {
      return i;
    }
  }
  return probs.length - 1; // Fallback to last token
}

// Get top-k tokens with highest probabilities
function getTopKTokens(
  probs: Float32Array,
  tokenizer: { decode: (ids: number[]) => string },
  k: number
): TokenProbability[] {
  // Create array of [index, probability] pairs
  const indexed: [number, number][] = [];
  for (let i = 0; i < probs.length; i++) {
    indexed.push([i, probs[i]]);
  }

  // Sort by probability descending
  indexed.sort((a, b) => b[1] - a[1]);

  // Take top k
  const topK = indexed.slice(0, k);

  // Convert to TokenProbability objects
  return topK.map(([tokenId, probability]) => ({
    token: tokenizer.decode([tokenId]),
    tokenId,
    probability,
  }));
}

export function useLocalLLM(): UseLocalLLMReturn {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Store model and tokenizer references
  // Using 'any' here because the transformers.js types are complex and we load dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenizerRef = useRef<any>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  // Load the model lazily
  const loadModel = useCallback(async (): Promise<void> => {
    // Return if already ready
    if (modelRef.current && tokenizerRef.current) {
      return;
    }

    // Return existing loading promise if in progress
    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    // Start loading
    setIsModelLoading(true);
    setModelProgress(0);
    setModelError(null);

    loadingPromiseRef.current = (async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { AutoTokenizer, AutoModelForCausalLM, env } = await import(
          "@huggingface/transformers"
        );

        // Configure for browser-only usage
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        // Load tokenizer first (small)
        const tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME, {
          progress_callback: (progress: unknown) => {
            const p = progress as { progress?: number };
            if (p.progress !== undefined) {
              // Tokenizer is about 10% of total loading
              setModelProgress(Math.round(p.progress * 0.1));
            }
          },
        });

        // Load model (larger, main download)
        const model = await AutoModelForCausalLM.from_pretrained(MODEL_NAME, {
          progress_callback: (progress: unknown) => {
            const p = progress as { progress?: number };
            if (p.progress !== undefined) {
              // Model is 90% of total loading (offset by tokenizer's 10%)
              setModelProgress(Math.round(10 + p.progress * 0.9));
            }
          },
        });

        modelRef.current = model;
        tokenizerRef.current = tokenizer;
        setIsReady(true);
        setIsModelLoading(false);
        setModelProgress(100);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load model";
        setModelError(message);
        setIsModelLoading(false);
        loadingPromiseRef.current = null;
        throw error;
      }
    })();

    return loadingPromiseRef.current;
  }, []);

  // Generate tokens one by one with full probability access
  const generateTokenByToken = useCallback(
    (
      prompt: string,
      options: GenerationOptions,
      callbacks: GenerationCallbacks
    ): AbortController => {
      const abortController = new AbortController();
      const { temperature, maxTokens, topK = TOP_K } = options;

      const generate = async () => {
        try {
          // Ensure model is loaded
          await loadModel();

          const model = modelRef.current;
          const tokenizer = tokenizerRef.current;

          if (!model || !tokenizer) {
            throw new Error("Model not loaded");
          }

          // Encode the prompt
          const inputIds = tokenizer.encode(prompt);
          let currentIds = [...inputIds];

          // EOS token ID for stopping
          const eosTokenId = tokenizer.eos_token_id ?? 50256; // GPT-2's EOS

          // Import Tensor once
          const { Tensor } = await import("@huggingface/transformers");

          // Generate tokens one by one
          for (let i = 0; i < maxTokens; i++) {
            if (abortController.signal.aborted) {
              break;
            }

            const seqLength = currentIds.length;

            // Prepare input tensors
            const inputTensor = new Tensor(
              "int64",
              BigInt64Array.from(currentIds.map(BigInt)),
              [1, seqLength]
            );

            // Attention mask: all 1s (attend to all tokens)
            const attentionMask = new Tensor(
              "int64",
              BigInt64Array.from(Array(seqLength).fill(BigInt(1))),
              [1, seqLength]
            );

            // Position IDs: 0, 1, 2, ..., seqLength-1
            const positionIds = new Tensor(
              "int64",
              BigInt64Array.from(Array.from({ length: seqLength }, (_, i) => BigInt(i))),
              [1, seqLength]
            );

            // Forward pass to get logits
            const output = await model.forward({
              input_ids: inputTensor,
              attention_mask: attentionMask,
              position_ids: positionIds,
            });

            // Get logits for the last token position
            // Shape is [batch, seq_len, vocab_size]
            const logits = output.logits;
            const vocabSize = logits.dims[2];
            const lastTokenLogits = new Float32Array(vocabSize);

            // Extract logits for the last position
            const offset = (currentIds.length - 1) * vocabSize;
            for (let j = 0; j < vocabSize; j++) {
              lastTokenLogits[j] = logits.data[offset + j];
            }

            // Apply temperature and get probabilities
            const probs = softmax(lastTokenLogits, temperature);

            // Get top-k tokens for visualization
            const topProbabilities = getTopKTokens(probs, tokenizer, topK);

            // Sample next token (or argmax if temperature is ~0)
            let nextTokenId: number;
            if (temperature < 0.01) {
              // Greedy decoding for T≈0
              nextTokenId = topProbabilities[0].tokenId;
            } else {
              nextTokenId = sampleFromDistribution(probs);
            }

            // Decode the token
            const tokenText = tokenizer.decode([nextTokenId]);
            const selectedProbability = probs[nextTokenId];

            // Create the token result
            const generatedToken: GeneratedToken = {
              token: tokenText,
              tokenId: nextTokenId,
              selectedProbability,
              topProbabilities,
            };

            // Call the callback
            await callbacks.onToken(generatedToken);

            // Check for EOS
            if (nextTokenId === eosTokenId) {
              break;
            }

            // Append token for next iteration
            currentIds.push(nextTokenId);

            // Dispose the output tensor to free memory
            logits.dispose?.();
          }

          if (!abortController.signal.aborted) {
            callbacks.onComplete();
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            callbacks.onError(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }
      };

      // Start generation asynchronously
      generate();

      return abortController;
    },
    [loadModel]
  );

  // Auto-load model on mount
  useEffect(() => {
    loadModel().catch((err) => {
      console.error("Failed to load model:", err);
    });
  }, [loadModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose?.();
        modelRef.current = null;
      }
      if (tokenizerRef.current) {
        tokenizerRef.current = null;
      }
    };
  }, []);

  return {
    isModelLoading,
    modelProgress,
    modelError,
    isReady,
    generateTokenByToken,
  };
}
