import { readFileSync, statSync } from "node:fs";
import { expect, it } from "vitest";
import { clips, validateAnalysis } from "./gallery";
it("ships five licensed real clips with complete, genuine model-result provenance", () => {
  expect(clips).toHaveLength(5);
  for (const clip of clips) {
    expect(clip.source).toMatch(
      /^https:\/\/commons.wikimedia.org\/wiki\/File:/,
    );
    expect(clip.license).toMatch(/^CC BY/);
    for (const asset of [clip.video, clip.atlas, clip.poster, clip.analysis])
      expect(statSync(`public${asset}`).size).toBeLessThan(25 * 1024 * 1024);
    const raw = JSON.parse(readFileSync(`public${clip.analysis}`, "utf8"));
    const data = validateAnalysis(raw, clip);
    expect(raw.detector.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(raw.segmenter.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(raw.tracking).toBe("detection-association");
    expect(raw.interpolatedMasks).toBe(false);
    expect(data.frames.flatMap((f) => f.objects).length).toBeGreaterThan(10);
    for (const frame of raw.frames)
      expect(frame.sourceFrameSha256).toMatch(/^[a-f0-9]{64}$/);
  }
});
it("rejects wrong clips, corrupt masks, duplicate identities and invalid timestamps", () => {
  const clip = clips[0],
    valid = JSON.parse(readFileSync(`public${clip.analysis}`, "utf8"));
  for (const mutate of [
    (d: typeof valid) => (d.clipId = "other"),
    (d: typeof valid) => (d.frames[0].time = 1),
    (d: typeof valid) => (d.frames[0].objects[0].mask.counts = [1]),
    (d: typeof valid) => d.frames[0].objects.push(d.frames[0].objects[0]),
  ]) {
    const data = structuredClone(valid);
    mutate(data);
    expect(() => validateAnalysis(data, clip)).toThrow();
  }
});
