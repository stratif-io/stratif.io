import { describe, it, expect } from "vitest";
import { simulateUsers, SIM_CAP } from "../simulate";
import type { RetentionParams } from "../simulate";

const STICKY: RetentionParams = {
  peakChurnRate: 0.5,
  baseChurnRate: 0.05,
  churnDecayDays: 10,
  reactivationRate: 0.05,
  reactivationDecay: 0.8,
  maxDormantDays: 45,
};

const CHURNY: RetentionParams = {
  peakChurnRate: 0.9,
  baseChurnRate: 0.25,
  churnDecayDays: 5,
  reactivationRate: 0.02,
  reactivationDecay: 0.7,
  maxDormantDays: 20,
};

const uniformArrivals = (days: number, perDay: number) =>
  new Array(days).fill(perDay);

describe("simulateUsers", () => {
  it("returns at most SIM_CAP users", () => {
    const arrivals = new Array(90).fill(100_000 / 90);
    const users = simulateUsers(arrivals, 90, 100_000, STICKY, 42);
    expect(users.length).toBeLessThanOrEqual(SIM_CAP);
  });

  it("every user's joinDay is in [0, days-1]", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    users.forEach((u) => {
      expect(u.joinDay).toBeGreaterThanOrEqual(0);
      expect(u.joinDay).toBeLessThan(30);
    });
  });

  it("every user is active on their joinDay", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    users.forEach((u) => expect(u.activeDays[0]).toBe(u.joinDay));
  });

  it("reactivationDays are a subset of activeDays", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    const activeSet = new Set(
      users.flatMap((u) => u.activeDays.map((d) => `${u.id}:${d}`)),
    );
    users.forEach((u) =>
      u.reactivationDays.forEach((d) =>
        expect(activeSet.has(`${u.id}:${d}`)).toBe(true),
      ),
    );
  });

  it("churnDay is after all activeDays", () => {
    const arrivals = uniformArrivals(30, 10);
    const users = simulateUsers(arrivals, 30, 300, STICKY, 42);
    users.forEach((u) => {
      if (u.churnDay !== null && u.activeDays.length > 0) {
        expect(u.churnDay).toBeGreaterThan(u.activeDays.at(-1)!);
      }
    });
  });

  it("churny params produce more churned users than sticky params", () => {
    const arrivals = uniformArrivals(60, 10);
    const sticky = simulateUsers(arrivals, 60, 600, STICKY, 42);
    const churny = simulateUsers(arrivals, 60, 600, CHURNY, 42);
    const churned = (users: typeof sticky) =>
      users.filter((u) => u.churnDay !== null).length;
    expect(churned(churny)).toBeGreaterThan(churned(sticky));
  });

  it("deterministic: same seed same result", () => {
    const arrivals = uniformArrivals(30, 10);
    const a = simulateUsers(arrivals, 30, 300, STICKY, 42);
    const b = simulateUsers(arrivals, 30, 300, STICKY, 42);
    expect(a.map((u) => u.activeDays)).toEqual(b.map((u) => u.activeDays));
  });

  it("different seeds produce different results", () => {
    const arrivals = uniformArrivals(30, 10);
    const a = simulateUsers(arrivals, 30, 300, STICKY, 1);
    const b = simulateUsers(arrivals, 30, 300, STICKY, 2);
    expect(a.map((u) => u.activeDays.length)).not.toEqual(
      b.map((u) => u.activeDays.length),
    );
  });
});
