# Code Patterns

## API LLM Hook Pattern — 2026-01-18

The project uses a custom `useAPILLM` hook for cloud-based LLM inference via OpenRouter.

### Interface
Location: `src/app/demos/paper-pilot/hooks/useAPILLM.ts`

```typescript
interface UseAPILLMReturn {
  isGenerating: boolean;
  error: string | null;
  rateLimitRemaining: number | null;
  generate: (
    systemPrompt: string,
    userPrompt: string,
    onStream?: (text: string) => void
  ) => Promise<string>;
}

export function useAPILLM(selectedModel: string = "auto"): UseAPILLMReturn;
```

Key features:
- SSE streaming with proper line buffering
- Rate limit tracking via `X-RateLimit-Remaining` header
- Model selection (pass "auto" or specific model ID)
- Error handling with user-friendly messages

### Usage
```typescript
const { isGenerating, error, rateLimitRemaining, generate } = useAPILLM(selectedModel);

const result = await generate(
  systemPrompt,
  userPrompt,
  (text) => setStreamedOutput(text)  // Optional streaming callback
);
```

### Data Forge variant
Location: `src/app/demos/data-forge/hooks/useAPILLM.ts`

Same interface but configured with:
- `use_case: "data-forge"` for appropriate model fallback order
- `response_format: { type: "json_object" }` for structured output

---

## [SUPERSEDED] WebLLM Hook Pattern — 2025-01-11

> **Note**: WebLLM was removed in January 2026. The `useWebLLM.ts` hooks no longer exist.

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

## LLM Proxy Pattern — 2026-01-18

OpenRouter API calls are proxied through a Cloudflare Pages Function for security and reliability.

Location: `functions/api/llm.ts`

```typescript
// Request body
interface LLMRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;       // Optional: specific model ID
  max_tokens?: number;  // Default: 16384
  temperature?: number; // Default: 0.5
  stream?: boolean;     // Default: false
  use_case?: string;    // "paper-pilot" | "data-forge" (for fallback order)
  response_format?: { type: "json_object" };  // For structured output
}
```

Key features:
- **API key rotation**: Up to 10 keys, round-robin selection
- **Rate limiting**: 30 req/min per IP (in-memory, resets on cold start)
- **Model fallback**: If model fails (402/429/5xx), automatically tries next in chain
- **Use-case routing**: Different model priority for paper-pilot vs data-forge
- **Response headers**: `X-RateLimit-Remaining`, `X-Model-Used`

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
