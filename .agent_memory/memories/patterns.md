# Code Patterns

## WebLLM Hook Pattern — 2025-01-11

The project uses a custom `useWebLLM` hook for browser-based LLM inference. Two variants exist:

### Paper Pilot variant (streaming support)
Location: `src/app/demos/paper-pilot/hooks/useWebLLM.ts`

```typescript
interface UseWebLLMReturn {
  isLoading: boolean;
  loadProgress: number;
  error: string | null;
  isReady: boolean;
  isSupported: boolean | null;
  loadedModelId: string | null;
  loadModel: (modelId: string) => Promise<void>;
  generate: (systemPrompt: string, userPrompt: string, onStream?: (text: string) => void) => Promise<string>;
  unload: () => Promise<void>;
}
```

Key features:
- WebGPU support check with fallback messaging
- Model hot-swapping (unload old model before loading new)
- Loading progress callback
- Streaming support via `onStream` callback
- Qwen3 think-tag stripping (`/no_think` suffix + regex cleanup)
- Mounted ref to prevent state updates after unmount
- Loading lock to prevent race conditions

### Data Forge variant (JSON schema support)
Location: `src/app/demos/data-forge/hooks/useWebLLM.ts`

Same interface but `generate` uses:
- `response_format: { type: "json_object", schema }` for structured output
- Lower temperature (0.3 vs 0.5) for deterministic JSON
- System prompt optimized for JSON-only output

## Reducer Pattern for Demo State — 2025-01-11

Complex demos use `useReducer` with typed actions:

```typescript
// Types pattern
type DemoAction =
  | { type: "SET_PAPER"; paper: PaperMetadata }
  | { type: "CLEAR_PAPER" }
  | { type: "ADD_SUMMARY"; summary: Summary }
  | { type: "SET_GENERATION_PROGRESS"; progress: Partial<GenerationProgress> };

// Reducer pattern
function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "SET_PAPER":
      return { ...state, paper: action.paper, summaries: [] };
    // ...
  }
}

// Usage
const [state, dispatch] = useReducer(demoReducer, initialState);
```

Benefits:
- Type-safe action dispatch
- Predictable state transitions
- Easy to add new actions
- Centralized state logic

## Progress Tracking Pattern — 2025-01-11

Multi-step operations use a progress interface:

```typescript
interface GenerationProgress {
  status: "idle" | "loading-model" | "generating" | "complete" | "error";
  currentTask?: string;
  error?: string;
}
```

Update pattern:
```typescript
dispatch({
  type: "SET_GENERATION_PROGRESS",
  progress: { status: "generating", currentTask: "Generating summary" }
});
```

## Component Panel Pattern — 2025-01-11

Demos are organized into panels with consistent structure:

```
src/app/demos/{demo-name}/
├── page.tsx              # Main page with reducer logic
├── types.ts              # All types, constants, initial state
├── components/
│   ├── InputPanel.tsx    # User input handling
│   ├── ModelPanel.tsx    # Model selection/loading
│   ├── OutputPanel.tsx   # Results display
│   └── ExportPanel.tsx   # Data export functionality
├── hooks/
│   └── useWebLLM.ts      # LLM integration hook
└── utils/
    ├── prompts.ts        # System/user prompt builders
    └── helpers.ts        # Domain-specific utilities
```

## API Fetching Pattern — 2025-01-11

Multi-source data fetching with fallbacks (see Paper Pilot):

```typescript
async function fetchPaper(input: string, onProgress?: (step: string) => void): Promise<PaperMetadata> {
  onProgress?.("Fetching from CrossRef...");
  const crossRefData = await fetchFromCrossRef(doi);

  // Parallel fetching for additional sources
  const [ssResult, unpaywallInfo] = await Promise.all([
    fetchFromSemanticScholar(identifier, idType),
    fetchFromUnpaywall(doi),
  ]);

  // Merge with fallback logic
  if (!metadata.abstract && ssResult?.metadata.abstract) {
    metadata.abstract = ssResult.metadata.abstract;
  }
}
```

## CORS Proxy Pattern — 2025-01-11

For APIs that don't support CORS (Semantic Scholar, arXiv), route through Cloudflare Pages Function:

```typescript
// Client-side
function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

// Cloudflare Function: functions/api/proxy.ts
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url).searchParams.get("url");
  const response = await fetch(url, { headers: { "User-Agent": "..." } });
  return new Response(response.body, {
    headers: { "Access-Control-Allow-Origin": "*" }
  });
};
```

## WASM Loading Pattern — 2025-01-11

For browser WASM modules (Rusenizer tokenizer):

```typescript
// 1. Fetch WASM binary
const wasmBytes = await (await fetch("/wasm/module.wasm")).arrayBuffer();

// 2. Load JS glue code dynamically (avoid SSR issues)
const jsCode = await (await fetch("/wasm/module.js")).text();
const blob = new Blob([jsCode], { type: "application/javascript" });
const blobUrl = URL.createObjectURL(blob);
const wasmModule = await import(/* webpackIgnore: true */ blobUrl);
URL.revokeObjectURL(blobUrl);

// 3. Initialize WASM
await wasmModule.default(wasmBytes);
```
