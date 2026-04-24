import { describe, it, expect } from "vitest";
import { SimulationConfigSchema } from "../schema";

describe("SimulationConfigSchema", () => {
  it("parses a minimal valid config", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      domain: "saas",
      axes: { growth: "strong" },
    });
    expect(out.success).toBe(true);
  });

  it("rejects a config missing name", () => {
    const out = SimulationConfigSchema.safeParse({
      domain: "saas",
      axes: {},
    });
    expect(out.success).toBe(false);
  });

  it("rejects non-string axes values", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      domain: "saas",
      axes: { growth: 1 },
    });
    expect(out.success).toBe(false);
  });

  it("accepts anomalies with typed effect numbers", () => {
    const out = SimulationConfigSchema.safeParse({
      name: "x",
      domain: "saas",
      axes: { growth: "strong" },
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
