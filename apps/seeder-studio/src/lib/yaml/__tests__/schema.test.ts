import { describe, it, expect } from "vitest";
import { SimulationConfigSchema } from "../schema";

const MIN_MARKOV = {
  events: [{ name: "PageView" }],
  start: { PageView: 1.0 },
  transitions: { PageView: { "[end]": 1.0 } },
};

describe("SimulationConfigSchema", () => {
  it("parses a minimal valid config", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: "strong" },
      markov: MIN_MARKOV,
    });
    expect(out.success).toBe(true);
  });

  it("rejects a config missing name", () => {
    const out = SimulationConfigSchema.safeParse({
      axes: {},
      markov: MIN_MARKOV,
    });
    expect(out.success).toBe(false);
  });

  it("rejects non-string axes values", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: 1 },
      markov: MIN_MARKOV,
    });
    expect(out.success).toBe(false);
  });

  it("accepts anomalies with typed effect numbers", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: "strong" },
      markov: MIN_MARKOV,
      anomalies: [
        {
          type: "marketing_campaign",
          name: "v",
          start: "-30d",
          duration: "10d",
          effect: { arrivals: 2 },
        },
      ],
    });
    expect(out.success).toBe(true);
  });
});
