"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import { useEmbeddings, cosineSimilarity } from "./hooks/useEmbeddings";
import { reduceToThreeDimensions } from "./utils/umap";
import Visualization3D from "./components/Visualization3D";
import TextInput from "./components/TextInput";
import DatasetSelector from "./components/DatasetSelector";
import SearchPanel from "./components/SearchPanel";
import PointDetails from "./components/PointDetails";
import LoadingProgress from "./components/LoadingProgress";
import {
  initialState,
  generateId,
  DATASETS,
  type EmbeddingExplorerState,
  type EmbeddingExplorerAction,
  type TextItem,
  type SearchResult,
} from "./types";

function reducer(state: EmbeddingExplorerState, action: EmbeddingExplorerAction): EmbeddingExplorerState {
  switch (action.type) {
    case "ADD_TEXT": {
      const newItem: TextItem = {
        id: generateId(),
        text: action.text,
        category: action.category,
        embedding: null,
        x: null,
        y: null,
        z: null,
      };
      return {
        ...state,
        texts: [...state.texts, newItem],
        categories: state.categories.includes(action.category)
          ? state.categories
          : [...state.categories, action.category],
      };
    }

    case "ADD_TEXTS": {
      const newItems: TextItem[] = action.texts.map((t) => ({
        id: generateId(),
        text: t.text,
        category: t.category,
        embedding: null,
        x: null,
        y: null,
        z: null,
      }));
      const newCategories = new Set([
        ...state.categories,
        ...action.texts.map((t) => t.category),
      ]);
      return {
        ...state,
        texts: [...state.texts, ...newItems],
        categories: Array.from(newCategories),
      };
    }

    case "REMOVE_TEXT":
      return {
        ...state,
        texts: state.texts.filter((t) => t.id !== action.id),
        selectedPointId: state.selectedPointId === action.id ? null : state.selectedPointId,
        searchResults: state.searchResults.filter((r) => r.item.id !== action.id),
      };

    case "CLEAR_ALL":
      return {
        ...initialState,
        modelProgress: state.modelProgress,
      };

    case "SET_EMBEDDINGS": {
      const updatedTexts = state.texts.map((t) => ({
        ...t,
        embedding: action.embeddings.get(t.id) ?? t.embedding,
      }));
      return { ...state, texts: updatedTexts };
    }

    case "SET_PROJECTIONS": {
      const updatedTexts = state.texts.map((t) => {
        const proj = action.projections.get(t.id);
        return proj ? { ...t, x: proj.x, y: proj.y, z: proj.z } : t;
      });
      return { ...state, texts: updatedTexts };
    }

    case "SET_MODEL_PROGRESS":
      return {
        ...state,
        modelProgress: { ...state.modelProgress, ...action.progress },
      };

    case "SET_EMBEDDING_PROGRESS":
      return {
        ...state,
        isEmbedding: action.isEmbedding,
        embeddingProgress: action.progress ?? state.embeddingProgress,
      };

    case "SET_REDUCING":
      return { ...state, isReducing: action.isReducing };

    case "SELECT_POINT":
      return { ...state, selectedPointId: action.id };

    case "HOVER_POINT":
      return { ...state, hoveredPointId: action.id };

    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.query };

    case "SET_SEARCH_RESULTS":
      return { ...state, searchResults: action.results };

    case "ADD_CATEGORY":
      return state.categories.includes(action.category)
        ? state
        : { ...state, categories: [...state.categories, action.category] };

    case "LOAD_DATASET": {
      const dataset = DATASETS.find((d) => d.name === action.name);
      if (!dataset) return state;

      const newItems: TextItem[] = dataset.items.map((item) => ({
        id: generateId(),
        text: item.text,
        category: item.category,
        embedding: null,
        x: null,
        y: null,
        z: null,
      }));

      const newCategories = new Set([
        ...state.categories,
        ...dataset.items.map((i) => i.category),
      ]);

      return {
        ...state,
        texts: newItems,
        categories: Array.from(newCategories),
        selectedPointId: null,
        searchResults: [],
      };
    }

    default:
      return state;
  }
}

export default function EmbeddingExplorerPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    isModelLoading,
    modelProgress,
    modelError,
    isReady,
    embed,
    embedSingle,
  } = useEmbeddings();

  const processingRef = useRef(false);

  // Update model progress in state
  useEffect(() => {
    dispatch({
      type: "SET_MODEL_PROGRESS",
      progress: {
        status: isModelLoading ? "loading" : isReady ? "ready" : modelError ? "error" : "idle",
        progress: modelProgress,
        message: modelError || (isReady ? "Ready" : isModelLoading ? "Loading..." : "Not loaded"),
      },
    });
  }, [isModelLoading, modelProgress, modelError, isReady]);

  // Process texts when they change (compute embeddings + UMAP)
  useEffect(() => {
    const textsWithoutEmbeddings = state.texts.filter((t) => t.embedding === null);

    if (textsWithoutEmbeddings.length === 0 || processingRef.current) {
      return;
    }

    const processTexts = async () => {
      processingRef.current = true;

      try {
        // Compute embeddings
        dispatch({ type: "SET_EMBEDDING_PROGRESS", isEmbedding: true, progress: 0 });

        const textStrings = textsWithoutEmbeddings.map((t) => t.text);
        const embeddings = await embed(textStrings);

        const embeddingMap = new Map<string, number[]>();
        textsWithoutEmbeddings.forEach((t, i) => {
          embeddingMap.set(t.id, embeddings[i]);
        });

        dispatch({ type: "SET_EMBEDDINGS", embeddings: embeddingMap });
        dispatch({ type: "SET_EMBEDDING_PROGRESS", isEmbedding: false, progress: 100 });

        // Get all texts with embeddings for UMAP
        const allTextsWithEmbeddings = state.texts.map((t) => ({
          ...t,
          embedding: embeddingMap.get(t.id) ?? t.embedding,
        })).filter((t) => t.embedding !== null);

        if (allTextsWithEmbeddings.length >= 2) {
          // Run UMAP for 3D
          dispatch({ type: "SET_REDUCING", isReducing: true });

          const projections = await reduceToThreeDimensions(
            allTextsWithEmbeddings.map((t) => ({
              id: t.id,
              embedding: t.embedding!,
            }))
          );

          const projectionMap = new Map<string, { x: number; y: number; z: number }>();
          projections.forEach((p) => {
            projectionMap.set(p.id, { x: p.x, y: p.y, z: p.z });
          });

          dispatch({ type: "SET_PROJECTIONS", projections: projectionMap });
          dispatch({ type: "SET_REDUCING", isReducing: false });
        }
      } catch (error) {
        console.error("Error processing texts:", error);
        dispatch({ type: "SET_EMBEDDING_PROGRESS", isEmbedding: false });
        dispatch({ type: "SET_REDUCING", isReducing: false });
      } finally {
        processingRef.current = false;
      }
    };

    processTexts();
  }, [state.texts, embed]);

  // Handlers
  const handleAddText = useCallback((text: string, category: string) => {
    dispatch({ type: "ADD_TEXT", text, category });
  }, []);

  const handleAddCategory = useCallback((category: string) => {
    dispatch({ type: "ADD_CATEGORY", category });
  }, []);

  const handleLoadDataset = useCallback((name: string) => {
    dispatch({ type: "LOAD_DATASET", name });
  }, []);

  const handleSelectPoint = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_POINT", id });
  }, []);

  const handleHoverPoint = useCallback((id: string | null) => {
    dispatch({ type: "HOVER_POINT", id });
  }, []);

  const handleDeleteText = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TEXT", id });
    dispatch({ type: "SELECT_POINT", id: null });
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      dispatch({ type: "SET_SEARCH_QUERY", query });

      try {
        // Get query embedding
        const queryEmbedding = await embedSingle(query);

        // Find similar texts
        const textsWithEmbeddings = state.texts.filter((t) => t.embedding !== null);
        const results: SearchResult[] = textsWithEmbeddings
          .map((item) => ({
            item,
            similarity: cosineSimilarity(queryEmbedding, item.embedding!),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);

        dispatch({ type: "SET_SEARCH_RESULTS", results });
      } catch (error) {
        console.error("Search error:", error);
      }
    },
    [state.texts, embedSingle]
  );

  const handleClearSearch = useCallback(() => {
    dispatch({ type: "SET_SEARCH_QUERY", query: "" });
    dispatch({ type: "SET_SEARCH_RESULTS", results: [] });
  }, []);

  const selectedItem = state.selectedPointId
    ? state.texts.find((t) => t.id === state.selectedPointId) ?? null
    : null;

  const isProcessing = state.isEmbedding || state.isReducing || isModelLoading;

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Embedding Explorer</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Visualize how text embeddings cluster in vector space. Add texts, see them as points,
        and discover semantic relationships. Powered by all-MiniLM-L6-v2 running in your browser.
      </p>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left sidebar - inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Loading progress */}
          <LoadingProgress
            isModelLoading={isModelLoading}
            modelProgress={modelProgress}
            modelError={modelError}
            isEmbedding={state.isEmbedding}
            embeddingProgress={state.embeddingProgress}
            isReducing={state.isReducing}
          />

          {/* Text input */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <TextInput
              categories={state.categories}
              onAddText={handleAddText}
              onAddCategory={handleAddCategory}
              disabled={isProcessing}
            />
          </div>

          {/* Dataset selector */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <DatasetSelector onLoadDataset={handleLoadDataset} disabled={isProcessing} />
          </div>

          {/* Stats & controls */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Points: {state.texts.length}</span>
              {state.texts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  disabled={isProcessing}
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="text-xs text-neutral-500">
              {state.texts.filter((t) => t.embedding !== null).length} embedded,{" "}
              {state.texts.filter((t) => t.x !== null && t.z !== null).length} projected to 3D
            </div>
          </div>
        </div>

        {/* Right content - visualization & details */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3D Visualization */}
          <Visualization3D
            items={state.texts}
            selectedPointId={state.selectedPointId}
            hoveredPointId={state.hoveredPointId}
            searchResults={state.searchResults}
            onSelectPoint={handleSelectPoint}
            onHoverPoint={handleHoverPoint}
          />

          {/* Search panel */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <h3 className="text-sm font-medium mb-3">Similarity Search</h3>
            <SearchPanel
              searchResults={state.searchResults}
              onSearch={handleSearch}
              onClearSearch={handleClearSearch}
              onSelectResult={handleSelectPoint}
              disabled={state.texts.length === 0 || isProcessing}
            />
          </div>

          {/* Point details */}
          {selectedItem && (
            <PointDetails
              item={selectedItem}
              onClose={() => handleSelectPoint(null)}
              onDelete={handleDeleteText}
            />
          )}
        </div>
      </div>

      {/* About section */}
      <div className="mt-12 text-sm text-neutral-500">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          How it works
        </h3>
        <p className="mb-2">
          <strong>Embeddings:</strong> Each text is converted to a 384-dimensional vector using
          the all-MiniLM-L6-v2 model from Hugging Face, running entirely in your browser via
          Transformers.js.
        </p>
        <p className="mb-2">
          <strong>UMAP to 3D:</strong> The high-dimensional vectors are reduced to 3D using UMAP
          (Uniform Manifold Approximation and Projection), which preserves both local
          neighborhood structure and global topology. The 3D space is rendered using Three.js.
        </p>
        <p>
          <strong>Similarity:</strong> Search uses cosine similarity to find texts with
          the most similar embeddings to your query.
        </p>
      </div>
    </div>
  );
}
