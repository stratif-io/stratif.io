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
    scale: "tiny",
    geography: "global",
    anomalies: "clean",
  },
  random_seed: 42,
};

describe("runTwin", () => {
  it("returns arrays of length window_days", () => {
    const out = runTwin({ config: base });
    expect(out.days).toBe(30);
    expect(out.events).toHaveLength(30);
    expect(out.activeUsers).toHaveLength(30);
    expect(out.newUsers).toHaveLength(30);
    expect(out.churnedUsers).toHaveLength(30);
    expect(out.reactivatedUsers).toHaveLength(30);
    expect(out.stickiness).toHaveLength(30);
    expect(out.totalUsers).toHaveLength(30);
  });

  it("stickiness is null for t < 28", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(out.stickiness.slice(0, 28).every((s) => s === null)).toBe(true);
  });

  it("stickiness is in [0, 1] after warmup", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(
      out.stickiness.slice(28).every((s) => s !== null && s >= 0 && s <= 1),
    ).toBe(true);
  });

  it("addictive stickiness > sticky > churny", () => {
    const avg = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null);
      return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    };
    const cfg = (s: string) => ({
      config: {
        ...base,
        axes: { ...base.axes, stickiness: s },
        scale_config: { window_days: 60 },
      },
    });
    const churny = runTwin(cfg("churny"));
    const sticky = runTwin(cfg("sticky"));
    const addictive = runTwin(cfg("addictive"));
    expect(avg(churny.stickiness)).toBeLessThan(avg(sticky.stickiness));
    expect(avg(sticky.stickiness)).toBeLessThan(avg(addictive.stickiness));
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

  it("virality does not change total arrivals", () => {
    const weak = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "weak" } },
    });
    const strong = runTwin({
      config: { ...base, axes: { ...base.axes, virality: "strong_viral" } },
    });
    // Arrivals are re-normalised to total_users before cohort sampling.
    // Each cohort size is a Poisson draw, so the cumulative total has
    // std-dev ≈ sqrt(total_users) ≈ 31 for the "tiny" scale (1 000 users).
    // Allow 3 sigma (~100) so the assertion is meaningful without being brittle.
    expect(
      Math.abs(weak.totalUsers.at(-1)! - strong.totalUsers.at(-1)!),
    ).toBeLessThanOrEqual(100);
  });

  it("honors scale_config overrides", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 45 } },
    });
    expect(out.days).toBe(45);
  });

  it("totalUsers is monotonically non-decreasing", () => {
    const out = runTwin({ config: base });
    for (let i = 1; i < out.totalUsers.length; i++) {
      expect(out.totalUsers[i]).toBeGreaterThanOrEqual(out.totalUsers[i - 1]);
    }
  });

  it("reactivatedUsers is non-negative", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(out.reactivatedUsers.every((v) => v >= 0)).toBe(true);
  });

  it("churnedUsers is non-negative", () => {
    const out = runTwin({
      config: { ...base, scale_config: { window_days: 60 } },
    });
    expect(out.churnedUsers.every((v) => v >= 0)).toBe(true);
  });

  it("churny produces more churn than addictive", () => {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const cfg = (s: string) => ({
      config: {
        ...base,
        axes: { ...base.axes, stickiness: s },
        scale_config: { window_days: 60 },
      },
    });
    expect(sum(runTwin(cfg("churny")).churnedUsers)).toBeGreaterThan(
      sum(runTwin(cfg("addictive")).churnedUsers),
    );
  });

  it("deterministic: same config same output", () => {
    const a = runTwin({ config: base });
    const b = runTwin({ config: base });
    expect(a.activeUsers).toEqual(b.activeUsers);
  });
});
