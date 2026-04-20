import { describe, it, expect } from "vitest";
import { AXIS_SPEC, getAxis, getAxisValue } from "../axisSpec";

describe("AXIS_SPEC", () => {
  it("defines all 8 axes with at least one value each", () => {
    const required = [
      "growth",
      "stickiness",
      "engagement_depth",
      "monetization",
      "virality",
      "scale",
      "geography",
      "anomalies",
    ];
    for (const id of required) {
      expect(AXIS_SPEC[id]).toBeDefined();
      expect(AXIS_SPEC[id].values.length).toBeGreaterThan(0);
    }
  });

  it("every axis has a default that is one of its values", () => {
    for (const axis of Object.values(AXIS_SPEC)) {
      expect(axis.values.map((v) => v.value)).toContain(axis.default);
    }
  });

  it("getAxis returns the axis definition or undefined", () => {
    expect(getAxis("growth")?.id).toBe("growth");
    expect(getAxis("nonesuch")).toBeUndefined();
  });

  it("getAxisValue returns the full value entry", () => {
    const v = getAxisValue("stickiness", "addictive");
    expect(v?.params.dau_mau_target).toBeGreaterThan(0.4);
  });
});
