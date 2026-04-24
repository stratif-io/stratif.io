import { describe, it, expect } from "vitest";
import { applyVirality } from "../virality";

describe("applyVirality", () => {
  it("weak virality adds less than strong_viral", () => {
    const base = new Array(30).fill(100);
    const weak = applyVirality(base, "weak", "sticky");
    const strong = applyVirality(base, "strong_viral", "sticky");
    const wSum = weak.reduce((a, b) => a + b, 0);
    const sSum = strong.reduce((a, b) => a + b, 0);
    expect(sSum).toBeGreaterThan(wSum);
  });

  it("return array length matches input", () => {
    const out = applyVirality([1, 2, 3], "moderate", "sticky");
    expect(out).toHaveLength(3);
  });

  it("non-negative everywhere", () => {
    const out = applyVirality([10, 10, 10, 10, 10], "strong_viral", "sticky");
    expect(out.every((v) => v >= 0)).toBe(true);
  });
});
