import { describe, it, expect } from "vitest";
import { pixelToIndex } from "../rangeBrushMath";

describe("pixelToIndex", () => {
  it("maps 0 to index 0", () => {
    expect(pixelToIndex(0, 200, 10)).toBe(0);
  });

  it("maps full track width to last index", () => {
    expect(pixelToIndex(200, 200, 10)).toBe(9);
  });

  it("maps midpoint to middle index", () => {
    // 100/200 * 9 = 4.5 → rounds to 5
    expect(pixelToIndex(100, 200, 10)).toBe(5);
  });

  it("clamps negative pixels to 0", () => {
    expect(pixelToIndex(-50, 200, 10)).toBe(0);
  });

  it("clamps beyond track width to last index", () => {
    expect(pixelToIndex(300, 200, 10)).toBe(9);
  });

  it("returns 0 for count of 1", () => {
    expect(pixelToIndex(100, 200, 1)).toBe(0);
  });

  it("returns 0 for zero track width", () => {
    expect(pixelToIndex(100, 0, 10)).toBe(0);
  });
});
