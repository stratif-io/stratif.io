import { describe, it, expect } from "vitest";
import { formatNum } from "../format";

describe("formatNum", () => {
  it("formats ratios (< 1) to 2 decimal places", () => {
    expect(formatNum(0)).toBe("0.00");
    expect(formatNum(0.5)).toBe("0.50");
    expect(formatNum(0.35)).toBe("0.35");
    expect(formatNum(0.999)).toBe("1.00");
  });

  it("formats integers in [1, 999] as rounded integers", () => {
    expect(formatNum(1)).toBe("1");
    expect(formatNum(847)).toBe("847");
    expect(formatNum(999)).toBe("999");
    expect(formatNum(1.7)).toBe("2");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNum(1000)).toBe("1K");
    expect(formatNum(1500)).toBe("1.5K");
    expect(formatNum(12400)).toBe("12.4K");
  });

  it("promotes near-million values to M to avoid 1000K", () => {
    expect(formatNum(999_999)).toBe("1M");
    expect(formatNum(999_950)).toBe("1M");
  });

  it("formats millions with M suffix", () => {
    expect(formatNum(1_000_000)).toBe("1M");
    expect(formatNum(3_200_000)).toBe("3.2M");
    expect(formatNum(10_500_000)).toBe("10.5M");
  });

  it("handles negative values correctly including negative ratios", () => {
    expect(formatNum(-500)).toBe("-500");
    expect(formatNum(-1500)).toBe("-1.5K");
    expect(formatNum(-0.5)).toBe("-0.50");
  });
});
