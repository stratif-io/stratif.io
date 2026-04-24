import { describe, it, expect } from "vitest";
import { growthCurve } from "../growth";

describe("growthCurve", () => {
  it("length equals window_days", () => {
    expect(growthCurve("strong", 30, 1000, undefined)).toHaveLength(30);
  });

  it("hockey_stick is flat for the first split_fraction of the window", () => {
    const days = 100;
    const total = 10000;
    const curve = growthCurve("hockey_stick", days, total, {
      split_fraction: 0.3,
      rate: 0.04,
    });
    const flatMax = Math.max(...curve.slice(0, 30));
    const bladeMin = Math.min(...curve.slice(70));
    expect(bladeMin).toBeGreaterThan(flatMax * 5);
  });

  it("decline produces a monotonically non-increasing curve", () => {
    const curve = growthCurve("decline", 30, 1000, undefined);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeLessThanOrEqual(curve[i - 1] + 1e-9);
    }
  });

  it("strong sums approximately to total_users", () => {
    const total = 5000;
    const curve = growthCurve("strong", 90, total, undefined);
    const sum = curve.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(total * 0.8);
    expect(sum).toBeLessThan(total * 1.2);
  });

  it("returns all non-negative values", () => {
    for (const axis of ["weak", "strong", "hockey_stick", "decline"]) {
      const curve = growthCurve(axis, 60, 1000, {
        split_fraction: 0.3,
        rate: 0.04,
      });
      expect(curve.every((v) => v >= 0)).toBe(true);
    }
  });
});
