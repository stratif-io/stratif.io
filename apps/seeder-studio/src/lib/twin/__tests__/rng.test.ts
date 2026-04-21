import { describe, it, expect } from "vitest";
import { createRng } from "../rng";

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
