import { describe, it, expect } from "vitest";
import { SimulationConfigSchema } from "@/lib/yaml/schema";

const MINIMAL_MARKOV = {
  events: [{ name: "PageView" }],
  start: { PageView: 1.0 },
  transitions: { PageView: { "[end]": 1.0 } },
};

describe("SimulationConfigSchema markov field", () => {
  it("accepts a valid markov block", () => {
    const result = SimulationConfigSchema.safeParse({
      name: "test",
      axes: { scale: "small" },
      markov: MINIMAL_MARKOV,
    });
    expect(result.success).toBe(true);
  });

  it("rejects config without markov", () => {
    const result = SimulationConfigSchema.safeParse({
      name: "test",
      axes: { scale: "small" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional event color", () => {
    const result = SimulationConfigSchema.safeParse({
      name: "test",
      axes: {},
      markov: {
        events: [{ name: "A", color: "#ff0000" }],
        start: { A: 1.0 },
        transitions: { A: { "[end]": 1.0 } },
      },
    });
    expect(result.success).toBe(true);
  });
});
