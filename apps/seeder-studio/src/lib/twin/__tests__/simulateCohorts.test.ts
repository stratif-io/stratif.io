import { describe, it, expect } from "vitest";
import { simulateCohorts } from "../simulateCohorts";
import type { RetentionParams } from "../types";

const STICKY: RetentionParams = {
  peakChurnRate: 0.5,
  baseChurnRate: 0.05,
  churnDecayDays: 10,
  reactivationRate: 0.05,
  reactivationDecay: 0.8,
  maxDormantDays: 45,
};

const CHURNY: RetentionParams = {
  peakChurnRate: 0.75,
  baseChurnRate: 0.2,
  churnDecayDays: 4,
  reactivationRate: 0.02,
  reactivationDecay: 0.7,
  maxDormantDays: 20,
};

const ADDICTIVE: RetentionParams = {
  peakChurnRate: 0.25,
  baseChurnRate: 0.01,
  churnDecayDays: 14,
  reactivationRate: 0.1,
  reactivationDecay: 0.85,
  maxDormantDays: 90,
};

const uniformArrivals = (days: number, perDay: number) =>
  new Array(days).fill(perDay);

describe("simulateCohorts", () => {
  it("all output arrays have length === days", () => {
    const m = simulateCohorts(
      uniformArrivals(30, 100),
      30,
      3000,
      STICKY,
      10,
      42,
    );
    expect(m.activeUsers).toHaveLength(30);
    expect(m.newUsers).toHaveLength(30);
    expect(m.churnedUsers).toHaveLength(30);
    expect(m.reactivatedUsers).toHaveLength(30);
    expect(m.stickiness).toHaveLength(30);
    expect(m.totalUsers).toHaveLength(30);
    expect(m.events).toHaveLength(30);
  });

  it("all numeric outputs are non-negative", () => {
    const m = simulateCohorts(
      uniformArrivals(60, 200),
      60,
      12000,
      CHURNY,
      5,
      1,
    );
    expect(m.activeUsers.every((v) => v >= 0)).toBe(true);
    expect(m.newUsers.every((v) => v >= 0)).toBe(true);
    expect(m.churnedUsers.every((v) => v >= 0)).toBe(true);
    expect(m.reactivatedUsers.every((v) => v >= 0)).toBe(true);
    expect(m.events.every((v) => v >= 0)).toBe(true);
  });

  it("stickiness is null for t < 28", () => {
    const m = simulateCohorts(
      uniformArrivals(60, 100),
      60,
      6000,
      STICKY,
      10,
      42,
    );
    expect(m.stickiness.slice(0, 28).every((s) => s === null)).toBe(true);
  });

  it("stickiness is in [0, 1] for t >= 28", () => {
    const m = simulateCohorts(
      uniformArrivals(60, 100),
      60,
      6000,
      STICKY,
      10,
      42,
    );
    expect(
      m.stickiness.slice(28).every((s) => s !== null && s >= 0 && s <= 1),
    ).toBe(true);
  });

  it("totalUsers is monotonically non-decreasing", () => {
    const m = simulateCohorts(uniformArrivals(30, 100), 30, 3000, STICKY, 5, 7);
    for (let i = 1; i < m.totalUsers.length; i++) {
      expect(m.totalUsers[i]).toBeGreaterThanOrEqual(m.totalUsers[i - 1]);
    }
  });

  it("churny produces more total churn than addictive", () => {
    const arrivals = uniformArrivals(60, 500);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const churny = simulateCohorts(arrivals, 60, 30000, CHURNY, 5, 42);
    const addictive = simulateCohorts(arrivals, 60, 30000, ADDICTIVE, 5, 42);
    expect(sum(churny.churnedUsers)).toBeGreaterThan(
      sum(addictive.churnedUsers),
    );
  });

  it("addictive stickiness > sticky > churny (average over post-warmup)", () => {
    const avg = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null);
      return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    };
    const arrivals = uniformArrivals(60, 300);
    const churny = simulateCohorts(arrivals, 60, 18000, CHURNY, 5, 42);
    const sticky = simulateCohorts(arrivals, 60, 18000, STICKY, 5, 42);
    const addictive = simulateCohorts(arrivals, 60, 18000, ADDICTIVE, 5, 42);
    expect(avg(churny.stickiness)).toBeLessThan(avg(sticky.stickiness));
    expect(avg(sticky.stickiness)).toBeLessThan(avg(addictive.stickiness));
  });

  it("higher eventsPerActiveUser yields proportionally more events", () => {
    const arrivals = uniformArrivals(30, 100);
    const low = simulateCohorts(arrivals, 30, 3000, STICKY, 5, 42);
    const high = simulateCohorts(arrivals, 30, 3000, STICKY, 50, 42);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    expect(sum(high.events) / sum(low.events)).toBeGreaterThan(5);
  });

  it("deterministic: same seed same output", () => {
    const arrivals = uniformArrivals(30, 100);
    const a = simulateCohorts(arrivals, 30, 3000, STICKY, 10, 42);
    const b = simulateCohorts(arrivals, 30, 3000, STICKY, 10, 42);
    expect(a.activeUsers).toEqual(b.activeUsers);
    expect(a.churnedUsers).toEqual(b.churnedUsers);
  });

  it("different seeds produce different outputs", () => {
    const arrivals = uniformArrivals(30, 200);
    const a = simulateCohorts(arrivals, 30, 6000, STICKY, 5, 1);
    const b = simulateCohorts(arrivals, 30, 6000, STICKY, 5, 2);
    expect(a.activeUsers).not.toEqual(b.activeUsers);
  });

  it("works correctly at 1M-scale totalUsers", () => {
    const arrivals = uniformArrivals(90, 1_000_000 / 90);
    const m = simulateCohorts(arrivals, 90, 1_000_000, STICKY, 10, 42);
    expect(m.activeUsers[0]).toBeGreaterThan(0);
    expect(m.totalUsers[89]).toBeGreaterThan(100_000);
  });
});
