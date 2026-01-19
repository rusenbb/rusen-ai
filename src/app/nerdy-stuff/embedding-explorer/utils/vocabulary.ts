/**
 * Common English vocabulary for embedding exploration.
 *
 * This curated list includes words useful for exploring semantic directions:
 * - Common nouns (people, places, things)
 * - Adjectives (for exploring size, sentiment, etc.)
 * - Verbs (for exploring actions)
 * - Concepts useful for semantic axis exploration
 *
 * The list is designed to be interesting for exploration while keeping
 * download size reasonable (~50KB for 2000 words).
 */

// Core vocabulary organized by semantic category for interesting exploration
const VOCABULARY_BY_CATEGORY = {
  // People and roles
  people: [
    "man", "woman", "boy", "girl", "child", "baby", "adult", "teenager",
    "mother", "father", "parent", "son", "daughter", "brother", "sister",
    "husband", "wife", "friend", "enemy", "stranger", "neighbor", "cousin",
    "uncle", "aunt", "grandfather", "grandmother", "king", "queen", "prince",
    "princess", "doctor", "nurse", "teacher", "student", "professor", "scientist",
    "engineer", "programmer", "artist", "musician", "actor", "writer", "poet",
    "chef", "farmer", "soldier", "police", "firefighter", "pilot", "captain",
    "president", "minister", "judge", "lawyer", "banker", "merchant", "servant",
    "master", "slave", "hero", "villain", "warrior", "knight", "wizard",
  ],

  // Animals
  animals: [
    "dog", "cat", "bird", "fish", "horse", "cow", "pig", "sheep", "goat",
    "chicken", "duck", "rabbit", "mouse", "rat", "elephant", "lion", "tiger",
    "bear", "wolf", "fox", "deer", "monkey", "ape", "snake", "frog", "turtle",
    "whale", "dolphin", "shark", "eagle", "owl", "crow", "butterfly", "bee",
    "ant", "spider", "dragon", "unicorn",
  ],

  // Places
  places: [
    "home", "house", "apartment", "building", "office", "school", "university",
    "hospital", "church", "temple", "mosque", "palace", "castle", "tower",
    "city", "town", "village", "country", "nation", "world", "earth", "planet",
    "continent", "island", "mountain", "valley", "river", "lake", "ocean", "sea",
    "beach", "forest", "jungle", "desert", "garden", "park", "street", "road",
    "bridge", "tunnel", "airport", "station", "port", "market", "shop", "store",
    "restaurant", "hotel", "museum", "library", "theater", "stadium", "prison",
  ],

  // Objects
  objects: [
    "book", "pen", "pencil", "paper", "computer", "phone", "television", "radio",
    "camera", "clock", "watch", "key", "lock", "door", "window", "wall", "floor",
    "ceiling", "roof", "table", "chair", "bed", "couch", "lamp", "mirror",
    "picture", "painting", "statue", "car", "bus", "train", "plane", "ship",
    "boat", "bicycle", "motorcycle", "wheel", "engine", "tool", "hammer", "knife",
    "sword", "gun", "shield", "armor", "crown", "ring", "necklace", "dress",
    "shirt", "pants", "shoes", "hat", "glasses", "bag", "box", "bottle", "cup",
    "plate", "bowl", "fork", "spoon", "money", "coin", "card", "ticket",
  ],

  // Food and drink
  food: [
    "food", "drink", "water", "milk", "juice", "coffee", "tea", "wine", "beer",
    "bread", "rice", "pasta", "meat", "fish", "chicken", "beef", "pork",
    "vegetable", "fruit", "apple", "orange", "banana", "grape", "tomato",
    "potato", "carrot", "onion", "cheese", "butter", "egg", "sugar", "salt",
    "pepper", "chocolate", "cake", "cookie", "candy", "pizza", "burger",
    "sandwich", "salad", "soup", "breakfast", "lunch", "dinner", "meal",
  ],

  // Nature and weather
  nature: [
    "sun", "moon", "star", "sky", "cloud", "rain", "snow", "wind", "storm",
    "thunder", "lightning", "rainbow", "fire", "water", "air", "earth", "stone",
    "rock", "sand", "dust", "mud", "ice", "tree", "flower", "grass", "leaf",
    "root", "branch", "seed", "plant", "wood", "metal", "gold", "silver",
    "iron", "copper", "diamond", "crystal", "light", "dark", "shadow", "flame",
  ],

  // Time
  time: [
    "time", "moment", "second", "minute", "hour", "day", "night", "morning",
    "afternoon", "evening", "week", "month", "year", "decade", "century",
    "millennium", "past", "present", "future", "yesterday", "today", "tomorrow",
    "now", "then", "always", "never", "sometimes", "often", "rarely", "soon",
    "later", "early", "late", "beginning", "end", "start", "finish",
  ],

  // Abstract concepts
  abstract: [
    "love", "hate", "fear", "hope", "joy", "sadness", "anger", "happiness",
    "peace", "war", "freedom", "justice", "truth", "lie", "beauty", "ugly",
    "good", "evil", "right", "wrong", "life", "death", "birth", "growth",
    "power", "strength", "weakness", "courage", "cowardice", "wisdom", "knowledge",
    "ignorance", "intelligence", "stupidity", "success", "failure", "victory",
    "defeat", "wealth", "poverty", "health", "sickness", "safety", "danger",
    "order", "chaos", "silence", "noise", "dream", "nightmare", "reality",
    "fantasy", "memory", "thought", "idea", "belief", "doubt", "faith", "reason",
  ],

  // Actions (verbs as nouns)
  actions: [
    "walk", "run", "jump", "swim", "fly", "climb", "fall", "sit", "stand",
    "sleep", "wake", "eat", "drink", "speak", "listen", "read", "write",
    "think", "feel", "see", "hear", "touch", "smell", "taste", "love", "hate",
    "want", "need", "give", "take", "buy", "sell", "make", "break", "build",
    "destroy", "create", "kill", "save", "help", "hurt", "fight", "win", "lose",
    "play", "work", "rest", "travel", "arrive", "leave", "enter", "exit",
    "open", "close", "push", "pull", "hold", "drop", "catch", "throw",
  ],

  // Adjectives - Size
  size: [
    "big", "small", "large", "tiny", "huge", "enormous", "massive", "giant",
    "miniature", "microscopic", "tall", "short", "long", "wide", "narrow",
    "thick", "thin", "deep", "shallow", "heavy", "light", "fat", "slim",
  ],

  // Adjectives - Quality
  quality: [
    "good", "bad", "great", "terrible", "excellent", "awful", "wonderful",
    "horrible", "amazing", "disgusting", "beautiful", "ugly", "pretty", "handsome",
    "attractive", "plain", "perfect", "flawed", "pure", "dirty", "clean", "messy",
    "neat", "tidy", "rough", "smooth", "soft", "hard", "sharp", "dull",
  ],

  // Adjectives - Emotion
  emotion: [
    "happy", "sad", "angry", "calm", "excited", "bored", "surprised", "confused",
    "scared", "brave", "nervous", "relaxed", "tired", "energetic", "lonely",
    "loved", "proud", "ashamed", "jealous", "grateful", "hopeful", "desperate",
  ],

  // Adjectives - Temperature and sensation
  sensation: [
    "hot", "cold", "warm", "cool", "freezing", "boiling", "wet", "dry",
    "bright", "dark", "loud", "quiet", "fast", "slow", "quick", "rapid",
    "young", "old", "new", "ancient", "modern", "fresh", "stale", "ripe",
  ],

  // Adjectives - Other
  other_adj: [
    "rich", "poor", "expensive", "cheap", "free", "valuable", "worthless",
    "important", "trivial", "serious", "funny", "smart", "stupid", "wise",
    "foolish", "strong", "weak", "powerful", "helpless", "safe", "dangerous",
    "real", "fake", "true", "false", "right", "wrong", "legal", "illegal",
    "public", "private", "open", "closed", "full", "empty", "alive", "dead",
  ],

  // Countries and nationalities
  geography: [
    "american", "british", "french", "german", "italian", "spanish", "chinese",
    "japanese", "korean", "indian", "russian", "brazilian", "mexican", "canadian",
    "australian", "african", "european", "asian", "western", "eastern", "northern",
    "southern", "global", "local", "national", "international", "foreign", "domestic",
  ],

  // Professions and work
  work: [
    "job", "career", "profession", "occupation", "business", "company", "industry",
    "factory", "office", "meeting", "project", "task", "deadline", "salary",
    "boss", "employee", "worker", "manager", "director", "executive", "assistant",
    "colleague", "client", "customer", "partner", "competitor", "interview",
  ],

  // Technology
  technology: [
    "technology", "computer", "internet", "website", "software", "hardware",
    "program", "application", "data", "information", "network", "server",
    "database", "algorithm", "code", "robot", "machine", "device", "screen",
    "keyboard", "mouse", "printer", "digital", "electronic", "automatic",
    "artificial", "virtual", "online", "offline", "wireless", "mobile",
  ],

  // Science
  science: [
    "science", "research", "experiment", "theory", "hypothesis", "discovery",
    "invention", "laboratory", "scientist", "physics", "chemistry", "biology",
    "mathematics", "astronomy", "geology", "psychology", "medicine", "disease",
    "treatment", "cure", "vaccine", "cell", "atom", "molecule", "energy",
    "force", "gravity", "electricity", "magnetic", "radiation", "evolution",
  ],

  // Art and culture
  culture: [
    "art", "music", "dance", "theater", "cinema", "film", "movie", "song",
    "painting", "sculpture", "photograph", "literature", "poetry", "novel",
    "story", "drama", "comedy", "tragedy", "culture", "tradition", "custom",
    "festival", "celebration", "ceremony", "religion", "philosophy", "history",
    "language", "symbol", "meaning", "style", "fashion", "design", "creativity",
  ],

  // Sports and games
  sports: [
    "sport", "game", "play", "team", "player", "coach", "referee", "score",
    "goal", "point", "win", "lose", "tie", "match", "competition", "tournament",
    "championship", "medal", "trophy", "record", "athlete", "football", "soccer",
    "basketball", "baseball", "tennis", "golf", "swimming", "running", "boxing",
  ],

  // Education
  education: [
    "education", "school", "university", "college", "class", "lesson", "course",
    "subject", "study", "learn", "teach", "test", "exam", "grade", "degree",
    "diploma", "certificate", "knowledge", "skill", "ability", "talent", "genius",
    "student", "teacher", "professor", "homework", "textbook", "lecture",
  ],

  // Family and relationships
  relationships: [
    "family", "marriage", "wedding", "divorce", "relationship", "friendship",
    "romance", "date", "couple", "single", "married", "engaged", "partner",
    "boyfriend", "girlfriend", "spouse", "relative", "generation", "ancestor",
    "descendant", "heritage", "inheritance", "adoption", "orphan", "guardian",
  ],

  // Body parts
  body: [
    "body", "head", "face", "eye", "ear", "nose", "mouth", "lip", "tongue",
    "tooth", "hair", "neck", "shoulder", "arm", "hand", "finger", "thumb",
    "chest", "back", "stomach", "leg", "knee", "foot", "toe", "skin", "bone",
    "muscle", "blood", "heart", "brain", "lung", "liver", "kidney",
  ],

  // Colors
  colors: [
    "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown",
    "black", "white", "gray", "golden", "silver", "colorful", "pale", "bright",
    "dark", "light", "vivid", "dull", "transparent", "opaque",
  ],

  // Numbers and quantities
  quantities: [
    "one", "two", "three", "four", "five", "ten", "hundred", "thousand",
    "million", "billion", "first", "second", "third", "last", "half", "quarter",
    "double", "triple", "single", "multiple", "many", "few", "some", "all",
    "none", "most", "least", "more", "less", "enough", "too", "very",
  ],
};

/**
 * Flattened list of all vocabulary words.
 * Approximately 1000 carefully selected words for exploration.
 */
export const COMMON_WORDS: string[] = Object.values(VOCABULARY_BY_CATEGORY).flat();

/**
 * Get the total count of vocabulary words.
 */
export const VOCABULARY_COUNT = COMMON_WORDS.length;

/**
 * Load common words for embedding.
 * Returns the full vocabulary list.
 */
export function loadCommonWords(): string[] {
  return [...COMMON_WORDS];
}

/**
 * Get words from specific categories for focused exploration.
 */
export function getWordsByCategory(
  categories: (keyof typeof VOCABULARY_BY_CATEGORY)[]
): string[] {
  const words: string[] = [];
  for (const category of categories) {
    if (VOCABULARY_BY_CATEGORY[category]) {
      words.push(...VOCABULARY_BY_CATEGORY[category]);
    }
  }
  return words;
}

/**
 * Get all available category names.
 */
export function getVocabularyCategories(): string[] {
  return Object.keys(VOCABULARY_BY_CATEGORY);
}

/**
 * Interesting word pairs for exploring semantic directions.
 * These can be used as starting points for defining axes.
 */
export const INTERESTING_PAIRS: { concept: string; positive: string; negative: string }[] = [
  { concept: "Gender", positive: "woman", negative: "man" },
  { concept: "Age", positive: "old", negative: "young" },
  { concept: "Size", positive: "big", negative: "small" },
  { concept: "Temperature", positive: "hot", negative: "cold" },
  { concept: "Speed", positive: "fast", negative: "slow" },
  { concept: "Sentiment", positive: "good", negative: "bad" },
  { concept: "Wealth", positive: "rich", negative: "poor" },
  { concept: "Intelligence", positive: "smart", negative: "stupid" },
  { concept: "Strength", positive: "strong", negative: "weak" },
  { concept: "Beauty", positive: "beautiful", negative: "ugly" },
  { concept: "Time", positive: "future", negative: "past" },
  { concept: "Royalty", positive: "king", negative: "peasant" },
  { concept: "Formality", positive: "formal", negative: "casual" },
  { concept: "Emotion", positive: "happy", negative: "sad" },
  { concept: "Safety", positive: "safe", negative: "dangerous" },
];

/**
 * Classic word analogy examples for vector arithmetic.
 * Format: A - B + C ≈ D
 */
export const CLASSIC_ANALOGIES: { a: string; b: string; c: string; expected: string }[] = [
  { a: "king", b: "man", c: "woman", expected: "queen" },
  { a: "paris", b: "france", c: "italy", expected: "rome" },
  { a: "bigger", b: "big", c: "small", expected: "smaller" },
  { a: "walking", b: "walk", c: "swim", expected: "swimming" },
  { a: "brother", b: "boy", c: "girl", expected: "sister" },
  { a: "uncle", b: "man", c: "woman", expected: "aunt" },
  { a: "husband", b: "man", c: "woman", expected: "wife" },
  { a: "son", b: "boy", c: "girl", expected: "daughter" },
];
