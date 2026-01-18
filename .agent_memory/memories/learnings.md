# Learnings & Gotchas

## SSE Streaming Requires Line Buffering — 2026-01-18

**Problem**: Server-Sent Events (SSE) data can be split across multiple chunks. Naive parsing truncates responses.

**Bad approach**:
```typescript
// Doesn't handle incomplete lines
const data = decoder.decode(value);
for (const line of data.split("\n")) {
  // May miss data split across chunks
}
```

**Solution** (in `useAPILLM.ts`):
```typescript
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split("\n");
  buffer = parts.pop() || "";  // Keep incomplete line in buffer

  for (const line of parts) {
    if (line.startsWith("data: ")) {
      // Process complete line
    }
  }
}
```

## Model Fallback on Rate Limits — 2026-01-18

**Problem**: Free tier models on OpenRouter hit rate limits (429) or payment required (402) errors.

**Solution**: Automatic fallback chain in `functions/api/llm.ts`:
```typescript
for (const model of models) {
  const response = await fetch(...);
  if (response.ok) return { response, model };
  if (response.status === 402 || response.status === 429 || response.status >= 500) {
    continue;  // Try next model
  }
  return { response, model };  // Other errors, return as-is
}
```

Users see seamless operation; the proxy silently falls back to available models.

## DeepSeek R1 Reasoning Tokens Truncate Output — 2026-01-18

**Problem**: DeepSeek R1 uses "reasoning tokens" for chain-of-thought. When streaming, this can cause output to appear truncated or incomplete because the model spends tokens on internal reasoning.

**Solution**: Prioritize non-reasoning models (Gemini, Llama, Gemma) for summarization tasks. DeepSeek R1 is later in the fallback chain.

---

## [HISTORICAL] Qwen3 Think Tags — 2025-01-11

> **Context**: This applied to WebLLM browser inference, which was removed in January 2026.

Qwen3 models emit `<think>...</think>` tags for chain-of-thought. Cloud models via OpenRouter may still exhibit this behavior, but it's less of an issue with larger models.

## [HISTORICAL] WebLLM Context Limit — 2026-01-15

> **Context**: This led to the decision to migrate to API-based inference.

WebLLM Qwen3 models were hard-limited to 4096 context tokens. This proved too restrictive for Paper Pilot (academic papers). The migration to OpenRouter resolved this with models supporting 131K-1M context.

## Semantic Scholar CORS Requires Proxy — 2025-01-11

**Problem**: Semantic Scholar API doesn't allow browser CORS requests.

**Error**: `Access to fetch has been blocked by CORS policy`

**Solution**: Route through Cloudflare Pages Function proxy:
```typescript
const ssUrl = `https://api.semanticscholar.org/graph/v1/paper/...`;
const response = await fetch(`/api/proxy?url=${encodeURIComponent(ssUrl)}`);
```

## arXiv XML Parsing Requires Namespace-Aware Methods — 2025-01-11

**Problem**: arXiv API returns Atom XML. Standard `querySelector` doesn't find elements.

**Bad approach**:
```typescript
doc.querySelector("entry"); // Returns null
```

**Solution**: Use namespace-aware methods:
```typescript
const ATOM_NS = "http://www.w3.org/2005/Atom";
const entries = doc.getElementsByTagNameNS(ATOM_NS, "entry");
```

## PDF.js Memory Leaks Without Cleanup — 2025-01-11

**Problem**: PDF documents weren't being destroyed after text extraction, causing memory leaks.

**Solution**: Always call `pdf.destroy()` in finally block:
```typescript
let pdf = null;
try {
  pdf = await pdfjsLib.getDocument({ url }).promise;
  // ... extract text
} finally {
  if (pdf) {
    try {
      await pdf.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }
}
```

## WebLLM Model Hot-Swap Race Condition — 2025-01-11

**Problem**: Rapid model switching could cause race conditions where two models load simultaneously.

**Solution**: Use loading lock with promise ref:
```typescript
const loadingPromiseRef = useRef<Promise<void> | null>(null);

const loadModel = useCallback(async (modelId: string) => {
  // Wait for any in-progress loading
  if (loadingPromiseRef.current) {
    await loadingPromiseRef.current;
  }

  const loadPromise = (async () => {
    // ... loading logic
  })();

  loadingPromiseRef.current = loadPromise;
  await loadPromise;
  loadingPromiseRef.current = null;
}, []);
```

## State Updates After Unmount Warning — 2025-01-11

**Problem**: WebLLM loading is async. If component unmounts during load, React warns about state updates.

**Solution**: Track mounted state with ref:
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => { isMountedRef.current = false; };
}, []);

// In async functions:
if (isMountedRef.current) {
  setIsReady(true);
}
```

## WASM Dynamic Import for SSR Compatibility — 2025-01-11

**Problem**: WASM modules fail during Next.js SSR because `WebAssembly` isn't available server-side.

**Solution**: Dynamic import with blob URL pattern:
```typescript
// Don't import at top level
const wasmModule = await import(/* webpackIgnore: true */ blobUrl);
```

The `webpackIgnore: true` comment prevents Next.js from trying to bundle the dynamic import.

## PDF.js Worker Must Match Library Version — 2025-01-11

**Problem**: PDF.js worker version mismatch causes cryptic errors.

**Solution**: Use version from the imported library:
```typescript
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

Note: jsDelivr has `.mjs` extension, cdnjs uses `.js`. Use the correct CDN endpoint.

## CrossRef Abstracts Have JATS Tags — 2025-01-11

**Problem**: CrossRef abstracts contain JATS XML tags like `<jats:p>`, `<jats:italic>`.

**Solution**: Strip all JATS and HTML tags:
```typescript
function cleanAbstract(abstract: string | undefined): string | null {
  if (!abstract) return null;
  return abstract
    .replace(/<\/?jats:[^>]+>/g, "")  // JATS tags
    .replace(/<[^>]+>/g, "")           // Other HTML
    .replace(/&lt;/g, "<")             // Entities
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim() || null;
}
```

## Data Forge JSON Response Format — 2025-01-11

**Problem**: LLM sometimes wraps JSON in markdown code blocks or adds explanatory text.

**Solution**: Use WebLLM's structured output with JSON schema:
```typescript
const response = await engine.chat.completions.create({
  messages: [...],
  response_format: { type: "json_object", schema: jsonSchema },
});
```

This forces the model to output valid JSON matching the schema.
