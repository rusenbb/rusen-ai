"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";
import { useEmbeddings, cosineSimilarity } from "./hooks/useEmbeddings";
import { reduceToThreeDimensions } from "./utils/umap";
import {
  computeAxisVector,
  projectToSemanticAxes,
  vectorArithmetic as computeVectorArithmetic,
  findNearestNeighbors,
  computeNormalizationParams,
  projectSingleToSemanticAxes,
} from "./utils/vectorMath";
import Visualization3D from "./components/Visualization3D";
import TextInput from "./components/TextInput";
import DatasetSelector from "./components/DatasetSelector";
import SearchPanel from "./components/SearchPanel";
import PointDetails from "./components/PointDetails";
import LoadingProgress from "./components/LoadingProgress";
import SemanticAxisEditor from "./components/SemanticAxisEditor";
import AxisSelector from "./components/AxisSelector";
import ProjectionModeToggle from "./components/ProjectionModeToggle";
import VectorArithmeticPanel from "./components/VectorArithmeticPanel";
import VocabularyPanel from "./components/VocabularyPanel";
import {
  initialState,
  generateId,
  DATASETS,
  type EmbeddingExplorerState,
  type EmbeddingExplorerAction,
  type TextItem,
  type SearchResult,
  type SemanticAxis,
  type VocabWord,
  type ProjectionMode,
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

    // === Projection Mode ===
    case "SET_PROJECTION_MODE":
      return {
        ...state,
        projectionMode: action.mode,
        // Clear projections when mode changes - they'll be recomputed
        texts: state.texts.map((t) => ({ ...t, x: null, y: null, z: null })),
        vocabulary: state.vocabulary.map((v) => ({ ...v, x: null, y: null, z: null })),
      };

    // === Semantic Axes ===
    case "ADD_SEMANTIC_AXIS": {
      const newAxis: SemanticAxis = {
        id: generateId(),
        name: action.axis.name,
        positiveWords: action.axis.positiveWords,
        negativeWords: action.axis.negativeWords,
        positiveEmbedding: null,
        negativeEmbedding: null,
        axisVector: null,
      };
      return {
        ...state,
        semanticAxes: [...state.semanticAxes, newAxis],
      };
    }

    case "UPDATE_SEMANTIC_AXIS":
      return {
        ...state,
        semanticAxes: state.semanticAxes.map((axis) =>
          axis.id === action.id ? { ...axis, ...action.updates } : axis
        ),
      };

    case "REMOVE_SEMANTIC_AXIS": {
      // Also clear active axes if removed axis was assigned
      const newActiveAxes = { ...state.activeAxes };
      if (newActiveAxes.x === action.id) newActiveAxes.x = null;
      if (newActiveAxes.y === action.id) newActiveAxes.y = null;
      if (newActiveAxes.z === action.id) newActiveAxes.z = null;

      return {
        ...state,
        semanticAxes: state.semanticAxes.filter((a) => a.id !== action.id),
        activeAxes: newActiveAxes,
      };
    }

    case "SET_AXIS_EMBEDDINGS":
      return {
        ...state,
        semanticAxes: state.semanticAxes.map((axis) =>
          axis.id === action.axisId
            ? {
                ...axis,
                positiveEmbedding: action.positive,
                negativeEmbedding: action.negative,
                axisVector: action.axis,
              }
            : axis
        ),
      };

    case "SET_ACTIVE_AXES":
      return {
        ...state,
        activeAxes: { ...state.activeAxes, ...action.assignment },
        // Clear projections - they'll be recomputed
        texts: state.texts.map((t) => ({ ...t, x: null, y: null, z: null })),
        vocabulary: state.vocabulary.map((v) => ({ ...v, x: null, y: null, z: null })),
      };

    case "SET_COMPUTING_AXES":
      return { ...state, isComputingAxes: action.isComputing };

    // === Vocabulary ===
    case "LOAD_VOCABULARY": {
      const vocabItems: VocabWord[] = action.words.map((word) => ({
        id: generateId(),
        text: word,
        embedding: null,
        x: null,
        y: null,
        z: null,
      }));
      return {
        ...state,
        vocabulary: vocabItems,
        vocabularyLoaded: true,
        isLoadingVocabulary: true,
        vocabularyProgress: 0,
      };
    }

    case "SET_VOCABULARY_EMBEDDINGS": {
      const updatedVocab = state.vocabulary.map((v) => ({
        ...v,
        embedding: action.embeddings.get(v.id) ?? v.embedding,
      }));
      return { ...state, vocabulary: updatedVocab };
    }

    case "SET_VOCABULARY_PROJECTIONS": {
      const updatedVocab = state.vocabulary.map((v) => {
        const proj = action.projections.get(v.id);
        return proj ? { ...v, x: proj.x, y: proj.y, z: proj.z } : v;
      });
      return { ...state, vocabulary: updatedVocab };
    }

    case "CLEAR_VOCABULARY":
      return {
        ...state,
        vocabulary: [],
        vocabularyLoaded: false,
        isLoadingVocabulary: false,
        vocabularyProgress: 0,
      };

    case "SET_LOADING_VOCABULARY":
      return {
        ...state,
        isLoadingVocabulary: action.isLoading,
        vocabularyProgress: action.progress ?? state.vocabularyProgress,
      };

    // === Vector Arithmetic ===
    case "SET_VECTOR_ARITHMETIC":
      return {
        ...state,
        vectorArithmetic: state.vectorArithmetic
          ? { ...state.vectorArithmetic, ...action.arithmetic }
          : {
              operandA: action.arithmetic.operandA ?? "",
              operandB: action.arithmetic.operandB ?? "",
              operandC: action.arithmetic.operandC ?? "",
              embeddingA: action.arithmetic.embeddingA ?? null,
              embeddingB: action.arithmetic.embeddingB ?? null,
              embeddingC: action.arithmetic.embeddingC ?? null,
              resultEmbedding: action.arithmetic.resultEmbedding ?? null,
              resultProjection: action.arithmetic.resultProjection ?? null,
              nearestNeighbors: action.arithmetic.nearestNeighbors ?? [],
            },
      };

    case "SET_ARITHMETIC_RESULT":
      return {
        ...state,
        vectorArithmetic: state.vectorArithmetic
          ? {
              ...state.vectorArithmetic,
              resultEmbedding: action.result,
              resultProjection: action.projection,
              nearestNeighbors: action.neighbors,
            }
          : null,
      };

    case "CLEAR_VECTOR_ARITHMETIC":
      return { ...state, vectorArithmetic: null };

    case "SET_COMPUTING_ARITHMETIC":
      return { ...state, isComputingArithmetic: action.isComputing };

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

  const axisProcessingRef = useRef(false);
  const vocabProcessingRef = useRef(false);

  // Process texts: compute embeddings only (projection handled separately)
  useEffect(() => {
    const textsWithoutEmbeddings = state.texts.filter((t) => t.embedding === null);

    if (textsWithoutEmbeddings.length === 0 || processingRef.current) {
      return;
    }

    const processTexts = async () => {
      processingRef.current = true;

      try {
        dispatch({ type: "SET_EMBEDDING_PROGRESS", isEmbedding: true, progress: 0 });

        const textStrings = textsWithoutEmbeddings.map((t) => t.text);
        const embeddings = await embed(textStrings);

        const embeddingMap = new Map<string, number[]>();
        textsWithoutEmbeddings.forEach((t, i) => {
          embeddingMap.set(t.id, embeddings[i]);
        });

        dispatch({ type: "SET_EMBEDDINGS", embeddings: embeddingMap });
        dispatch({ type: "SET_EMBEDDING_PROGRESS", isEmbedding: false, progress: 100 });
      } catch (error) {
        console.error("Error computing embeddings:", error);
        dispatch({ type: "SET_EMBEDDING_PROGRESS", isEmbedding: false });
      } finally {
        processingRef.current = false;
      }
    };

    processTexts();
  }, [state.texts, embed]);

  // Project texts based on current mode (UMAP or semantic axes)
  useEffect(() => {
    const textsWithEmbeddings = state.texts.filter((t) => t.embedding !== null);
    const textsNeedingProjection = textsWithEmbeddings.filter((t) => t.x === null);

    // Only proceed if we have texts needing projection
    if (textsNeedingProjection.length === 0 || state.isEmbedding) {
      return;
    }

    const projectTexts = async () => {
      dispatch({ type: "SET_REDUCING", isReducing: true });

      try {
        if (state.projectionMode === "umap") {
          // UMAP mode
          if (textsWithEmbeddings.length >= 2) {
            const projections = await reduceToThreeDimensions(
              textsWithEmbeddings.map((t) => ({
                id: t.id,
                embedding: t.embedding!,
              }))
            );

            const projectionMap = new Map<string, { x: number; y: number; z: number }>();
            projections.forEach((p) => {
              projectionMap.set(p.id, { x: p.x, y: p.y, z: p.z });
            });

            dispatch({ type: "SET_PROJECTIONS", projections: projectionMap });
          }
        } else {
          // Semantic axes mode
          const { x: xAxisId, y: yAxisId, z: zAxisId } = state.activeAxes;
          const xAxis = state.semanticAxes.find((a) => a.id === xAxisId)?.axisVector ?? null;
          const yAxis = state.semanticAxes.find((a) => a.id === yAxisId)?.axisVector ?? null;
          const zAxis = state.semanticAxes.find((a) => a.id === zAxisId)?.axisVector ?? null;

          // Only project if at least one axis is defined
          if (xAxis || yAxis || zAxis) {
            const projectionMap = projectToSemanticAxes(
              textsWithEmbeddings.map((t) => ({ id: t.id, embedding: t.embedding! })),
              xAxis,
              yAxis,
              zAxis
            );

            dispatch({ type: "SET_PROJECTIONS", projections: projectionMap });
          }
        }
      } catch (error) {
        console.error("Error projecting texts:", error);
      } finally {
        dispatch({ type: "SET_REDUCING", isReducing: false });
      }
    };

    projectTexts();
  }, [
    state.texts,
    state.projectionMode,
    state.activeAxes,
    state.semanticAxes,
    state.isEmbedding,
  ]);

  // Compute axis embeddings when axes are added or modified
  useEffect(() => {
    const axesNeedingEmbeddings = state.semanticAxes.filter((a) => a.axisVector === null);

    if (axesNeedingEmbeddings.length === 0 || axisProcessingRef.current || !isReady) {
      return;
    }

    const computeAxes = async () => {
      axisProcessingRef.current = true;
      dispatch({ type: "SET_COMPUTING_AXES", isComputing: true });

      try {
        for (const axis of axesNeedingEmbeddings) {
          // Embed positive and negative words
          const positiveEmbeddings = await embed(axis.positiveWords);
          const negativeEmbeddings = await embed(axis.negativeWords);

          // Compute axis vector
          const { positiveCentroid, negativeCentroid, axisVector } = computeAxisVector(
            positiveEmbeddings,
            negativeEmbeddings
          );

          dispatch({
            type: "SET_AXIS_EMBEDDINGS",
            axisId: axis.id,
            positive: positiveCentroid,
            negative: negativeCentroid,
            axis: axisVector,
          });
        }
      } catch (error) {
        console.error("Error computing axis embeddings:", error);
      } finally {
        axisProcessingRef.current = false;
        dispatch({ type: "SET_COMPUTING_AXES", isComputing: false });
      }
    };

    computeAxes();
  }, [state.semanticAxes, embed, isReady]);

  // Process vocabulary embeddings
  useEffect(() => {
    const vocabWithoutEmbeddings = state.vocabulary.filter((v) => v.embedding === null);

    if (vocabWithoutEmbeddings.length === 0 || vocabProcessingRef.current || !isReady) {
      return;
    }

    const processVocab = async () => {
      vocabProcessingRef.current = true;

      try {
        // Process in batches of 50
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < vocabWithoutEmbeddings.length; i += batchSize) {
          batches.push(vocabWithoutEmbeddings.slice(i, i + batchSize));
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          const embeddings = await embed(batch.map((v) => v.text));

          const embeddingMap = new Map<string, number[]>();
          batch.forEach((v, j) => {
            embeddingMap.set(v.id, embeddings[j]);
          });

          dispatch({ type: "SET_VOCABULARY_EMBEDDINGS", embeddings: embeddingMap });
          dispatch({
            type: "SET_LOADING_VOCABULARY",
            isLoading: true,
            progress: Math.round(((i + 1) / batches.length) * 100),
          });
        }

        dispatch({ type: "SET_LOADING_VOCABULARY", isLoading: false, progress: 100 });
      } catch (error) {
        console.error("Error embedding vocabulary:", error);
        dispatch({ type: "SET_LOADING_VOCABULARY", isLoading: false });
      } finally {
        vocabProcessingRef.current = false;
      }
    };

    processVocab();
  }, [state.vocabulary, embed, isReady]);

  // Project vocabulary when embeddings are ready and axes are set
  useEffect(() => {
    const vocabWithEmbeddings = state.vocabulary.filter((v) => v.embedding !== null);
    const vocabNeedingProjection = vocabWithEmbeddings.filter((v) => v.x === null);

    if (
      vocabNeedingProjection.length === 0 ||
      state.isLoadingVocabulary ||
      state.projectionMode !== "semantic-axes"
    ) {
      return;
    }

    const { x: xAxisId, y: yAxisId, z: zAxisId } = state.activeAxes;
    const xAxis = state.semanticAxes.find((a) => a.id === xAxisId)?.axisVector ?? null;
    const yAxis = state.semanticAxes.find((a) => a.id === yAxisId)?.axisVector ?? null;
    const zAxis = state.semanticAxes.find((a) => a.id === zAxisId)?.axisVector ?? null;

    if (!xAxis && !yAxis && !zAxis) {
      return;
    }

    const projectionMap = projectToSemanticAxes(
      vocabWithEmbeddings.map((v) => ({ id: v.id, embedding: v.embedding! })),
      xAxis,
      yAxis,
      zAxis
    );

    dispatch({ type: "SET_VOCABULARY_PROJECTIONS", projections: projectionMap });
  }, [
    state.vocabulary,
    state.projectionMode,
    state.activeAxes,
    state.semanticAxes,
    state.isLoadingVocabulary,
  ]);

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

  // === New handlers for semantic axes ===
  const handleSetProjectionMode = useCallback((mode: ProjectionMode) => {
    dispatch({ type: "SET_PROJECTION_MODE", mode });
  }, []);

  const handleAddAxis = useCallback(
    (name: string, positiveWords: string[], negativeWords: string[]) => {
      dispatch({ type: "ADD_SEMANTIC_AXIS", axis: { name, positiveWords, negativeWords } });
    },
    []
  );

  const handleRemoveAxis = useCallback((id: string) => {
    dispatch({ type: "REMOVE_SEMANTIC_AXIS", id });
  }, []);

  const handleSetActiveAxes = useCallback(
    (assignment: { x?: string | null; y?: string | null; z?: string | null }) => {
      dispatch({ type: "SET_ACTIVE_AXES", assignment });
    },
    []
  );

  // === Vocabulary handlers ===
  const handleLoadVocabulary = useCallback(async () => {
    const { loadCommonWords } = await import("./utils/vocabulary");
    const words = loadCommonWords();
    dispatch({ type: "LOAD_VOCABULARY", words });
  }, []);

  const handleClearVocabulary = useCallback(() => {
    dispatch({ type: "CLEAR_VOCABULARY" });
  }, []);

  // === Vector arithmetic handlers ===
  const handleComputeArithmetic = useCallback(
    async (a: string, b: string, c: string) => {
      dispatch({ type: "SET_COMPUTING_ARITHMETIC", isComputing: true });
      dispatch({
        type: "SET_VECTOR_ARITHMETIC",
        arithmetic: { operandA: a, operandB: b, operandC: c },
      });

      try {
        // Embed all three operands
        const embeddings = await embed([a, b, c]);
        const [embA, embB, embC] = embeddings;

        // Compute A - B + C
        const result = computeVectorArithmetic(embA, embB, embC);

        // Find nearest neighbors from texts and vocabulary
        const allCandidates = [
          ...state.texts
            .filter((t) => t.embedding !== null)
            .map((t) => ({ text: t.text, embedding: t.embedding! })),
          ...state.vocabulary
            .filter((v) => v.embedding !== null)
            .map((v) => ({ text: v.text, embedding: v.embedding! })),
        ];

        const neighbors = findNearestNeighbors(result, allCandidates, 10);

        // Project result if in semantic axes mode
        let projection: { x: number; y: number; z: number } | null = null;
        if (state.projectionMode === "semantic-axes") {
          const { x: xAxisId, y: yAxisId, z: zAxisId } = state.activeAxes;
          const xAxis = state.semanticAxes.find((ax) => ax.id === xAxisId)?.axisVector ?? null;
          const yAxis = state.semanticAxes.find((ax) => ax.id === yAxisId)?.axisVector ?? null;
          const zAxis = state.semanticAxes.find((ax) => ax.id === zAxisId)?.axisVector ?? null;

          if (xAxis || yAxis || zAxis) {
            // Get normalization from existing texts
            const textsWithEmbeddings = state.texts.filter((t) => t.embedding !== null);
            const normParams = computeNormalizationParams(
              textsWithEmbeddings.map((t) => ({ embedding: t.embedding! })),
              xAxis,
              yAxis,
              zAxis
            );
            projection = projectSingleToSemanticAxes(result, xAxis, yAxis, zAxis, normParams);
          }
        }

        dispatch({
          type: "SET_ARITHMETIC_RESULT",
          result,
          projection,
          neighbors,
        });
      } catch (error) {
        console.error("Error computing arithmetic:", error);
      } finally {
        dispatch({ type: "SET_COMPUTING_ARITHMETIC", isComputing: false });
      }
    },
    [embed, state.texts, state.vocabulary, state.projectionMode, state.activeAxes, state.semanticAxes]
  );

  const handleClearArithmetic = useCallback(() => {
    dispatch({ type: "CLEAR_VECTOR_ARITHMETIC" });
  }, []);

  const selectedItem = state.selectedPointId
    ? state.texts.find((t) => t.id === state.selectedPointId) ?? null
    : null;

  const isProcessing =
    state.isEmbedding ||
    state.isReducing ||
    state.isComputingAxes ||
    state.isComputingArithmetic ||
    isModelLoading;

  // Check if semantic axes mode is ready (at least one axis computed and assigned)
  const hasComputedAxes = state.semanticAxes.some((a) => a.axisVector !== null);
  const hasAssignedAxes =
    state.activeAxes.x !== null || state.activeAxes.y !== null || state.activeAxes.z !== null;
  const semanticAxesReady = hasComputedAxes && hasAssignedAxes;

  // Get axis labels for visualization
  const axisLabels = {
    x: state.semanticAxes.find((a) => a.id === state.activeAxes.x)?.name ?? null,
    y: state.semanticAxes.find((a) => a.id === state.activeAxes.y)?.name ?? null,
    z: state.semanticAxes.find((a) => a.id === state.activeAxes.z)?.name ?? null,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-4">Embedding Explorer</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-3xl">
        Explore the semantic structure of neural network embeddings. Define semantic axes like
        &quot;gender&quot; or &quot;sentiment&quot;, project texts onto interpretable dimensions, and discover
        hidden relationships through vector arithmetic. All computation runs in your browser.
      </p>

      {/* Main content grid - 3 columns on large screens */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left sidebar - Semantic Axes & Projection */}
        <div className="lg:col-span-1 space-y-4">
          {/* Loading progress */}
          <LoadingProgress
            isModelLoading={isModelLoading}
            modelProgress={modelProgress}
            modelError={modelError}
            isEmbedding={state.isEmbedding}
            embeddingProgress={state.embeddingProgress}
            isReducing={state.isReducing}
          />

          {/* Projection Mode Toggle */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <ProjectionModeToggle
              mode={state.projectionMode}
              onSetMode={handleSetProjectionMode}
              semanticAxesReady={semanticAxesReady}
              disabled={isProcessing}
            />
          </div>

          {/* Semantic Axes Editor */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <SemanticAxisEditor
              axes={state.semanticAxes}
              onAddAxis={handleAddAxis}
              onRemoveAxis={handleRemoveAxis}
              isComputing={state.isComputingAxes}
              disabled={isProcessing}
            />
          </div>

          {/* Axis Selector */}
          {state.semanticAxes.length > 0 && state.projectionMode === "semantic-axes" && (
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <AxisSelector
                axes={state.semanticAxes}
                activeAxes={state.activeAxes}
                onSetActiveAxes={handleSetActiveAxes}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Vocabulary Panel */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <VocabularyPanel
              vocabularyLoaded={state.vocabularyLoaded}
              vocabularyCount={state.vocabulary.length}
              isLoading={state.isLoadingVocabulary}
              progress={state.vocabularyProgress}
              onLoadVocabulary={handleLoadVocabulary}
              onClearVocabulary={handleClearVocabulary}
              disabled={isProcessing || state.projectionMode !== "semantic-axes" || !semanticAxesReady}
            />
          </div>

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
              {state.texts.filter((t) => t.x !== null).length} projected
            </div>
          </div>
        </div>

        {/* Center - Visualization */}
        <div className="lg:col-span-2 space-y-4">
          {/* 3D Visualization */}
          <Visualization3D
            items={state.texts}
            vocabulary={state.vocabulary}
            selectedPointId={state.selectedPointId}
            hoveredPointId={state.hoveredPointId}
            searchResults={state.searchResults}
            axisLabels={axisLabels}
            projectionMode={state.projectionMode}
            arithmeticResult={state.vectorArithmetic?.resultProjection ?? null}
            onSelectPoint={handleSelectPoint}
            onHoverPoint={handleHoverPoint}
          />

          {/* Point details */}
          {selectedItem && (
            <PointDetails
              item={selectedItem}
              onClose={() => handleSelectPoint(null)}
              onDelete={handleDeleteText}
            />
          )}
        </div>

        {/* Right sidebar - Arithmetic & Search */}
        <div className="lg:col-span-1 space-y-4">
          {/* Vector Arithmetic */}
          <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <VectorArithmeticPanel
              arithmetic={state.vectorArithmetic}
              isComputing={state.isComputingArithmetic}
              onCompute={handleComputeArithmetic}
              onClear={handleClearArithmetic}
              disabled={isProcessing}
            />
          </div>

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
        </div>
      </div>

      {/* About section */}
      <div className="mt-12 text-sm text-neutral-500 max-w-3xl">
        <h3 className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          How it works
        </h3>
        <p className="mb-2">
          <strong>Semantic Axes:</strong> Define interpretable dimensions by specifying
          contrasting word pairs (e.g., &quot;woman&quot; vs &quot;man&quot; for gender). The axis is computed
          as the direction between the average embeddings of each group.
        </p>
        <p className="mb-2">
          <strong>Vector Arithmetic:</strong> Explore semantic relationships with operations like
          &quot;king - man + woman = ?&quot; (spoiler: queen). This works because concepts are encoded
          as linear directions in embedding space.
        </p>
        <p className="mb-2">
          <strong>Projection Modes:</strong> Semantic mode projects onto your defined axes for
          interpretable dimensions. UMAP mode uses automatic dimensionality reduction to reveal
          natural clusters.
        </p>
        <p>
          <strong>All Local:</strong> The all-MiniLM-L6-v2 model runs entirely in your browser
          via Transformers.js. No data is sent to any server.
        </p>
      </div>
    </div>
  );
}
