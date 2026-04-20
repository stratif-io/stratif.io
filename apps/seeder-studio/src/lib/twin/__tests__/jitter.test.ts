import { describe, it, expect } from "vitest";
import { applyJitter } from "../jitter";

describe("applyJitter", () => {
  it("returns same length", () => {
    expect(applyJitter([1, 2, 3, 4], "clean", 42)).toHaveLength(4);
  });

  it("deterministic given same seed", () => {
    const a = applyJitter([100, 100, 100], "explicit", 42);
    const b = applyJitter([100, 100, 100], "explicit", 42);
    expect(a).toEqual(b);
  });

  it("explicit produces more variance than clean", () => {
    const input = new Array(1000).fill(100);
    const clean = applyJitter(input, "clean", 7);
    const explicit = applyJitter(input, "explicit", 7);
    const variance = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    };
    expect(variance(explicit)).toBeGreaterThan(variance(clean));
  });

  it("never returns negative values", () => {
    const out = applyJitter([1, 1, 1, 1, 1], "explicit", 7);
    expect(out.every((v) => v >= 0)).toBe(true);
  });
});
