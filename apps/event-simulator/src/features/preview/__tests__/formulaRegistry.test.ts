import { describe, it, expect } from "vitest";
import { FORMULA_REGISTRY } from "../formulaRegistry";

const EXPECTED_KEYS = [
  "events",
  "activeUsers",
  "newUsers",
  "stickiness",
  "totalUsers",
  "churnedUsers",
  "reactivatedUsers",
] as const;

describe("FORMULA_REGISTRY", () => {
  it("contains all 7 metrics", () => {
    for (const key of EXPECTED_KEYS) {
      expect(FORMULA_REGISTRY[key]).toBeDefined();
    }
  });

  it("every entry has latex, explanation, and variables", () => {
    for (const entry of Object.values(FORMULA_REGISTRY)) {
      expect(typeof entry.latex).toBe("string");
      expect(entry.latex.length).toBeGreaterThan(0);
      expect(typeof entry.explanation).toBe("string");
      expect(entry.explanation.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.variables)).toBe(true);
      expect(entry.variables.length).toBeGreaterThan(0);
    }
  });

  it("every variable entry has symbol and meaning", () => {
    for (const entry of Object.values(FORMULA_REGISTRY)) {
      for (const v of entry.variables) {
        expect(typeof v.symbol).toBe("string");
        expect(typeof v.meaning).toBe("string");
      }
    }
  });
});
