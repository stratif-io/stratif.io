import { describe, it, expect } from "vitest";
import { seededRandom, parseDays, resolveScale } from "../utils";

describe("seededRandom", () => {
  it("returns a reproducible sequence for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("returns different sequences for different seeds", () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
  it("always returns a value in [0, 1)", () => {
    const r = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("parseDays", () => {
  it("parses positive and negative day offsets", () => {
    expect(parseDays("10d")).toBe(10);
    expect(parseDays("-130d")).toBe(-130);
  });
  it("returns null for garbage", () => {
    expect(parseDays("abc")).toBeNull();
  });
});

describe("resolveScale", () => {
  it("returns goal mode with named tier defaults when no override is present", () => {
    expect(resolveScale("small", undefined)).toEqual({
      mode: "goal",
      total_users: 10000,
      window_days: 90,
    });
  });
  it("applies total_users override in goal mode", () => {
    expect(resolveScale("small", { total_users: 5000 })).toEqual({
      mode: "goal",
      total_users: 5000,
      window_days: 90,
    });
  });
  it("falls back to small when the axis value is unknown", () => {
    const result = resolveScale("nonesuch", undefined);
    expect(result.mode).toBe("goal");
    if (result.mode === "goal") {
      expect(result.total_users).toBe(10000);
    }
  });
  it("returns rate mode when starting_rate is set", () => {
    expect(resolveScale("small", { starting_rate: 50 })).toEqual({
      mode: "rate",
      starting_rate: 50,
      window_days: 90,
    });
  });
  it("rate mode respects window_days override", () => {
    expect(
      resolveScale("small", { starting_rate: 100, window_days: 30 }),
    ).toEqual({
      mode: "rate",
      starting_rate: 100,
      window_days: 30,
    });
  });
  it("starting_rate takes precedence over total_users when both set", () => {
    const result = resolveScale("small", {
      starting_rate: 75,
      total_users: 9999,
    });
    expect(result.mode).toBe("rate");
    if (result.mode === "rate") {
      expect(result.starting_rate).toBe(75);
    }
  });
});
