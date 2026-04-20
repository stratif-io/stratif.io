import { describe, it } from "vitest";
import fc from "fast-check";
import { runTwin } from "..";

const axisArb = fc.record({
  growth: fc.constantFrom("weak", "strong", "hockey_stick", "decline"),
  stickiness: fc.constantFrom("churny", "sticky", "addictive"),
  engagement_depth: fc.constantFrom("shallow", "medium", "deep"),
  monetization: fc.constantFrom(
    "ads",
    "freemium",
    "subscription",
    "iap_whales",
  ),
  virality: fc.constantFrom("weak", "moderate", "strong_viral"),
  scale: fc.constantFrom("tiny", "small"),
  geography: fc.constantFrom("global", "regional", "local"),
  anomalies: fc.constantFrom("clean", "moderate", "explicit"),
});

describe("runTwin property tests", () => {
  it("all outputs non-negative, stickiness in [0,1]", () => {
    fc.assert(
      fc.property(
        axisArb,
        fc.integer({ min: 0, max: 1_000_000 }),
        (axes, seed) => {
          const out = runTwin({
            config: {
              name: "p",
              domain: "saas",
              axes,
              random_seed: seed,
            },
          });
          return (
            out.events.every((v) => v >= 0) &&
            out.activeUsers.every((v) => v >= 0) &&
            out.newUsers.every((v) => v >= 0) &&
            out.stickiness.every((s) => s >= 0 && s <= 1)
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
