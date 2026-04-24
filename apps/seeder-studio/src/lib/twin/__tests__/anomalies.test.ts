import { describe, it, expect } from "vitest";
import { applyAnomalies } from "../anomalies";
import type { SimulationAnomaly } from "@/types/simulation";

const spike: SimulationAnomaly = {
  type: "marketing_campaign",
  name: "viral",
  start: "5d",
  duration: "3d",
  effect: { arrivals: 4 },
};

describe("applyAnomalies", () => {
  it("multiplies arrivals in the window and leaves others unchanged", () => {
    const base = new Array(10).fill(10);
    const out = applyAnomalies(base, [spike]);
    expect(out.slice(0, 5)).toEqual([10, 10, 10, 10, 10]);
    expect(out.slice(5, 8)).toEqual([40, 40, 40]);
    expect(out.slice(8)).toEqual([10, 10]);
  });

  it('negative start means "days before window end"', () => {
    const base = new Array(10).fill(10);
    const neg = { ...spike, start: "-5d", duration: "2d" };
    const out = applyAnomalies(base, [neg]);
    expect(out[5]).toBe(40);
    expect(out[6]).toBe(40);
    expect(out[7]).toBe(10);
  });

  it("skips anomalies outside the window", () => {
    const base = new Array(10).fill(10);
    const out = applyAnomalies(base, [{ ...spike, start: "100d" }]);
    expect(out).toEqual(base);
  });

  it("stacks multiple anomalies multiplicatively", () => {
    const base = new Array(10).fill(10);
    const a1 = {
      ...spike,
      start: "5d",
      duration: "3d",
      effect: { arrivals: 2 },
    };
    const a2 = {
      ...spike,
      name: "b",
      start: "6d",
      duration: "1d",
      effect: { arrivals: 3 },
    };
    const out = applyAnomalies(base, [a1, a2]);
    expect(out[5]).toBe(20);
    expect(out[6]).toBe(60);
    expect(out[7]).toBe(20);
  });
});
