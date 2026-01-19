// Text item with embedding and 3D projection
export interface TextItem {
  id: string;
  text: string;
  category: string;
  embedding: number[] | null;
  x: number | null;
  y: number | null;
  z: number | null;
}

// Search result with similarity score
export interface SearchResult {
  item: TextItem;
  similarity: number;
}

// Model loading progress
export interface ModelProgress {
  status: "idle" | "loading" | "ready" | "error";
  progress: number; // 0-100
  message: string;
}

// --- Semantic Axes Types ---

// Projection mode: semantic axes (interpretable) or UMAP (auto-layout)
export type ProjectionMode = "semantic-axes" | "umap";

// A semantic axis defined by contrastive word groups
export interface SemanticAxis {
  id: string;
  name: string; // User-friendly name (e.g., "Gender")
  positiveWords: string[]; // e.g., ["woman", "girl", "mother"]
  negativeWords: string[]; // e.g., ["man", "boy", "father"]
  positiveEmbedding: number[] | null; // Centroid of positive group
  negativeEmbedding: number[] | null; // Centroid of negative group
  axisVector: number[] | null; // normalized(positive - negative)
}

// Active axes assignment for X/Y/Z visualization
export interface AxisAssignment {
  x: string | null; // axis ID for X dimension
  y: string | null; // axis ID for Y dimension
  z: string | null; // axis ID for Z dimension
}

// Vocabulary word (smaller visual points for exploration)
export interface VocabWord {
  id: string;
  text: string;
  embedding: number[] | null;
  x: number | null;
  y: number | null;
  z: number | null;
}

// Vector arithmetic operation and result
export interface VectorArithmetic {
  operandA: string; // text for A
  operandB: string; // text for B
  operandC: string; // text for C
  embeddingA: number[] | null;
  embeddingB: number[] | null;
  embeddingC: number[] | null;
  resultEmbedding: number[] | null; // A - B + C
  resultProjection: { x: number; y: number; z: number } | null;
  nearestNeighbors: { text: string; similarity: number }[];
}

// Neighbor result for arithmetic
export interface ArithmeticNeighbor {
  text: string;
  similarity: number;
}

// State
export interface EmbeddingExplorerState {
  // Existing fields
  texts: TextItem[];
  categories: string[];
  modelProgress: ModelProgress;
  isEmbedding: boolean;
  embeddingProgress: number; // 0-100
  isReducing: boolean;
  selectedPointId: string | null;
  hoveredPointId: string | null;
  searchQuery: string;
  searchResults: SearchResult[];

  // Projection mode (semantic-axes is default)
  projectionMode: ProjectionMode;

  // Semantic axes
  semanticAxes: SemanticAxis[];
  activeAxes: AxisAssignment;
  isComputingAxes: boolean;

  // Vocabulary (common words for exploration)
  vocabulary: VocabWord[];
  isLoadingVocabulary: boolean;
  vocabularyLoaded: boolean;
  vocabularyProgress: number; // 0-100

  // Vector arithmetic
  vectorArithmetic: VectorArithmetic | null;
  isComputingArithmetic: boolean;
}

// Actions
export type EmbeddingExplorerAction =
  // Existing actions
  | { type: "ADD_TEXT"; text: string; category: string }
  | { type: "ADD_TEXTS"; texts: { text: string; category: string }[] }
  | { type: "REMOVE_TEXT"; id: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_EMBEDDINGS"; embeddings: Map<string, number[]> }
  | { type: "SET_PROJECTIONS"; projections: Map<string, { x: number; y: number; z: number }> }
  | { type: "SET_MODEL_PROGRESS"; progress: Partial<ModelProgress> }
  | { type: "SET_EMBEDDING_PROGRESS"; isEmbedding: boolean; progress?: number }
  | { type: "SET_REDUCING"; isReducing: boolean }
  | { type: "SELECT_POINT"; id: string | null }
  | { type: "HOVER_POINT"; id: string | null }
  | { type: "SET_SEARCH_QUERY"; query: string }
  | { type: "SET_SEARCH_RESULTS"; results: SearchResult[] }
  | { type: "ADD_CATEGORY"; category: string }
  | { type: "LOAD_DATASET"; name: string }
  // Projection mode
  | { type: "SET_PROJECTION_MODE"; mode: ProjectionMode }
  // Semantic axes
  | {
      type: "ADD_SEMANTIC_AXIS";
      axis: { name: string; positiveWords: string[]; negativeWords: string[] };
    }
  | { type: "UPDATE_SEMANTIC_AXIS"; id: string; updates: Partial<SemanticAxis> }
  | { type: "REMOVE_SEMANTIC_AXIS"; id: string }
  | {
      type: "SET_AXIS_EMBEDDINGS";
      axisId: string;
      positive: number[];
      negative: number[];
      axis: number[];
    }
  | { type: "SET_ACTIVE_AXES"; assignment: Partial<AxisAssignment> }
  | { type: "SET_COMPUTING_AXES"; isComputing: boolean }
  // Vocabulary
  | { type: "LOAD_VOCABULARY"; words: string[] }
  | { type: "SET_VOCABULARY_EMBEDDINGS"; embeddings: Map<string, number[]> }
  | {
      type: "SET_VOCABULARY_PROJECTIONS";
      projections: Map<string, { x: number; y: number; z: number }>;
    }
  | { type: "CLEAR_VOCABULARY" }
  | { type: "SET_LOADING_VOCABULARY"; isLoading: boolean; progress?: number }
  // Vector arithmetic
  | { type: "SET_VECTOR_ARITHMETIC"; arithmetic: Partial<VectorArithmetic> }
  | {
      type: "SET_ARITHMETIC_RESULT";
      result: number[];
      projection: { x: number; y: number; z: number } | null;
      neighbors: ArithmeticNeighbor[];
    }
  | { type: "CLEAR_VECTOR_ARITHMETIC" }
  | { type: "SET_COMPUTING_ARITHMETIC"; isComputing: boolean };

// Initial state
export const initialState: EmbeddingExplorerState = {
  // Existing fields
  texts: [],
  categories: ["default"],
  modelProgress: {
    status: "idle",
    progress: 0,
    message: "Model not loaded",
  },
  isEmbedding: false,
  embeddingProgress: 0,
  isReducing: false,
  selectedPointId: null,
  hoveredPointId: null,
  searchQuery: "",
  searchResults: [],

  // New: Projection mode (semantic-axes is default)
  projectionMode: "semantic-axes",

  // New: Semantic axes (start empty, user adds or loads presets)
  semanticAxes: [],
  activeAxes: { x: null, y: null, z: null },
  isComputingAxes: false,

  // New: Vocabulary
  vocabulary: [],
  isLoadingVocabulary: false,
  vocabularyLoaded: false,
  vocabularyProgress: 0,

  // New: Vector arithmetic
  vectorArithmetic: null,
  isComputingArithmetic: false,
};

// Preset semantic axes for quick exploration
export type PresetAxis = {
  name: string;
  positiveWords: string[];
  negativeWords: string[];
};

export const PRESET_AXES: PresetAxis[] = [
  {
    name: "Gender",
    positiveWords: ["woman", "girl", "mother", "daughter", "sister", "she", "her", "female"],
    negativeWords: ["man", "boy", "father", "son", "brother", "he", "him", "male"],
  },
  {
    name: "Sentiment",
    positiveWords: ["good", "great", "excellent", "wonderful", "happy", "love", "amazing", "fantastic"],
    negativeWords: ["bad", "terrible", "awful", "horrible", "sad", "hate", "disgusting", "dreadful"],
  },
  {
    name: "Size",
    positiveWords: ["big", "large", "huge", "giant", "enormous", "massive", "vast", "immense"],
    negativeWords: ["small", "tiny", "little", "mini", "microscopic", "minuscule", "petite", "compact"],
  },
  {
    name: "Time",
    positiveWords: ["future", "tomorrow", "later", "upcoming", "next", "forward", "ahead", "soon"],
    negativeWords: ["past", "yesterday", "before", "previous", "ago", "earlier", "former", "once"],
  },
  {
    name: "Formality",
    positiveWords: ["formal", "professional", "official", "proper", "sophisticated", "refined", "elegant"],
    negativeWords: ["casual", "informal", "relaxed", "colloquial", "slang", "everyday", "simple"],
  },
  {
    name: "Speed",
    positiveWords: ["fast", "quick", "rapid", "swift", "speedy", "hasty", "brisk", "instant"],
    negativeWords: ["slow", "sluggish", "gradual", "leisurely", "unhurried", "plodding", "lazy"],
  },
];

// Category colors (for visualization)
export const CATEGORY_COLORS: Record<string, string> = {
  default: "#6366f1", // indigo
  positive: "#22c55e", // green
  negative: "#ef4444", // red
  neutral: "#a855f7", // purple
  question: "#f59e0b", // amber
  statement: "#3b82f6", // blue
  tech: "#06b6d4", // cyan
  science: "#10b981", // emerald
  sports: "#f97316", // orange
  politics: "#ec4899", // pink
  entertainment: "#8b5cf6", // violet
  business: "#14b8a6", // teal
};

// Get color for category (with fallback)
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default;
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Pre-loaded datasets
export interface Dataset {
  name: string;
  description: string;
  items: { text: string; category: string }[];
}

export const DATASETS: Dataset[] = [
  {
    name: "Sentiment",
    description: "Positive vs negative sentiment phrases",
    items: [
      { text: "I love this product, it's amazing!", category: "positive" },
      { text: "Best purchase I've ever made", category: "positive" },
      { text: "Absolutely fantastic experience", category: "positive" },
      { text: "This made my day so much better", category: "positive" },
      { text: "Highly recommend to everyone", category: "positive" },
      { text: "Exceeded all my expectations", category: "positive" },
      { text: "Such a wonderful surprise", category: "positive" },
      { text: "This is terrible, don't buy it", category: "negative" },
      { text: "Worst experience of my life", category: "negative" },
      { text: "Complete waste of money", category: "negative" },
      { text: "I regret this purchase deeply", category: "negative" },
      { text: "Disappointing and frustrating", category: "negative" },
      { text: "Would never recommend this", category: "negative" },
      { text: "Broke after one day of use", category: "negative" },
    ],
  },
  {
    name: "Topics",
    description: "Different subject areas",
    items: [
      { text: "Machine learning models improve with more training data", category: "tech" },
      { text: "Neural networks can recognize patterns in images", category: "tech" },
      { text: "Cloud computing enables scalable infrastructure", category: "tech" },
      { text: "APIs allow different software systems to communicate", category: "tech" },
      { text: "The mitochondria is the powerhouse of the cell", category: "science" },
      { text: "Photosynthesis converts sunlight into chemical energy", category: "science" },
      { text: "DNA contains the genetic instructions for life", category: "science" },
      { text: "Gravity keeps planets in orbit around the sun", category: "science" },
      { text: "The team won the championship after overtime", category: "sports" },
      { text: "The quarterback threw a touchdown pass", category: "sports" },
      { text: "Athletes train for years to compete at the Olympics", category: "sports" },
      { text: "The marathon runner broke the world record", category: "sports" },
    ],
  },
  {
    name: "Questions vs Statements",
    description: "Interrogative vs declarative sentences",
    items: [
      { text: "What is the meaning of life?", category: "question" },
      { text: "How do computers work?", category: "question" },
      { text: "Why is the sky blue?", category: "question" },
      { text: "When did the dinosaurs go extinct?", category: "question" },
      { text: "Where can I find good coffee?", category: "question" },
      { text: "Who invented the telephone?", category: "question" },
      { text: "The Earth orbits around the Sun.", category: "statement" },
      { text: "Water boils at 100 degrees Celsius.", category: "statement" },
      { text: "Paris is the capital of France.", category: "statement" },
      { text: "Humans need oxygen to survive.", category: "statement" },
      { text: "The Great Wall is in China.", category: "statement" },
      { text: "Shakespeare wrote many plays.", category: "statement" },
    ],
  },
  {
    name: "Semantic Similarity",
    description: "Groups of semantically similar sentences",
    items: [
      { text: "The cat sat on the mat", category: "animals" },
      { text: "A feline rested on the rug", category: "animals" },
      { text: "The kitten was lying on the carpet", category: "animals" },
      { text: "I need to buy groceries from the store", category: "shopping" },
      { text: "I have to get food from the supermarket", category: "shopping" },
      { text: "Going to purchase items at the market", category: "shopping" },
      { text: "The weather is beautiful today", category: "weather" },
      { text: "It's a lovely sunny day outside", category: "weather" },
      { text: "What gorgeous weather we're having", category: "weather" },
      { text: "I'm feeling tired and sleepy", category: "feelings" },
      { text: "I'm exhausted and need rest", category: "feelings" },
      { text: "Feeling drowsy and fatigued", category: "feelings" },
    ],
  },
];
