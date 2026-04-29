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
      "noise",
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
    expect(v?.params.peakChurnRate).toBeDefined();
  });
});

describe("stickiness axis RetentionParams", () => {
  it("every stickiness value has required RetentionParams fields", () => {
    const required = [
      "peakChurnRate",
      "baseChurnRate",
      "churnDecayDays",
      "reactivationRate",
      "reactivationDecay",
      "maxDormantDays",
    ];
    const values = AXIS_SPEC.stickiness.values;
    values.forEach((v) => {
      required.forEach((key) => {
        expect(v.params).toHaveProperty(key);
        expect(typeof (v.params as Record<string, unknown>)[key]).toBe(
          "number",
        );
      });
    });
  });

  it("churny has higher peakChurnRate than addictive", () => {
    const churny = getAxisValue("stickiness", "churn_heavy")!.params as Record<
      string,
      number
    >;
    const addictive = getAxisValue("stickiness", "addictive")!.params as Record<
      string,
      number
    >;
    expect(churny.peakChurnRate).toBeGreaterThan(addictive.peakChurnRate);
  });

  it("addictive has higher reactivationRate than churny", () => {
    const churny = getAxisValue("stickiness", "churn_heavy")!.params as Record<
      string,
      number
    >;
    const addictive = getAxisValue("stickiness", "addictive")!.params as Record<
      string,
      number
    >;
    expect(addictive.reactivationRate).toBeGreaterThan(churny.reactivationRate);
  });
});
