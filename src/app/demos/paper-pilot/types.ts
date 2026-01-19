// Content sources
export type ContentSource = "crossref" | "unpaywall" | "semanticscholar" | "arxiv" | "pdf-upload";

export interface ContentSourceInfo {
  source: ContentSource;
  hasFullText: boolean;
  pdfUrl?: string;
  license?: string;
}

// Paper metadata - enhanced with full text support
export interface PaperMetadata {
  // Identifiers
  doi: string | null;
  arxivId: string | null;
  semanticScholarId: string | null;

  // Basic metadata
  title: string;
  authors: string[];
  abstract: string | null;
  journal: string | null;
  publishedDate: string | null;
  url: string;
  subjects: string[];

  // Full text content
  fullText: string | null;
  fullTextSource: ContentSource | null;

  // Source information
  sources: ContentSourceInfo[];

  // Content stats
  wordCount: number;
  hasFullText: boolean;

  // PDF extraction info
  totalPages: number | null;
  pagesExtracted: number | null;
}

// Summary types
export type SummaryType = "tldr" | "technical" | "eli5" | "keyFindings";

export interface Summary {
  type: SummaryType;
  content: string;
  generatedAt: Date;
}

// Q&A
export interface QAExchange {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

// Generation progress
export interface GenerationProgress {
  status: "idle" | "loading-model" | "generating" | "complete" | "error";
  currentTask?: string;
  error?: string;
}

// Fetch progress with detailed status
export interface FetchProgress {
  status: "idle" | "fetching" | "complete" | "error";
  currentStep?: string;
  stepsCompleted: string[];
  error?: string;
}

// State
export interface PaperPilotState {
  paper: PaperMetadata | null;
  summaries: Summary[];
  qaHistory: QAExchange[];
  generationProgress: GenerationProgress;
  fetchProgress: FetchProgress;
}

// Actions
export type PaperPilotAction =
  | { type: "SET_PAPER"; paper: PaperMetadata }
  | { type: "CLEAR_PAPER" }
  | { type: "ADD_SUMMARY"; summary: Summary }
  | { type: "CLEAR_SUMMARIES" }
  | { type: "ADD_QA"; qa: QAExchange }
  | { type: "CLEAR_QA" }
  | { type: "SET_GENERATION_PROGRESS"; progress: Partial<GenerationProgress> }
  | { type: "SET_FETCH_PROGRESS"; progress: Partial<FetchProgress> }
  | { type: "RESET" };

// Initial state
export const initialState: PaperPilotState = {
  paper: null,
  summaries: [],
  qaHistory: [],
  generationProgress: {
    status: "idle",
  },
  fetchProgress: {
    status: "idle",
    stepsCompleted: [],
  },
};

// Helper to generate unique IDs (uses crypto.randomUUID when available for better uniqueness)
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback with better entropy than before
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

// Summary type labels
export const SUMMARY_LABELS: Record<SummaryType, { label: string; description: string }> = {
  tldr: {
    label: "TL;DR",
    description: "A quick 2-3 sentence summary",
  },
  technical: {
    label: "Technical Summary",
    description: "Detailed technical overview with methodology",
  },
  eli5: {
    label: "ELI5",
    description: "Explain like I'm 5 - simple terms",
  },
  keyFindings: {
    label: "Key Findings",
    description: "Main results and conclusions",
  },
};
