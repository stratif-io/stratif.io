import { describe, it, expect } from "vitest";
import { MARKOV_PRESETS } from "@/features/events/markovPresets";
import { validateMarkovConfig } from "@/features/events/markovValidation";

describe("MARKOV_PRESETS", () => {
  it("has entries for all 10 built-in domains", () => {
    const expected = [
      "casual_game",
      "gaming_hardcore",
      "saas",
      "ecommerce",
      "retail",
      "marketplace",
      "dating",
      "streaming",
      "social",
      "fintech",
    ];
    for (const key of expected) {
      expect(MARKOV_PRESETS[key], `missing preset: ${key}`).toBeDefined();
    }
  });

  it("every preset passes validation", () => {
    for (const [key, preset] of Object.entries(MARKOV_PRESETS)) {
      const errors = validateMarkovConfig(preset);
      expect(
        errors,
        `${key} has validation errors: ${errors.join("; ")}`,
      ).toEqual([]);
    }
  });
});
