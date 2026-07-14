import { describe, expect, it } from "vitest";

import { createUmbrellaWorld, summarizeUmbrellaWorld } from "./math";

describe("umbrella causal model", () => {
  it("has no observational distortion when umbrella choice ignores rain", () => {
    const world = createUmbrellaWorld(0);
    const summary = summarizeUmbrellaWorld(world);

    expect(summary.rainAmongPeopleWithoutUmbrella).toBeCloseTo(world.rainRate, 12);
    expect(summary.rainAmongPeopleWithUmbrella).toBeCloseTo(world.rainRate, 12);
    expect(summary.observedAssociation).toBeCloseTo(0, 12);
    expect(summary.forcedEffect).toBeCloseTo(0, 12);
  });

  it("creates a large spurious association while retaining no causal umbrella effect", () => {
    const summary = summarizeUmbrellaWorld(createUmbrellaWorld(1));

    expect(summary.rainAmongPeopleWithUmbrella).toBeGreaterThan(0.9);
    expect(summary.rainAmongPeopleWithoutUmbrella).toBeLessThan(0.1);
    expect(summary.observedAssociation).toBeGreaterThan(0.6);
    expect(summary.forcedEffect).toBeCloseTo(0, 12);
  });

  it("makes selection bias grow monotonically with the dial", () => {
    const weak = summarizeUmbrellaWorld(createUmbrellaWorld(0.25));
    const strong = summarizeUmbrellaWorld(createUmbrellaWorld(0.75));

    expect(strong.observedAssociation).toBeGreaterThan(weak.observedAssociation);
    expect(strong.rainAmongPeopleWithUmbrella - strong.rainAmongPeopleWithoutUmbrella)
      .toBeGreaterThan(weak.rainAmongPeopleWithUmbrella - weak.rainAmongPeopleWithoutUmbrella);
  });
});
