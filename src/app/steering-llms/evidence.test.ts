// @vitest-environment node
import { expect, it } from "vitest";
import catalog from "@/content/steering-directions.json";
import evidence from "../../../public/steering/direction-evaluation.json";
import {
  CONTINUATION_INSTRUCTION,
  MODEL_ID,
  MODEL_REVISION,
  MODEL_SHA256,
} from "./presets";

it("advertises only recipes that passed the recorded review for this exact model and input protocol", () => {
  expect(evidence.model).toBe(MODEL_ID);
  expect(evidence.revision).toBe(MODEL_REVISION);
  expect(evidence.sha256).toBe(MODEL_SHA256);
  expect(evidence.sharedInstruction).toBe(CONTINUATION_INSTRUCTION);
  for (const recipe of catalog)
    for (const variant of recipe.variants) {
      const configuration = evidence.native.plan.configurations.find(
        (c) => c.id === recipe.id && c.layer === variant.layer,
      );
      expect(configuration?.strength).toBe(variant.strength);
      expect(configuration?.pairs).toEqual(
        recipe.positive.map((p, i) => [p, recipe.negative[i]]),
      );
      for (const backend of ["native", "wasm"] as const) {
        const reviews = evidence.ratings.filter(
          (r) => r.id === recipe.id && r.backend === backend,
        );
        expect(reviews).toHaveLength(variant.total);
        const passed = reviews.filter((r) => r.passed).length;
        expect(passed).toBe(
          backend === "native" ? variant.nativePassed : variant.wasmPassed,
        );
        expect(passed).toBeGreaterThanOrEqual(4);
      }
      expect(
        evidence.wasm.zeroChecks.find(
          (c) => c.id === recipe.id && c.layer === variant.layer,
        )?.equal,
      ).toBe(true);
    }
});
