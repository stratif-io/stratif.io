import { describe, it, expect } from "vitest";
import { dauFromArrivals } from "../retention";

describe("dauFromArrivals", () => {
  it("length equals arrivals.length", () => {
    const arrivals = [100, 100, 100, 100];
    expect(dauFromArrivals(arrivals, "sticky")).toHaveLength(4);
  });

  it("addictive stickiness yields strictly higher DAU than churny over time", () => {
    const arrivals = new Array(90).fill(200);
    const stickyDau = dauFromArrivals(arrivals, "sticky");
    const churnyDau = dauFromArrivals(arrivals, "churny");
    const addictiveDau = dauFromArrivals(arrivals, "addictive");
    expect(stickyDau[89]).toBeGreaterThan(churnyDau[89]);
    expect(addictiveDau[89]).toBeGreaterThan(stickyDau[89]);
  });

  it("all values non-negative", () => {
    const arrivals = [1000, 0, 0, 0, 0];
    const dau = dauFromArrivals(arrivals, "sticky");
    expect(dau.every((v) => v >= 0)).toBe(true);
  });

  it("DAU decays when arrivals stop", () => {
    const arrivals = [1000, 0, 0, 0, 0, 0, 0];
    const dau = dauFromArrivals(arrivals, "sticky");
    for (let i = 1; i < dau.length; i++)
      expect(dau[i]).toBeLessThanOrEqual(dau[i - 1]);
  });
});
