# Conventions

## File & Directory Structure — 2025-01-11

```
src/app/
├── page.tsx                    # Homepage
├── layout.tsx                  # Root layout with Header
├── globals.css                 # Tailwind imports, CSS variables
├── components/                 # Shared components
│   ├── Header.tsx
│   ├── DemoCard.tsx
│   └── DataBackground.tsx
├── demos/                      # Interactive demo pages
│   ├── page.tsx                # Demos index
│   └── {demo-name}/
│       ├── page.tsx            # Main demo component
│       ├── types.ts            # Types, constants, initial state
│       ├── components/         # Demo-specific components
│       ├── hooks/              # Demo-specific hooks
│       └── utils/              # Helpers, prompts, exporters
├── nerdy-stuff/                # Technical exploration pages
│   ├── page.tsx                # Nerdy stuff index
│   └── {tool-name}/
│       └── page.tsx
└── about/
    └── page.tsx

functions/                      # Cloudflare Pages Functions
└── api/
    └── proxy.ts                # CORS proxy

public/
├── wasm/                       # WASM modules
└── models/                     # Model data files
```

## Naming Conventions — 2025-01-11

**Files**:
- Components: `PascalCase.tsx` (e.g., `ModelPanel.tsx`)
- Utilities: `camelCase.ts` (e.g., `paperFetcher.ts`)
- Types: `types.ts` (single file per demo)
- Hooks: `use{Name}.ts` (e.g., `useWebLLM.ts`)

**Components**:
- PascalCase for component names
- Suffix with purpose: `*Panel`, `*Card`, `*Input`, `*Display`

**Types**:
- Interfaces for objects: `PaperMetadata`, `GenerationProgress`
- Type aliases for unions: `SummaryType = "tldr" | "technical" | ...`
- Constants with types: `const MODEL_OPTIONS: ModelOption[]`

**Functions**:
- Async fetchers: `fetchFrom{Source}` (e.g., `fetchFromCrossRef`)
- Builders: `build{Thing}` (e.g., `buildSummaryPrompt`)
- Parsers: `parse{Input}` (e.g., `parseDOI`)
- Handlers: `handle{Action}` (e.g., `handleGenerateSummary`)

## TypeScript Conventions — 2025-01-11

**Prefer interfaces for object shapes**:
```typescript
interface PaperMetadata {
  doi: string | null;
  title: string;
  // ...
}
```

**Use type for unions and mapped types**:
```typescript
type SummaryType = "tldr" | "technical" | "eli5" | "keyFindings";
type ExportFormat = "sql" | "json" | "csv";
```

**Export types from `types.ts`**:
```typescript
// types.ts
export interface Summary { ... }
export type SummaryType = ...;
export const MODEL_OPTIONS: ModelOption[] = [...];
export const initialState: DemoState = { ... };
```

**Action types pattern**:
```typescript
export type DemoAction =
  | { type: "SET_PAPER"; paper: PaperMetadata }
  | { type: "CLEAR_PAPER" }
  | { type: "SET_GENERATION_PROGRESS"; progress: Partial<GenerationProgress> };
```

## Styling Conventions — 2025-01-11

**Tailwind classes**:
- Use Tailwind utility classes directly in JSX
- Dark mode: `dark:` prefix (e.g., `text-neutral-600 dark:text-neutral-400`)
- Spacing: Consistent scale (4, 6, 8, 12, 16)
- Max widths: `max-w-6xl` for main content, `max-w-4xl` for focused content

**Common patterns**:
```tsx
// Page container
<div className="max-w-6xl mx-auto px-4 py-16">

// Section heading
<h2 className="text-2xl font-bold mb-2">Title</h2>
<p className="text-neutral-500 dark:text-neutral-500 mb-8">Subtitle</p>

// Card/Panel
<div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">

// Button primary
<button className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition">

// Button secondary
<button className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg font-medium hover:border-neutral-500 transition">

// Error state
<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
```

**Colors**:
- Primary text: `neutral-900` / `dark:neutral-100`
- Secondary text: `neutral-600` / `dark:neutral-400`
- Muted text: `neutral-500`
- Borders: `neutral-200` / `dark:neutral-800`
- Success: `green-600` / `dark:green-400`
- Error: `red-600` / `dark:red-400`

## Component Structure — 2025-01-11

**Props interface at top**:
```tsx
interface ModelPanelProps {
  selectedModelId: string;
  loadedModelId: string | null;
  isModelLoading: boolean;
  onModelSelect: (modelId: string) => void;
  onLoadModel: () => void;
}

export default function ModelPanel({
  selectedModelId,
  loadedModelId,
  // ...
}: ModelPanelProps) {
  return (/* ... */);
}
```

**"use client" directive**: Add to any component using hooks, browser APIs, or event handlers.

## Import Order — 2025-01-11

```typescript
// 1. React/Next.js
import { useState, useCallback } from "react";
import Link from "next/link";

// 2. External libraries
import type { Tiktoken } from "tiktoken";

// 3. Internal components
import ModelPanel from "./components/ModelPanel";

// 4. Internal utilities/hooks
import { useWebLLM } from "./hooks/useWebLLM";
import { buildSummaryPrompt } from "./utils/prompts";

// 5. Types (last, with 'type' keyword)
import type { PaperMetadata, SummaryType } from "./types";
```
