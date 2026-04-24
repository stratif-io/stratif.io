import { describe, it } from "vitest";
import fc from "fast-check";
import { runTwin } from "..";

const axisArb = fc.record({
  growth: fc.constantFrom("steady", "strong", "hockey_stick", "declining"),
  stickiness: fc.constantFrom("churn_heavy", "sticky", "addictive"),
  engagement_depth: fc.constantFrom("shallow", "medium", "deep"),
  monetization: fc.constantFrom(
    "ad_supported",
    "freemium",
    "subscription",
    "iap_whales",
  ),
  virality: fc.constantFrom("weak", "moderate", "strong_viral"),
  scale: fc.constantFrom("tiny"),
  geography: fc.constantFrom("global", "eu_only", "us_only"),
  anomalies: fc.constantFrom("clean", "moderate", "explicit"),
});

describe("runTwin property tests", () => {
  it("all outputs non-negative, stickiness null or in [0,1]", () => {
    fc.assert(
      fc.property(
        axisArb,
        fc.integer({ min: 0, max: 1_000_000 }),
        (axes, seed) => {
          const out = runTwin({
            config: {
              name: "p",
              axes,
              random_seed: seed,
              markov: {
                events: [{ name: "PageView" }],
                start: { PageView: 1.0 },
                transitions: { PageView: { "[end]": 1.0 } },
              },
            },
          });
          return (
            out.events.every((v) => v >= 0) &&
            out.activeUsers.every((v) => v >= 0) &&
            out.newUsers.every((v) => v >= 0) &&
            out.churnedUsers.every((v) => v >= 0) &&
            out.reactivatedUsers.every((v) => v >= 0) &&
            out.stickiness.every((s) => s === null || (s >= 0 && s <= 1))
          );
        },
      ),
      { numRuns: 30 },
    );
  });
});
