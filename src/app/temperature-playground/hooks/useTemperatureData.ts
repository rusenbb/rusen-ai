"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptData, PromptManifestEntry } from "../types";

const DATA_BASE = "/temperature-playground/data";

const dataCache = new Map<string, PromptData>();

export interface UseTemperatureDataResult {
  manifest: PromptManifestEntry[];
  currentData: PromptData | null;
  loading: boolean;
  selectPrompt: (index: number) => void;
}

async function fetchAndParsePrompt(fileName: string): Promise<PromptData> {
  const res = await fetch(`${DATA_BASE}/${fileName}`);
  const data: PromptData = await res.json();

  for (const tempKey of Object.keys(data.trees)) {
    for (const branch of data.trees[tempKey]) {
      for (const token of branch.tokens) {
        token.logprobs = (
          token.logprobs as unknown as [number, string, number][]
        ).map(([id, text, logprob]) => ({ id, text, logprob }));
      }
    }
  }

  return data;
}

export function useTemperatureData(): UseTemperatureDataResult {
  const [manifest, setManifest] = useState<PromptManifestEntry[]>([]);
  const [currentData, setCurrentData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const initPromise = useRef<Promise<void> | null>(null);

  const loadPromptData = useCallback(async (fileName: string) => {
    const cached = dataCache.get(fileName);
    if (cached) {
      setCurrentData(cached);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAndParsePrompt(fileName);
      dataCache.set(fileName, data);
      setCurrentData(data);
    } catch (err) {
      console.error(`Failed to load prompt data: ${fileName}`, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initPromise.current) return;

    initPromise.current = (async () => {
      try {
        const res = await fetch(`${DATA_BASE}/index.json`);
        const entries: PromptManifestEntry[] = await res.json();
        setManifest(entries);

        if (entries.length > 0) {
          await loadPromptData(entries[0].file);
        }
      } catch (err) {
        console.error("Failed to load temperature data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPromptData]);

  const selectPrompt = useCallback(
    (index: number) => {
      if (manifest[index]) {
        loadPromptData(manifest[index].file);
      }
    },
    [manifest, loadPromptData],
  );

  return {
    manifest,
    currentData,
    loading,
    selectPrompt,
  };
}
