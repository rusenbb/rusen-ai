const WORD_START = "▁";

export type RuseNGramExampleId =
  | "coffee"
  | "summary"
  | "greeting"
  | "compare";

export interface RuseNGramExample {
  id: RuseNGramExampleId;
  title: string;
  prompt: string;
  description: string;
  recommendedBlend: number;
}

export interface FeatureContribution {
  id: string;
  label: string;
  model: "base" | "assistant" | "prompt";
  kind: "lm" | "prompt";
  weight: number;
}

export interface CandidatePrediction {
  tokenIds: number[];
  tokenKey: string;
  token: string;
  probability: number;
  baseProbability: number;
  assistantProbability: number;
  blendedProbability: number;
  featureScore: number;
  isTerminal: boolean;
  contributions: FeatureContribution[];
}

interface RawTokenizerArtifact {
  kind: "rusen-bpe-v2";
  pieces: string[];
  merges: [number, number, number][];
  special: Record<string, number>;
}

type RawModelRow = [number[], number, number, [number, number][]];

interface RawCountModelArtifact {
  order: number;
  discount: number;
  continuationCounts: number[];
  totalContinuations: number;
  rows: Record<"1" | "2" | "3", RawModelRow[]>;
}

interface RawPromptFeatures {
  maxGeneratedTokens: number;
  scale: number;
  rows: [string, [number, number][]][];
}

interface RawArtifact {
  version: string;
  tokenizer: RawTokenizerArtifact;
  metadata: {
    generatedAt: string;
    corpus: {
      base: Record<"train" | "validation" | "test", number>;
      assistant: Record<"train" | "validation" | "test", number>;
      sources: {
        base: Record<string, Record<"train" | "validation" | "test", number>>;
        assistant: Record<string, Record<"train" | "validation" | "test", number>>;
      };
    };
    tokenizerEvaluation: {
      base: Record<string, { documents: number; charsPerToken: number; tokensPerDocument: number }>;
      assistant: Record<string, { documents: number; charsPerToken: number; tokensPerDocument: number }>;
      vocabSize: number;
      mergeCount: number;
    };
    evaluation: {
      baseHeldoutPerplexity: number;
      assistantHeldoutPerplexity: number;
      assistantHeldoutTop5: number;
      tunedValidationPerplexity: number;
      blendedAssistantHeldoutPerplexity: number;
      blendedAssistantHeldoutTop5: number;
      defaultAssistantBlend: number;
      promptFeatureScale: number;
    };
  };
  models: {
    candidateIds: number[];
    base: RawCountModelArtifact;
    assistant: RawCountModelArtifact;
  };
  promptFeatures: RawPromptFeatures;
  assistantStart: {
    words: [string, number[], number][];
    promptRows: [string, [string, number][]][];
  };
}

interface PreparedRow {
  total: number;
  uniqueFollowers: number;
  followers: Map<number, number>;
}

interface PreparedCountModelArtifact {
  order: number;
  discount: number;
  continuationCounts: number[];
  totalContinuations: number;
  rows: Record<number, Map<string, PreparedRow>>;
}

interface PreparedPromptFeatures {
  maxGeneratedTokens: number;
  scale: number;
  rows: Map<string, Map<number, number>>;
}

interface PreparedTokenizer {
  kind: "rusen-bpe-v2";
  pieces: string[];
  merges: [number, number, number][];
  special: Record<string, number>;
  pieceToId: Map<string, number>;
  mergeLookup: Map<string, { rank: number; merged: number }>;
}

export interface RuseNGramArtifact {
  version: string;
  tokenizer: PreparedTokenizer;
  metadata: RawArtifact["metadata"];
  models: {
    candidateIds: number[];
    base: PreparedCountModelArtifact;
    assistant: PreparedCountModelArtifact;
  };
  promptFeatures: PreparedPromptFeatures;
  assistantStart: {
    words: { word: string; tokenIds: number[]; count: number }[];
    promptRows: Map<string, Map<string, number>>;
  };
}

export const RUSEN_GRAM_ARTIFACT_PATH = "/rusen-gram/model-v2.json";

export const RUSEN_GRAM_EXAMPLES: RuseNGramExample[] = [
  {
    id: "coffee",
    title: "How-to answer",
    prompt: "Kullanıcı: Türk kahvesi nasıl yapılır?\nAsistan:",
    description:
      "The assistant blend now comes from a trained n-gram LM plus learned prompt-response lexical features, not curated opener lists.",
    recommendedBlend: 0.88,
  },
  {
    id: "summary",
    title: "Summarization",
    prompt:
      "Kullanıcı: Şunu özetle: Türk kahvesi ince öğütülmüş kahvenin cezvede yavaşça pişirilmesiyle hazırlanır.\nAsistan:",
    description:
      "This is useful for checking whether prompt words steer the response toward concise framing learned from real assistant data.",
    recommendedBlend: 0.86,
  },
  {
    id: "greeting",
    title: "Greeting behavior",
    prompt: "Kullanıcı: Merhaba\nAsistan:",
    description:
      "A strong assistant blend should now favor greeting-like openers because the model sees `<|assistant|>` contexts in the training data.",
    recommendedBlend: 0.9,
  },
  {
    id: "compare",
    title: "Comparison prompt",
    prompt:
      "Kullanıcı: Türk kahvesi ile filtre kahveyi karşılaştır.\nAsistan:",
    description:
      "This shows prompt-token influence without prompt buckets or preserved-vocabulary hacks.",
    recommendedBlend: 0.88,
  },
];

function makePairKey(left: number, right: number): string {
  return `${left}:${right}`;
}

function makeContextKey(context: number[]): string {
  return context.join(",");
}

function prepareModel(model: RawCountModelArtifact): PreparedCountModelArtifact {
  const rows: Record<number, Map<string, PreparedRow>> = {
    1: new Map(),
    2: new Map(),
    3: new Map(),
  };

  (["1", "2", "3"] as const).forEach((contextLen) => {
    for (const row of model.rows[contextLen]) {
      const [context, total, uniqueFollowers, followers] = row;
      rows[Number(contextLen)].set(makeContextKey(context), {
        total,
        uniqueFollowers,
        followers: new Map(followers),
      });
    }
  });

  return {
    order: model.order,
    discount: model.discount,
    continuationCounts: model.continuationCounts,
    totalContinuations: model.totalContinuations,
    rows,
  };
}

function preparePromptFeatures(promptFeatures: RawPromptFeatures): PreparedPromptFeatures {
  return {
    maxGeneratedTokens: promptFeatures.maxGeneratedTokens,
    scale: promptFeatures.scale,
    rows: new Map(
      promptFeatures.rows.map(([promptWord, followers]) => [
        promptWord,
        new Map(followers),
      ]),
    ),
  };
}

function prepareTokenizer(tokenizer: RawTokenizerArtifact): PreparedTokenizer {
  const pieceToId = new Map(tokenizer.pieces.map((piece, index) => [piece, index]));
  const mergeLookup = new Map<string, { rank: number; merged: number }>();
  tokenizer.merges.forEach(([left, right, merged], rank) => {
    mergeLookup.set(makePairKey(left, right), { rank, merged });
  });

  return {
    ...tokenizer,
    pieceToId,
    mergeLookup,
  };
}

export function hydrateRuseNGramArtifact(raw: RawArtifact): RuseNGramArtifact {
  return {
    version: raw.version,
    tokenizer: prepareTokenizer(raw.tokenizer),
    metadata: raw.metadata,
    models: {
      candidateIds: raw.models.candidateIds,
      base: prepareModel(raw.models.base),
      assistant: prepareModel(raw.models.assistant),
    },
    promptFeatures: preparePromptFeatures(raw.promptFeatures),
    assistantStart: {
      words: raw.assistantStart.words.map(([word, tokenIds, count]) => ({
        word,
        tokenIds,
        count,
      })),
      promptRows: new Map(
        raw.assistantStart.promptRows.map(([promptWord, followers]) => [
          promptWord,
          new Map(followers),
        ]),
      ),
    },
  };
}

export async function loadRuseNGramArtifact(): Promise<RuseNGramArtifact> {
  const response = await fetch(RUSEN_GRAM_ARTIFACT_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load RuseN-Gram artifact: ${response.status}`);
  }
  return hydrateRuseNGramArtifact((await response.json()) as RawArtifact);
}

function decodePieces(artifact: RuseNGramArtifact, tokenIds: number[]): string {
  let output = "";
  for (const tokenId of tokenIds) {
    const piece = artifact.tokenizer.pieces[tokenId];
    if (!piece) continue;
    if (piece.startsWith("<")) continue;
    output += piece;
  }
  return output.replaceAll(WORD_START, " ");
}

export function decodeGeneratedTokens(
  artifact: RuseNGramArtifact,
  tokenIds: number[],
): string {
  return decodePieces(artifact, tokenIds);
}

function extractPromptWords(prompt: string): Set<string> {
  const words = prompt.match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(words.map((word) => word.toLocaleLowerCase("tr-TR")));
}

function splitPromptWords(prompt: string): string[] {
  const normalized = prompt.replace(/\r\n?/g, "\n");
  const parts = normalized.split(/(Kullanıcı:|Asistan:)/g);
  const words: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part === "Kullanıcı:") {
      words.push("<|user|>");
      continue;
    }
    if (part === "Asistan:") {
      words.push("<|assistant|>");
      continue;
    }

    const chunkWords = part
      .replace(/\n/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    words.push(...chunkWords);
  }

  return words;
}

function encodeWord(artifact: RuseNGramArtifact, word: string): number[] {
  const pieceToId = artifact.tokenizer.pieceToId;
  const unk = artifact.tokenizer.special["<unk>"];

  if (!word) return [];

  const chars = [...word];
  const [first, ...rest] = chars;
  const firstId = pieceToId.get(`${WORD_START}${first}`);
  if (firstId === undefined) return [unk];

  const pieces: number[] = [firstId];
  for (const char of rest) {
    const charId = pieceToId.get(char);
    if (charId === undefined) {
      return [unk];
    }
    pieces.push(charId);
  }

  while (pieces.length > 1) {
    let bestIndex = -1;
    let bestRank = Number.POSITIVE_INFINITY;
    let bestMerged = -1;

    for (let index = 0; index < pieces.length - 1; index += 1) {
      const mergeInfo = artifact.tokenizer.mergeLookup.get(
        makePairKey(pieces[index]!, pieces[index + 1]!),
      );
      if (!mergeInfo || mergeInfo.rank >= bestRank) continue;
      bestIndex = index;
      bestRank = mergeInfo.rank;
      bestMerged = mergeInfo.merged;
    }

    if (bestIndex === -1) break;
    pieces.splice(bestIndex, 2, bestMerged);
  }

  return pieces;
}

function encodeWords(artifact: RuseNGramArtifact, words: string[]): number[] {
  const ids: number[] = [];
  for (const word of words) {
    const specialId = artifact.tokenizer.special[word];
    if (specialId !== undefined) {
      ids.push(specialId);
      continue;
    }
    ids.push(...encodeWord(artifact, word));
  }
  return ids;
}

function encodePrompt(artifact: RuseNGramArtifact, prompt: string): number[] {
  return encodeWords(artifact, splitPromptWords(prompt));
}

function probability(
  model: PreparedCountModelArtifact,
  tokenId: number,
  context: number[],
): number {
  const usable = context.slice(-(model.order - 1));

  const recurse = (current: number[]): number => {
    if (current.length === 0) {
      const continuation = model.continuationCounts[tokenId] ?? 0;
      if (model.totalContinuations <= 0) {
        return 1 / model.continuationCounts.length;
      }
      if (continuation === 0) {
        return 1 / (model.totalContinuations + model.continuationCounts.length);
      }
      return continuation / model.totalContinuations;
    }

    const row = model.rows[current.length].get(makeContextKey(current));
    if (!row) {
      return recurse(current.slice(1));
    }

    const observedCount = row.followers.get(tokenId) ?? 0;
    const observed = Math.max(observedCount - model.discount, 0) / row.total;
    const backoff = (model.discount * row.uniqueFollowers) / row.total;
    return observed + backoff * recurse(current.slice(1));
  };

  return recurse(usable);
}

function promptFeatureRawScore(
  artifact: RuseNGramArtifact,
  promptWords: Set<string>,
  candidateId: number,
): number {
  let total = 0;
  for (const promptWord of promptWords) {
    total += artifact.promptFeatures.rows.get(promptWord)?.get(candidateId) ?? 0;
  }
  return total;
}

function candidateLabel(artifact: RuseNGramArtifact, tokenId: number): string {
  if (tokenId === artifact.tokenizer.special["</s>"]) {
    return "<eos>";
  }
  return decodePieces(artifact, [tokenId]);
}

function startPromptFeatureScore(
  artifact: RuseNGramArtifact,
  promptWords: Set<string>,
  candidateWord: string,
): number {
  let total = 0;
  const normalized = candidateWord.toLocaleLowerCase("tr-TR");
  for (const promptWord of promptWords) {
    total += artifact.assistantStart.promptRows.get(promptWord)?.get(normalized) ?? 0;
  }
  return total;
}

function sequenceBlendedProbability(
  artifact: RuseNGramArtifact,
  tokenIds: number[],
  context: number[],
  assistantBlend: number,
): { baseProbability: number; assistantProbability: number; blendedProbability: number } {
  let baseProbability = 1;
  let assistantProbability = 1;
  let blendedProbability = 1;
  const runningContext = [...context];

  for (const tokenId of tokenIds) {
    const baseStep = probability(artifact.models.base, tokenId, runningContext);
    const assistantStep = probability(artifact.models.assistant, tokenId, runningContext);
    const blendStep =
      (1 - assistantBlend) * baseStep + assistantBlend * assistantStep;

    baseProbability *= baseStep;
    assistantProbability *= assistantStep;
    blendedProbability *= blendStep;
    runningContext.push(tokenId);
  }

  return { baseProbability, assistantProbability, blendedProbability };
}

function atAssistantStart(
  artifact: RuseNGramArtifact,
  promptIds: number[],
  generatedTokenIds: number[],
): boolean {
  const assistant = artifact.tokenizer.special["<|assistant|>"];
  return generatedTokenIds.length === 0 && promptIds.at(-1) === assistant;
}

function rankCandidates(
  artifact: RuseNGramArtifact,
  prompt: string,
  generatedTokenIds: number[],
  assistantBlend: number,
): CandidatePrediction[] {
  const bos = artifact.tokenizer.special["<s>"];
  const eos = artifact.tokenizer.special["</s>"];
  const assistant = artifact.tokenizer.special["<|assistant|>"];
  const promptIds = encodePrompt(artifact, prompt);
  const promptWords = extractPromptWords(prompt);
  const prefix = Array.from(
    { length: Math.max(artifact.models.assistant.order - 1, 0) },
    () => bos,
  );
  const context = [
    ...prefix,
    ...promptIds,
    ...generatedTokenIds,
  ];

  if (atAssistantStart(artifact, promptIds, generatedTokenIds)) {
    const raw = artifact.assistantStart.words.map((entry) => {
      const sequenceProbability = sequenceBlendedProbability(
        artifact,
        entry.tokenIds,
        context,
        assistantBlend,
      );
      const featureScore =
        artifact.promptFeatures.scale *
        startPromptFeatureScore(artifact, promptWords, entry.word);
      const rawProbability =
        sequenceProbability.blendedProbability * Math.exp(featureScore);

      return {
        tokenIds: entry.tokenIds,
        tokenKey: entry.word,
        token: ` ${entry.word}`.replace(/^  /, " "),
        probability: 0,
        baseProbability: sequenceProbability.baseProbability,
        assistantProbability: sequenceProbability.assistantProbability,
        blendedProbability: sequenceProbability.blendedProbability,
        featureScore,
        isTerminal: false,
        contributions: [
          {
            id: `base-start-${entry.word}`,
            label: "Base Turkish LM sequence probability",
            model: "base" as const,
            kind: "lm" as const,
            weight: sequenceProbability.baseProbability,
          },
          {
            id: `assistant-start-${entry.word}`,
            label: "Assistant LM sequence probability",
            model: "assistant" as const,
            kind: "lm" as const,
            weight: sequenceProbability.assistantProbability,
          },
          ...(featureScore > 0
            ? [
                {
                  id: `prompt-start-${entry.word}`,
                  label: "Prompt-conditioned start-word lift",
                  model: "prompt" as const,
                  kind: "prompt" as const,
                  weight: featureScore,
                },
              ]
            : []),
        ],
        rawProbability,
      };
    });

    const total = raw.reduce((sum, item) => sum + item.rawProbability, 0);
    return raw
      .map((item) => ({
        ...item,
        probability: total > 0 ? item.rawProbability / total : 0,
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  const raw = artifact.models.candidateIds.map((candidateId) => {
    const baseProbability = probability(artifact.models.base, candidateId, context);
    const assistantProbability = probability(
      artifact.models.assistant,
      candidateId,
      context,
    );
    let blendedProbability =
      (1 - assistantBlend) * baseProbability +
      assistantBlend * assistantProbability;

    if (
      candidateId === eos &&
      context[context.length - 1] === assistant &&
      generatedTokenIds.length === 0
    ) {
      blendedProbability *= 0.3;
    }

      const featureRaw =
        generatedTokenIds.length < artifact.promptFeatures.maxGeneratedTokens
        ? promptFeatureRawScore(artifact, promptWords, candidateId)
        : 0;
    const featureScore = artifact.promptFeatures.scale * featureRaw;

    return {
      tokenIds: [candidateId],
      tokenKey: String(candidateId),
      token: candidateLabel(artifact, candidateId),
      probability: 0,
      baseProbability,
      assistantProbability,
      blendedProbability,
      featureScore,
      isTerminal: candidateId === eos,
      contributions: [] as FeatureContribution[],
      rawProbability: blendedProbability * Math.exp(featureScore),
    };
  });

  const total = raw.reduce((sum, item) => sum + item.rawProbability, 0);

  return raw
    .map((item) => {
      const contributions: FeatureContribution[] = [
        {
          id: `base-${item.tokenKey}`,
          label: "Base Turkish LM probability",
          model: "base",
          kind: "lm",
          weight: item.baseProbability,
        },
        {
          id: `assistant-${item.tokenKey}`,
          label: "Assistant LM probability",
          model: "assistant",
          kind: "lm",
          weight: item.assistantProbability,
        },
      ];

      if (item.featureScore > 0) {
        contributions.push({
          id: `prompt-${item.tokenKey}`,
          label: "Prompt-conditioned lexical lift",
          model: "prompt",
          kind: "prompt",
          weight: item.featureScore,
        });
      }

      return {
        tokenIds: item.tokenIds,
        tokenKey: item.tokenKey,
        token: item.token,
        probability: total > 0 ? item.rawProbability / total : 0,
        baseProbability: item.baseProbability,
        assistantProbability: item.assistantProbability,
        blendedProbability: item.blendedProbability,
        featureScore: item.featureScore,
        isTerminal: item.isTerminal,
        contributions,
      };
    })
    .sort((a, b) => b.probability - a.probability);
}

export function scoreNextTokens(
  artifact: RuseNGramArtifact,
  prompt: string,
  generatedTokenIds: number[],
  assistantBlend: number,
): CandidatePrediction[] {
  return rankCandidates(
    artifact,
    prompt,
    generatedTokenIds,
    assistantBlend,
  ).filter((candidate) => !candidate.isTerminal);
}

export function autocompleteTokens(
  artifact: RuseNGramArtifact,
  prompt: string,
  generatedTokenIds: number[],
  assistantBlend: number,
  steps: number,
): number[] {
  const output = [...generatedTokenIds];

  for (let index = 0; index < steps; index += 1) {
    const ranked = rankCandidates(artifact, prompt, output, assistantBlend);
    const next = ranked[0];
    if (!next || next.isTerminal) {
      break;
    }
    output.push(...next.tokenIds);
  }

  return output;
}
