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

import { validateMarkovConfig } from "@/features/events/markovValidation";
import type { MarkovConfig } from "@/types/simulation";

const VALID: MarkovConfig = {
  events: [{ name: "A" }, { name: "B" }],
  start: { A: 1.0 },
  transitions: {
    A: { B: 0.5, "[end]": 0.5 },
    B: { "[end]": 1.0 },
  },
};

describe("validateMarkovConfig", () => {
  it("returns no errors for a valid config", () => {
    expect(validateMarkovConfig(VALID)).toEqual([]);
  });

  it("errors when start does not sum to 1", () => {
    const cfg: MarkovConfig = { ...VALID, start: { A: 0.5 } };
    const errs = validateMarkovConfig(cfg);
    expect(errs.some((e) => e.includes("start"))).toBe(true);
  });

  it("errors when a transition row does not sum to 1", () => {
    const cfg: MarkovConfig = {
      ...VALID,
      transitions: { A: { "[end]": 0.4 }, B: { "[end]": 1.0 } },
    };
    const errs = validateMarkovConfig(cfg);
    expect(errs.some((e) => e.includes("row 'A'"))).toBe(true);
  });

  it("errors when a transition key is not in events", () => {
    const cfg: MarkovConfig = {
      ...VALID,
      transitions: {
        ...VALID.transitions,
        X: { "[end]": 1.0 },
      },
    };
    const errs = validateMarkovConfig(cfg);
    expect(errs.some((e) => e.includes("'X'"))).toBe(true);
  });

  it("returns multiple errors for multiple problems", () => {
    const cfg: MarkovConfig = {
      events: [{ name: "A" }],
      start: { A: 0.5 },
      transitions: { A: { "[end]": 0.3 } },
    };
    expect(validateMarkovConfig(cfg).length).toBeGreaterThanOrEqual(2);
  });
});
