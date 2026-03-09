"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { GeneratedToken, TokenProbability } from "../types";

// Browser-friendly ONNX causal LM for next-word prediction
const MODEL_NAME = "onnx-community/Qwen3-0.6B-ONNX";
const TOP_K = 100; // Number of top tokens to show in visualization
type Backend = "webgpu" | "wasm" | "unknown";

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

export interface BranchingOptions {
  temperature: number;
  maxTokens: number;
  checkpointEvery: number;
  perplexityThreshold: number;
  maxNodes: number;
  topK?: number;
}

export interface BranchingCallbacks {
  onBranchCreated: (branchId: number, parentId: number | null, depth: number, parentForkTokenIndex: number) => void;
  onToken: (branchId: number, token: GeneratedToken) => Promise<void> | void;
  onBranchMetric?: (branchId: number, perplexity: number) => void;
  onBranchFinished?: (branchId: number) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface UseLocalLLMReturn {
  isModelLoading: boolean;
  modelProgress: number;
  modelError: string | null;
  isReady: boolean;
  modelName: string;
  backend: Backend;
  generateTokenByToken: (
    prompt: string,
    options: GenerationOptions,
    callbacks: GenerationCallbacks
  ) => AbortController;
  generateWithBranching: (
    prompt: string,
    options: BranchingOptions,
    callbacks: BranchingCallbacks
  ) => AbortController;
}

function softmax(logits: Float32Array): Float32Array {
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i += 1) {
    if (logits[i] > maxLogit) maxLogit = logits[i];
  }

  let sum = 0;
  const expVals = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i += 1) {
    const v = Math.exp(logits[i] - maxLogit);
    expVals[i] = v;
    sum += v;
  }

  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i += 1) {
    probs[i] = expVals[i] / sum;
  }
  return probs;
}

function calcPerplexity(probs: Float32Array): number {
  let entropy = 0;
  for (let i = 0; i < probs.length; i += 1) {
    const p = probs[i];
    if (p > 0) entropy -= p * Math.log(p);
  }
  return Math.exp(entropy);
}

function getTopKTokens(
  probs: Float32Array,
  tokenizer: { decode: (ids: number[]) => string },
  k: number
): TokenProbability[] {
  const indexed: [number, number][] = [];
  for (let i = 0; i < probs.length; i += 1) {
    indexed.push([i, probs[i]]);
  }
  indexed.sort((a, b) => b[1] - a[1]);
  return indexed.slice(0, k).map(([tokenId, probability]) => ({
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
  const [backend, setBackend] = useState<Backend>("unknown");

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

        const supportsWebGPU =
          typeof navigator !== "undefined" &&
          typeof navigator.gpu !== "undefined";
        const backendsToTry: ("webgpu" | "wasm")[] = supportsWebGPU ? ["webgpu", "wasm"] : ["wasm"];

        let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null;
        let model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>> | null = null;
        let lastError: unknown = null;

        // Load tokenizer once. It is backend-agnostic.
        tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME, {
          progress_callback: (progress: unknown) => {
            const p = progress as { progress?: number };
            if (p.progress !== undefined) {
              // Tokenizer is about 10% of total loading
              setModelProgress(Math.round(p.progress * 0.1));
            }
          },
        });

        for (const candidateBackend of backendsToTry) {
          try {
            model = await AutoModelForCausalLM.from_pretrained(MODEL_NAME, {
              device: candidateBackend,
              dtype: "q4f16",
              progress_callback: (progress: unknown) => {
                const p = progress as { progress?: number };
                if (p.progress !== undefined) {
                  // Model is 90% of total loading (offset by tokenizer's 10%)
                  setModelProgress(Math.round(10 + p.progress * 0.9));
                }
              },
            });
            setBackend(candidateBackend);
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!tokenizer || !model) {
          throw lastError instanceof Error ? lastError : new Error("Failed to load model backend");
        }

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

          const inputs = tokenizer(prompt);

          const { TextStreamer, LogitsProcessor, LogitsProcessorList, Tensor } =
            await import("@huggingface/transformers");

          const stepInfos: { top: TokenProbability[] }[] = [];

          const captureProcessor = new (class extends LogitsProcessor {
            _call(
              _input_ids: bigint[][],
              logits: InstanceType<typeof Tensor>
            ): InstanceType<typeof Tensor> {
              const row = logits.data as Float32Array;
              const probs = softmax(row);
              const top = getTopKTokens(probs, tokenizer, topK);
              stepInfos.push({ top });
              return logits;
            }
          })();

          const processorList = new LogitsProcessorList();
          processorList.push(captureProcessor);

          const pendingCallbacks: Array<Promise<void> | void> = [];
          let emittedTokens = 0;

          const streamer = new TextStreamer(tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
            callback_function: () => {},
            token_callback_function: (tokenIds: bigint[]) => {
              if (abortController.signal.aborted) return;
              for (const tokenIdBigInt of tokenIds) {
                const tokenId = Number(tokenIdBigInt);
                const tokenText = tokenizer.decode([tokenId]);
                const info = stepInfos[emittedTokens];
                const top = info?.top ?? [];
                const selectedProbability =
                  top.find((c) => c.tokenId === tokenId)?.probability ?? 0;

                const generatedToken: GeneratedToken = {
                  token: tokenText,
                  tokenId,
                  selectedProbability,
                  topProbabilities: top,
                };

                emittedTokens += 1;
                pendingCallbacks.push(callbacks.onToken(generatedToken));
              }
            },
          });

          await model.generate({
            ...inputs,
            max_new_tokens: maxTokens,
            do_sample: temperature >= 0.01,
            temperature: Math.max(temperature, 0.001),
            top_k: topK,
            logits_processor: processorList,
            streamer,
          });

          await Promise.allSettled(
            pendingCallbacks.map((cb) => Promise.resolve(cb))
          );

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

  const generateWithBranching = useCallback(
    (
      prompt: string,
      options: BranchingOptions,
      callbacks: BranchingCallbacks
    ): AbortController => {
      const abortController = new AbortController();
      const {
        temperature,
        maxTokens,
        checkpointEvery,
        perplexityThreshold,
        maxNodes,
        topK = TOP_K,
      } = options;

      type BranchState = {
        id: number;
        parentId: number | null;
        depth: number;
        text: string;
        inputIds: number[];
        tokenCount: number;
        forceSecondBestNext: boolean;
      };

      const run = async () => {
        try {
          await loadModel();

          const model = modelRef.current;
          const tokenizer = tokenizerRef.current;
          if (!model || !tokenizer) {
            throw new Error("Model not loaded");
          }

          const { TextStreamer, LogitsProcessor, LogitsProcessorList, Tensor } = await import(
            "@huggingface/transformers"
          );

          const rootInputs = tokenizer(prompt);
          const baseInputIds = Array.from(
            rootInputs.input_ids.data as BigInt64Array
          ).map((id) => Number(id));

          const queue: BranchState[] = [];
          let nextBranchId = 0;
          const root: BranchState = {
            id: nextBranchId,
            parentId: null,
            depth: 0,
            text: "",
            inputIds: [...baseInputIds],
            tokenCount: 0,
            forceSecondBestNext: false,
          };
          nextBranchId += 1;
          callbacks.onBranchCreated(root.id, root.parentId, root.depth, 0);
          queue.push(root);

          while (queue.length > 0 && !abortController.signal.aborted) {
            const branch = queue.shift();
            if (!branch) break;

            while (branch.tokenCount < maxTokens && !abortController.signal.aborted) {
              const segmentSize = Math.min(
                checkpointEvery,
                maxTokens - branch.tokenCount
              );
              if (segmentSize <= 0) break;

              const inputs = tokenizer(`${prompt}${branch.text}`);

              const stepInfos: { top: TokenProbability[]; perplexity: number }[] = [];
              let stepIndex = 0;
              let peakPerplexity = 0;
              let emittedTokens = 0;
              const pendingCallbacks: Array<Promise<void> | void> = [];
              const forceSecondBestForFirstStep = branch.forceSecondBestNext;

              const dynamicProcessor = new (class extends LogitsProcessor {
                _call(_input_ids: bigint[][], logits: InstanceType<typeof Tensor>): InstanceType<typeof Tensor> {
                  const row = logits.data as Float32Array;
                  const probs = softmax(row);
                  const top = getTopKTokens(probs, tokenizer, Math.max(2, topK));
                  const perplexity = calcPerplexity(probs);
                  peakPerplexity = Math.max(peakPerplexity, perplexity);
                  stepInfos.push({ top, perplexity });

                  if (forceSecondBestForFirstStep && stepIndex === 0 && top.length > 1) {
                    const forcedId = top[1].tokenId;
                    row.fill(-Infinity);
                    row[forcedId] = 0;
                  }
                  stepIndex += 1;
                  return logits;
                }
              })();

              const processorList = new LogitsProcessorList();
              processorList.push(dynamicProcessor);

              const streamer = new TextStreamer(tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: () => {},
                token_callback_function: (tokenIds: bigint[]) => {
                  if (abortController.signal.aborted) return;
                  for (const tokenIdBigInt of tokenIds) {
                    const tokenId = Number(tokenIdBigInt);
                    const tokenText = tokenizer.decode([tokenId]);
                    const info = stepInfos[emittedTokens];
                    const top = info?.top ?? [];
                    const selectedProbability =
                      top.find((candidate) => candidate.tokenId === tokenId)
                        ?.probability ?? 0;

                    const generatedToken: GeneratedToken = {
                      token: tokenText,
                      tokenId,
                      selectedProbability,
                      topProbabilities: top,
                    };

                    branch.text += tokenText;
                    branch.tokenCount += 1;
                    emittedTokens += 1;
                    if (info) {
                      callbacks.onBranchMetric?.(branch.id, info.perplexity);
                    }
                    pendingCallbacks.push(callbacks.onToken(branch.id, generatedToken));
                  }
                },
              });

              await model.generate({
                ...inputs,
                max_new_tokens: segmentSize,
                do_sample: temperature >= 0.01,
                temperature: Math.max(temperature, 0.001),
                top_k: topK,
                logits_processor: processorList,
                streamer,
              });

              await Promise.allSettled(pendingCallbacks.map((cb) => Promise.resolve(cb)));
              branch.forceSecondBestNext = false;

              if (emittedTokens === 0) {
                break;
              }

              const remainingForChild = maxTokens - branch.tokenCount;
              if (
                peakPerplexity > perplexityThreshold &&
                nextBranchId < maxNodes &&
                remainingForChild >= checkpointEvery
              ) {
                const child: BranchState = {
                  id: nextBranchId,
                  parentId: branch.id,
                  depth: branch.depth + 1,
                  text: branch.text,
                  inputIds: [...branch.inputIds],
                  tokenCount: 0,
                  forceSecondBestNext: true,
                };
                nextBranchId += 1;
                callbacks.onBranchCreated(child.id, child.parentId, child.depth, branch.tokenCount);
                queue.push(child);
              }
            }

            callbacks.onBranchFinished?.(branch.id);
          }

          if (!abortController.signal.aborted) {
            callbacks.onComplete();
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            callbacks.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      };

      run();
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
    modelName: MODEL_NAME,
    backend,
    generateTokenByToken,
    generateWithBranching,
  };
}
