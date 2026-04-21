import { describe, it, expect } from "vitest";
import { runTwin } from "..";
import type { SimulationConfig } from "@/types/simulation";

const base: SimulationConfig = {
  name: "test",
  domain: "saas",
  axes: {
    growth: "strong",
    stickiness: "sticky",
    engagement_depth: "medium",
    monetization: "subscription",
    virality: "weak",
    scale: "small",
    geography: "global",
    anomalies: "clean",
  },
  random_seed: 42,
};

describe("runTwin", () => {
  it("returns arrays of length window_days", () => {
    const out = runTwin({ config: base });
    expect(out.days).toBe(90);
    expect(out.events).toHaveLength(90);
    expect(out.activeUsers).toHaveLength(90);
    expect(out.newUsers).toHaveLength(90);
    expect(out.stickiness).toHaveLength(90);
    expect(out.totalUsers).toHaveLength(90);
  });

  it("stickiness is in [0, 1]", () => {
    const out = runTwin({ config: base });
    expect(out.stickiness.every((s) => s >= 0 && s <= 1)).toBe(true);
  });

  it("churny stickiness axis produces meaningfully lower stickiness than sticky", () => {
    const sticky = runTwin({ config: base });
    const churny = runTwin({
      config: { ...base, axes: { ...base.axes, stickiness: "churny" } },
    });
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    // sticky DAU/MAU should be meaningfully higher than churny DAU/MAU
    expect(avg(sticky.stickiness)).toBeGreaterThan(avg(churny.stickiness));
  });

  it("deeper engagement yields more events per DAU", () => {
    const shallow = runTwin({
      config: { ...base, axes: { ...base.axes, engagement_depth: "shallow" } },
    });
    const deep = runTwin({
      config: { ...base, axes: { ...base.axes, engagement_depth: "deep" } },
    });
    const ratio = (o: ReturnType<typeof runTwin>) =>
      o.events.reduce((a, b) => a + b, 0) /
      Math.max(
        1,
        o.activeUsers.reduce((a, b) => a + b, 0),
      );
    expect(ratio(deep)).toBeGreaterThan(ratio(shallow) * 2);
  });

  it("virality does not change total arrivals (normalized to total_users)", () => {
    const weak = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "weak" } },
    });
    const strong = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "strong_viral" } },
    });
    // Both end at the same total (within rounding)
    expect(weak.totalUsers.at(-1)).toBeCloseTo(strong.totalUsers.at(-1)!, 0);
    // Strong viral is more back-loaded: larger share of arrivals in second half
    const half = Math.floor(weak.days / 2);
    const weakSecond = weak.newUsers.slice(half).reduce((a, b) => a + b, 0);
    const strongSecond = strong.newUsers.slice(half).reduce((a, b) => a + b, 0);
    expect(strongSecond).toBeGreaterThanOrEqual(weakSecond);
  });

  it("honors scale_config overrides", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 30 } },
    });
    expect(out.days).toBe(30);
  });

  it("totalUsers is monotonically non-decreasing and equals cumulative sum of newUsers", () => {
    const out = runTwin({ config: base });
    // Check monotonicity
    for (let i = 1; i < out.totalUsers.length; i++) {
      expect(out.totalUsers[i]).toBeGreaterThanOrEqual(out.totalUsers[i - 1]);
    }
    // Check that totalUsers equals cumulative sum of newUsers
    let cumulative = 0;
    for (let i = 0; i < out.newUsers.length; i++) {
      cumulative += out.newUsers[i];
      expect(out.totalUsers[i]).toBe(cumulative);
    }
  });
});
