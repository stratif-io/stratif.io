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
  });

  it("stickiness is in [0, 1]", () => {
    const out = runTwin({ config: base });
    expect(out.stickiness.every((s) => s >= 0 && s <= 1)).toBe(true);
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

  it("stronger virality yields more total arrivals", () => {
    const weakSum = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "weak" } },
    }).newUsers.reduce((a, b) => a + b, 0);
    const strongSum = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "strong_viral" } },
    }).newUsers.reduce((a, b) => a + b, 0);
    expect(strongSum).toBeGreaterThan(weakSum);
  });

  it("honors scale_config overrides", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 30 } },
    });
    expect(out.days).toBe(30);
  });
});
