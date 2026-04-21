import { describe, it, expect } from "vitest";
import { createRng, poissonDraw } from "../rng";

describe("createRng", () => {
  it("returns same first value for same seed", () => {
    expect(createRng(42)()).toBe(createRng(42)());
  });

  it("returns values in [0, 1)", () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it("sequential calls advance state", () => {
    const rng = createRng(42);
    const a = rng();
    const b = rng();
    expect(a).not.toBe(b);
  });
});

describe("poissonDraw", () => {
  it("returns 0 for lambda <= 0", () => {
    const rng = createRng(1);
    expect(poissonDraw(0, rng)).toBe(0);
    expect(poissonDraw(-5, rng)).toBe(0);
  });

  it("returns non-negative integers", () => {
    const rng = createRng(42);
    for (let i = 0; i < 200; i++) {
      const v = poissonDraw(10, rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("mean of large sample is close to lambda (small lambda)", () => {
    const rng = createRng(1);
    const N = 5000;
    const lambda = 5;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += poissonDraw(lambda, rng);
    expect(sum / N).toBeCloseTo(lambda, 0);
  });

  it("mean of large sample is close to lambda (large lambda)", () => {
    const rng = createRng(1);
    const N = 2000;
    const lambda = 1000;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += poissonDraw(lambda, rng);
    expect(sum / N).toBeCloseTo(lambda, -1);
  });

  it("deterministic: same rng state same draw", () => {
    expect(poissonDraw(7, createRng(99))).toBe(poissonDraw(7, createRng(99)));
  });
});
