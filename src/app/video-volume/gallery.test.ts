import { readFileSync, statSync } from "node:fs";
import { expect, it } from "vitest";
import { clips, validateAnalysis } from "./gallery";
it("ships eight licensed real clips with complete, genuine model-result provenance", () => {
  expect(clips).toHaveLength(8);
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

it("analyzes 36 real samples over the same three seconds and omits the traffic truck class", () => {
  for (const clip of clips) {
    const raw = JSON.parse(readFileSync(`public${clip.analysis}`, "utf8"));
    expect(clip.duration).toBe(3);
    expect(clip.fps).toBe(12);
    expect(raw.frameCount).toBe(36);
    expect(raw.samplingFps).toBe(12);
    expect(
      new Set(
        raw.frames.map(
          (frame: { sourceFrameSha256: string }) => frame.sourceFrameSha256,
        ),
      ).size,
    ).toBe(36);
  }
  const traffic = clips.find((c) => c.id === "car")!;
  expect(traffic.labels).toEqual(["car", "bus"]);
  const data = validateAnalysis(
    JSON.parse(readFileSync(`public${traffic.analysis}`, "utf8")),
    traffic,
  );
  expect(
    data.frames.flatMap((f) => f.objects).some((o) => o.label === "truck"),
  ).toBe(false);
});
it("new clips have a persistent real object ID in at least 90% of samples", () => {
  for (const id of ["bear", "elephant", "giraffe"]) {
    const clip = clips.find((c) => c.id === id)!;
    const data = validateAnalysis(
      JSON.parse(readFileSync(`public${clip.analysis}`, "utf8")),
      clip,
    );
    const counts = new Map<number, number>();
    for (const frame of data.frames)
      for (const object of frame.objects)
        counts.set(object.id, (counts.get(object.id) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeGreaterThanOrEqual(33);
  }
});
