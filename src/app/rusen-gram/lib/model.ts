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
  model: "base" | "assistant";
  kind: "prior" | "n-gram" | "skip-gram" | "style";
  weight: number;
}

export interface CandidatePrediction {
  token: string;
  probability: number;
  baseScore: number;
  assistantScore: number;
  blendedScore: number;
  contributions: FeatureContribution[];
}

interface ScoringContext {
  prompt: string;
  generatedTokens: string[];
  fullText: string;
  normalizedText: string;
  step: number;
}

interface FeatureDefinition {
  id: string;
  label: string;
  model: "base" | "assistant";
  kind: "n-gram" | "skip-gram" | "style";
  when: (ctx: ScoringContext) => boolean;
  weights: Partial<Record<string, number>>;
}

export const RUSEN_GRAM_EXAMPLES: RuseNGramExample[] = [
  {
    id: "coffee",
    title: "How-to answer",
    prompt: "Kullanıcı: Türk kahvesi nasıl yapılır?\nAsistan:",
    description:
      "Assistant-heavy blends learn to format a short instructional answer instead of generic continuation.",
    recommendedBlend: 0.85,
  },
  {
    id: "summary",
    title: "Summarization",
    prompt:
      "Kullanıcı: Şunu özetle: Türk kahvesi ince öğütülmüş kahvenin cezvede yavaşça pişirilmesiyle hazırlanır.\nAsistan:",
    description:
      "This shows how instruction data nudges the model toward concise framing like 'Kısaca,'.",
    recommendedBlend: 0.8,
  },
  {
    id: "greeting",
    title: "Greeting behavior",
    prompt: "Kullanıcı: Merhaba\nAsistan:",
    description:
      "The base model wants to continue generic text. The assistant blend answers like a chat system.",
    recommendedBlend: 0.9,
  },
  {
    id: "compare",
    title: "Comparison prompt",
    prompt:
      "Kullanıcı: Türk kahvesi ile filtre kahveyi karşılaştır.\nAsistan:",
    description:
      "Skip features help the model react to non-adjacent terms like 'Türk kahvesi ... karşılaştır'.",
    recommendedBlend: 0.88,
  },
];

const TOKENS = [
  " Elbette,",
  " Tabii,",
  " Kısaca,",
  " İşte",
  " adımlar:",
  "\n1.",
  " Suyu",
  " kaynatın.",
  "\n2.",
  " Kahveyi",
  " fincana",
  " koyun.",
  " üzerine",
  " sıcak",
  " su",
  " ekleyin.",
  " yardımcı",
  " olayım.",
  " Merhaba!",
  " Selam!",
  " Nasılsınız?",
  " bugün",
  " bu",
  " metin",
  " kahve",
  " hakkında",
  "dır.",
  " karşılaştırayım.",
  " Türk",
  " kahvesi",
  " filtre",
  " ve",
  " arasında",
  " fark",
  " vardır.",
  " insanlar",
  " için",
  " sıkça",
  " kullanır.",
  " Sorunuz",
  " nedir?",
  " kısa",
  " özet:",
  " Önce",
  " sonra",
] as const;

const BASE_PRIORS: Record<string, number> = {
  " bugün": 0.7,
  " bu": 0.62,
  " kahve": 0.66,
  " için": 0.55,
  " insanlar": 0.48,
  " Türk": 0.4,
  " kahvesi": 0.45,
  " filtre": 0.24,
  " ve": 0.34,
  " arasında": 0.26,
  " fark": 0.21,
  " vardır.": 0.18,
  " metin": 0.3,
  " hakkında": 0.28,
  "dır.": 0.19,
};

const ASSISTANT_PRIORS: Record<string, number> = {
  " Elbette,": 0.82,
  " Tabii,": 0.74,
  " Kısaca,": 0.68,
  " İşte": 0.58,
  " yardımcı": 0.4,
  " olayım.": 0.32,
  " Merhaba!": 0.36,
  " Selam!": 0.28,
  " Nasılsınız?": 0.22,
  " Sorunuz": 0.2,
  " nedir?": 0.2,
  " kısa": 0.18,
  " özet:": 0.16,
};

function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAllTerms(ctx: ScoringContext, terms: string[]): boolean {
  const normalizedTerms = terms.map((term) => term.toLocaleLowerCase("tr-TR"));
  return normalizedTerms.every((term) => ctx.normalizedText.includes(term));
}

function atAssistantStart(ctx: ScoringContext): boolean {
  return ctx.generatedTokens.length === 0 && ctx.fullText.trimEnd().endsWith("Asistan:");
}

function endsWithTokens(ctx: ScoringContext, tokens: string[]): boolean {
  if (tokens.length > ctx.generatedTokens.length) return false;
  const tail = ctx.generatedTokens.slice(-tokens.length);
  return tokens.every((token, idx) => tail[idx] === token);
}

const FEATURES: FeatureDefinition[] = [
  {
    id: "assistant-greeting-start",
    label: "Assistant start after chat prompt",
    model: "assistant",
    kind: "style",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["merhaba"]),
    weights: {
      " Merhaba!": 2.8,
      " Selam!": 2.1,
      " Elbette,": 0.7,
    },
  },
  {
    id: "assistant-howto-start",
    label: "Instruction opening for how-to questions",
    model: "assistant",
    kind: "style",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["nasıl"]),
    weights: {
      " İşte": 2.9,
      " Elbette,": 2.2,
      " Tabii,": 1.6,
      "\n1.": 1.2,
    },
  },
  {
    id: "assistant-skip-kahve-nasil",
    label: "Skip-gram: kahvesi ... nasıl",
    model: "assistant",
    kind: "skip-gram",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["kahvesi", "nasıl"]),
    weights: {
      " İşte": 1.9,
      "\n1.": 1.8,
      " Elbette,": 0.9,
    },
  },
  {
    id: "assistant-summary-start",
    label: "Summary instruction opening",
    model: "assistant",
    kind: "style",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["özetle"]),
    weights: {
      " Kısaca,": 3.3,
      " kısa": 1.3,
      " özet:": 1.4,
    },
  },
  {
    id: "assistant-compare-start",
    label: "Comparison instruction opening",
    model: "assistant",
    kind: "style",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["karşılaştır"]),
    weights: {
      " Elbette,": 2.9,
      " Tabii,": 2.1,
      " karşılaştırayım.": 1.0,
    },
  },
  {
    id: "assistant-skip-compare-terms",
    label: "Skip-gram: türk kahvesi ... karşılaştır",
    model: "assistant",
    kind: "skip-gram",
    when: (ctx) =>
      atAssistantStart(ctx) &&
      hasAllTerms(ctx, ["karşılaştır", "kahvesi", "filtre"]),
    weights: {
      " karşılaştırayım.": 2.2,
      " Elbette,": 1.2,
    },
  },
  {
    id: "assistant-after-iste",
    label: "n-gram: İşte -> adımlar:",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" İşte"]),
    weights: {
      " adımlar:": 3.9,
      "\n1.": 0.8,
    },
  },
  {
    id: "assistant-after-adimlar",
    label: "n-gram: adımlar: -> 1.",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" adımlar:"]),
    weights: {
      "\n1.": 4.2,
    },
  },
  {
    id: "assistant-after-step1",
    label: "n-gram: 1. -> Suyu",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, ["\n1."]),
    weights: {
      " Suyu": 4.0,
      " Önce": 1.6,
    },
  },
  {
    id: "assistant-after-water",
    label: "n-gram: Suyu -> kaynatın.",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" Suyu"]),
    weights: {
      " kaynatın.": 4.1,
    },
  },
  {
    id: "assistant-after-boil",
    label: "n-gram: kaynatın. -> 2.",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" kaynatın."]),
    weights: {
      "\n2.": 3.7,
      " sonra": 1.2,
    },
  },
  {
    id: "assistant-after-step2",
    label: "n-gram: 2. -> Kahveyi",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, ["\n2."]),
    weights: {
      " Kahveyi": 4.0,
    },
  },
  {
    id: "assistant-after-kahveyi",
    label: "n-gram: Kahveyi -> fincana",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" Kahveyi"]),
    weights: {
      " fincana": 3.6,
      " üzerine": 1.2,
    },
  },
  {
    id: "assistant-after-fincana",
    label: "n-gram: fincana -> koyun.",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" fincana"]),
    weights: {
      " koyun.": 3.8,
    },
  },
  {
    id: "assistant-after-elbette-general",
    label: "n-gram: Elbette, -> helpful continuation",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" Elbette,"]),
    weights: {
      " yardımcı": 2.8,
      " karşılaştırayım.": 2.9,
      " İşte": 1.1,
    },
  },
  {
    id: "assistant-after-yardimci",
    label: "n-gram: yardımcı -> olayım.",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" yardımcı"]),
    weights: {
      " olayım.": 4.1,
    },
  },
  {
    id: "assistant-after-kisaca",
    label: "n-gram: Kısaca, -> kısa summary",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" Kısaca,"]),
    weights: {
      " bu": 2.2,
      " kısa": 1.4,
      " özet:": 1.4,
    },
  },
  {
    id: "assistant-summary-phrase",
    label: "Skip-gram: özetle ... kahve",
    model: "assistant",
    kind: "skip-gram",
    when: (ctx) =>
      ctx.generatedTokens.length > 0 && hasAllTerms(ctx, ["özetle", "kahve"]),
    weights: {
      " metin": 2.2,
      " kahve": 1.8,
      " hakkında": 2.1,
      "dır.": 1.6,
    },
  },
  {
    id: "assistant-compare-body",
    label: "n-gram: karşılaştırayım. -> Türk",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" karşılaştırayım."]),
    weights: {
      " Türk": 3.1,
      " filtre": 1.8,
    },
  },
  {
    id: "assistant-compare-chain-1",
    label: "n-gram: Türk -> kahvesi",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" Türk"]),
    weights: {
      " kahvesi": 3.3,
    },
  },
  {
    id: "assistant-compare-chain-2",
    label: "n-gram: kahvesi -> ve",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" kahvesi"]),
    weights: {
      " ve": 2.6,
      " arasında": 0.8,
    },
  },
  {
    id: "assistant-compare-chain-3",
    label: "n-gram: ve -> filtre",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" ve"]),
    weights: {
      " filtre": 3.2,
    },
  },
  {
    id: "assistant-compare-chain-4",
    label: "n-gram: filtre -> arasında",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" filtre"]),
    weights: {
      " arasında": 3.1,
      " kahve": 1.2,
    },
  },
  {
    id: "assistant-compare-chain-5",
    label: "n-gram: arasında -> fark",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" arasında"]),
    weights: {
      " fark": 3.4,
    },
  },
  {
    id: "assistant-compare-chain-6",
    label: "n-gram: fark -> vardır.",
    model: "assistant",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" fark"]),
    weights: {
      " vardır.": 3.6,
    },
  },
  {
    id: "base-greeting-start",
    label: "Base continuation after greeting prompt",
    model: "base",
    kind: "style",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["merhaba"]),
    weights: {
      " bugün": 2.5,
      " bu": 1.8,
      " insanlar": 1.3,
    },
  },
  {
    id: "base-kahve-start",
    label: "Base continuation for kahve prompt",
    model: "base",
    kind: "n-gram",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["kahve"]),
    weights: {
      " kahve": 2.8,
      " için": 2.2,
      " insanlar": 1.4,
      " bugün": 1.7,
    },
  },
  {
    id: "base-summary-start",
    label: "Base continuation for summary prompt",
    model: "base",
    kind: "n-gram",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["özetle"]),
    weights: {
      " bu": 2.3,
      " metin": 2.4,
      " kahve": 1.2,
      " hakkında": 1.5,
    },
  },
  {
    id: "base-compare-start",
    label: "Base continuation for compare prompt",
    model: "base",
    kind: "n-gram",
    when: (ctx) => atAssistantStart(ctx) && hasAllTerms(ctx, ["karşılaştır"]),
    weights: {
      " Türk": 1.8,
      " kahvesi": 2.0,
      " ve": 1.6,
      " fark": 0.9,
    },
  },
  {
    id: "base-kahve-follow",
    label: "n-gram: kahve -> için",
    model: "base",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" kahve"]),
    weights: {
      " için": 2.7,
      " insanlar": 1.3,
      " sıkça": 0.9,
    },
  },
  {
    id: "base-bu-follow",
    label: "n-gram: bu -> metin",
    model: "base",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" bu"]),
    weights: {
      " metin": 2.6,
      " kahve": 1.1,
    },
  },
  {
    id: "base-metin-follow",
    label: "n-gram: metin -> hakkında",
    model: "base",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" metin"]),
    weights: {
      " hakkında": 2.9,
    },
  },
  {
    id: "base-about-follow",
    label: "n-gram: hakkında -> dır.",
    model: "base",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" hakkında"]),
    weights: {
      "dır.": 2.8,
    },
  },
  {
    id: "base-compare-chain",
    label: "n-gram: kahvesi -> ve",
    model: "base",
    kind: "n-gram",
    when: (ctx) => endsWithTokens(ctx, [" kahvesi"]),
    weights: {
      " ve": 2.0,
      " arasında": 0.9,
    },
  },
];

function buildContext(prompt: string, generatedTokens: string[]): ScoringContext {
  const fullText = `${prompt}${generatedTokens.join("")}`;
  return {
    prompt,
    generatedTokens,
    fullText,
    normalizedText: normalizeText(fullText),
    step: generatedTokens.length,
  };
}

function computeModelScore(
  token: string,
  model: "base" | "assistant",
  ctx: ScoringContext,
): { score: number; contributions: FeatureContribution[] } {
  const contributions: FeatureContribution[] = [];
  const prior =
    model === "base"
      ? BASE_PRIORS[token] ?? 0
      : ASSISTANT_PRIORS[token] ?? 0;

  if (prior !== 0) {
    contributions.push({
      id: `${model}-prior-${token}`,
      label: "Token prior",
      model,
      kind: "prior",
      weight: prior,
    });
  }

  for (const feature of FEATURES) {
    if (feature.model !== model || !feature.when(ctx)) continue;
    const weight = feature.weights[token];
    if (!weight) continue;

    contributions.push({
      id: feature.id,
      label: feature.label,
      model,
      kind: feature.kind,
      weight,
    });
  }

  const score = contributions.reduce((sum, item) => sum + item.weight, 0);
  return { score, contributions };
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

export function scoreNextTokens(
  prompt: string,
  generatedTokens: string[],
  assistantBlend: number,
): CandidatePrediction[] {
  const ctx = buildContext(prompt, generatedTokens);

  const raw = TOKENS.map((token) => {
    const base = computeModelScore(token, "base", ctx);
    const assistant = computeModelScore(token, "assistant", ctx);
    const blendedScore =
      (1 - assistantBlend) * base.score + assistantBlend * assistant.score;

    return {
      token,
      baseScore: base.score,
      assistantScore: assistant.score,
      blendedScore,
      contributions: [...base.contributions, ...assistant.contributions].sort(
        (a, b) => Math.abs(b.weight) - Math.abs(a.weight),
      ),
    };
  });

  const probabilities = softmax(raw.map((item) => item.blendedScore));

  return raw
    .map((item, index) => ({
      ...item,
      probability: probabilities[index] ?? 0,
    }))
    .sort((a, b) => b.probability - a.probability);
}

export function autocompleteTokens(
  prompt: string,
  generatedTokens: string[],
  assistantBlend: number,
  steps: number,
): string[] {
  const output = [...generatedTokens];

  for (let i = 0; i < steps; i++) {
    const ranked = scoreNextTokens(prompt, output, assistantBlend);
    const next = ranked[0];
    if (!next) break;
    output.push(next.token);
  }

  return output;
}
