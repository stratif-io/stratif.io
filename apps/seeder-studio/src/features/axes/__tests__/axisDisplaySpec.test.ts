import { describe, it, expect } from "vitest";
import { AXIS_DISPLAY, STRIP_AXIS_IDS } from "../axisDisplaySpec";
import { AXIS_SPEC } from "@/lib/twin";

describe("AXIS_DISPLAY", () => {
  it("covers exactly the 6 strip axes", () => {
    expect(STRIP_AXIS_IDS).toEqual([
      "growth",
      "stickiness",
      "engagement_depth",
      "virality",
      "scale",
      "anomalies",
    ]);
  });

  it("every strip axis has a display entry", () => {
    for (const id of STRIP_AXIS_IDS) {
      expect(AXIS_DISPLAY[id]).toBeDefined();
    }
  });

  it("every display value matches a value in AXIS_SPEC", () => {
    for (const id of STRIP_AXIS_IDS) {
      const specValues = AXIS_SPEC[id].values.map((v) => v.value);
      for (const dv of AXIS_DISPLAY[id].values) {
        expect(specValues).toContain(dv.value);
      }
    }
  });

  it("every AXIS_SPEC value for strip axes has a display entry", () => {
    for (const id of STRIP_AXIS_IDS) {
      const displayValues = AXIS_DISPLAY[id].values.map((v) => v.value);
      for (const sv of AXIS_SPEC[id].values) {
        expect(displayValues).toContain(sv.value);
      }
    }
  });

  it("no display label contains raw code values (jargon check)", () => {
    const jargon = [
      "churny",
      "addictive",
      "hockey_stick",
      "strong_viral",
      "explicit",
      "shallow",
    ];
    for (const id of STRIP_AXIS_IDS) {
      for (const dv of AXIS_DISPLAY[id].values) {
        for (const j of jargon) {
          expect(dv.label).not.toBe(j);
        }
      }
    }
  });

  it("every display value has a non-empty sparkPoints string", () => {
    for (const id of STRIP_AXIS_IDS) {
      for (const dv of AXIS_DISPLAY[id].values) {
        expect(dv.sparkPoints.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
