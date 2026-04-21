import { describe, it, expect } from "vitest";
import { resolveDateRange } from "../dateRange";

const TODAY = new Date(2026, 3, 20); // Apr 20 2026

describe("resolveDateRange", () => {
  it("both null → end = today (date-truncated), start = today − (days-1)", () => {
    const { start, end } = resolveDateRange(null, null, 30, TODAY);
    expect(end).toEqual(new Date(2026, 3, 20));
    expect(start).toEqual(new Date(2026, 2, 22)); // 29 days before Apr 20
  });

  it("end set, start null → start = end − (days-1)", () => {
    const { start, end } = resolveDateRange(null, "2026-04-10", 7, TODAY);
    expect(end).toEqual(new Date(2026, 3, 10));
    expect(start).toEqual(new Date(2026, 3, 4)); // 6 days before Apr 10
  });

  it("start set, end null → end = today, start = user date literal", () => {
    const { start, end } = resolveDateRange("2026-01-01", null, 30, TODAY);
    expect(end).toEqual(new Date(2026, 3, 20));
    expect(start).toEqual(new Date(2026, 0, 1));
  });

  it("both set → both literal", () => {
    const { start, end } = resolveDateRange(
      "2026-01-01",
      "2026-03-31",
      30,
      TODAY,
    );
    expect(start).toEqual(new Date(2026, 0, 1));
    expect(end).toEqual(new Date(2026, 2, 31));
  });

  it("windowDays = 1 → start = end (single day)", () => {
    const { start, end } = resolveDateRange(null, "2026-04-20", 1, TODAY);
    expect(start).toEqual(new Date(2026, 3, 20));
    expect(end).toEqual(new Date(2026, 3, 20));
  });

  it("partial/invalid start date → falls back to windowDays offset, no crash", () => {
    const { start, end } = resolveDateRange("2024-0", null, 7, TODAY);
    expect(end).toEqual(new Date(2026, 3, 20));
    expect(start).toEqual(new Date(2026, 3, 14)); // 6 days before today
    expect(isNaN(start.getTime())).toBe(false);
    expect(isNaN(end.getTime())).toBe(false);
  });

  it("partial/invalid end date → falls back to today", () => {
    const { end } = resolveDateRange(null, "2024-0", 7, TODAY);
    expect(end).toEqual(new Date(2026, 3, 20));
    expect(isNaN(end.getTime())).toBe(false);
  });
});
