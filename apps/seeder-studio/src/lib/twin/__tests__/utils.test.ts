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
  it("returns the named tier defaults when no override is present", () => {
    expect(resolveScale("small", undefined)).toEqual({
      total_users: 10000,
      window_days: 90,
    });
  });
  it("applies overrides where set", () => {
    expect(resolveScale("small", { total_users: 5000 })).toEqual({
      total_users: 5000,
      window_days: 90,
    });
  });
  it("falls back to small when the axis value is unknown", () => {
    expect(resolveScale("nonesuch", undefined).total_users).toBe(10000);
  });
});
