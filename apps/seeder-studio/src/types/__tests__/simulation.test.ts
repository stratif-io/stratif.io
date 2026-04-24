import { describe, it, expect } from "vitest";
import type { SimulationConfig, SimulationAnomaly } from "../simulation";

describe("SimulationConfig shape", () => {
  it("accepts a valid minimal config", () => {
    const cfg: SimulationConfig = {
      name: "saas_pmf",
      axes: { growth: "strong" },
      markov: {
        events: [{ name: "PageView" }],
        start: { PageView: 1.0 },
        transitions: { PageView: { "[end]": 1.0 } },
      },
    };
    expect(cfg.name).toBe("saas_pmf");
  });

  it("accepts an anomaly object", () => {
    const a: SimulationAnomaly = {
      type: "marketing_campaign",
      name: "viral",
      start: "-130d",
      duration: "10d",
      effect: { arrivals: 8.0 },
    };
    expect(a.effect.arrivals).toBe(8.0);
  });
});
