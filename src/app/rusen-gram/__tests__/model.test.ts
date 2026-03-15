import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  autocompleteTokens,
  decodeGeneratedTokens,
  hydrateRuseNGramArtifact,
  scoreNextTokens,
} from "../lib/runtime";

const artifactPath = join(
  process.cwd(),
  "public",
  "rusen-gram",
  "model-v2.json",
);
const artifact = hydrateRuseNGramArtifact(
  JSON.parse(readFileSync(artifactPath, "utf-8")),
);

describe("ruseNgram trained artifact", () => {
  it("exports held-out metrics from the real training pipeline", () => {
    expect(artifact.version).toBe("ruse-ngram-v2-bpe-kn");
    expect(artifact.metadata.evaluation.baseHeldoutPerplexity).toBeGreaterThan(1);
    expect(artifact.metadata.evaluation.blendedAssistantHeldoutPerplexity)
      .toBeLessThanOrEqual(artifact.metadata.evaluation.assistantHeldoutPerplexity);
    expect(artifact.metadata.evaluation.blendedAssistantHeldoutTop5).toBeGreaterThan(0);
  });

  it("uses full learned start words at assistant turn boundaries", () => {
    const ranked = scoreNextTokens(
      artifact,
      "Kullanıcı: Merhaba\nAsistan:",
      [],
      artifact.metadata.evaluation.defaultAssistantBlend,
    );

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.token.trim().length).toBeGreaterThan(1);
    expect(ranked.slice(0, 5).every((candidate) => candidate.tokenIds.length >= 1)).toBe(
      true,
    );
  });

  it("autocompletes without emitting control tokens", () => {
    const generated = autocompleteTokens(
      artifact,
      "Kullanıcı: Merhaba\nAsistan:",
      [],
      artifact.metadata.evaluation.defaultAssistantBlend,
      8,
    );
    const text = decodeGeneratedTokens(artifact, generated);

    expect(generated.length).toBeGreaterThan(0);
    expect(text).not.toContain("<|");
    expect(text.trim().length).toBeGreaterThan(0);
  });
});
