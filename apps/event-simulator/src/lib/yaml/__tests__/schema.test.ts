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

  it("silently drops non-string axes values (lenient parsing)", () => {
    // .catch(undefined) on axis enums coerces invalid values to undefined
    // rather than failing — this is intentional lenient parsing behaviour.
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: 1 },
      markov: MIN_MARKOV,
    });
    expect(out.success).toBe(true);
    if (out.success) {
      expect(out.data.axes.growth).toBeUndefined();
    }
  });

  it("accepts anomalies with start_date and end_date", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: "strong" },
      markov: MIN_MARKOV,
      events: [
        {
          type: "marketing_campaign",
          name: "v",
          start_date: "2025-01-01",
          end_date: "2025-01-11",
          effect: { arrivals: 2 },
        },
      ],
    });
    expect(out.success).toBe(true);
  });

  it("rejects anomalies missing start_date or end_date", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: "strong" },
      markov: MIN_MARKOV,
      events: [
        {
          type: "marketing_campaign",
          name: "v",
          effect: { arrivals: 2 },
        },
      ],
    });
    expect(out.success).toBe(false);
  });

  it("rejects anomalies with non-ISO start_date", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      axes: { growth: "strong" },
      markov: MIN_MARKOV,
      events: [
        {
          type: "marketing_campaign",
          start_date: "not-a-date",
          end_date: "2025-01-11",
          effect: { arrivals: 2 },
        },
      ],
    });
    expect(out.success).toBe(false);
  });
});
