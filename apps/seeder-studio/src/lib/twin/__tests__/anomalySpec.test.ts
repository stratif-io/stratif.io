import { describe, it, expect } from "vitest";
import { ANOMALY_SPEC, anomalyTypeColor, defaultAnomaly } from "../anomalySpec";

describe("ANOMALY_SPEC", () => {
  it("includes the core anomaly types", () => {
    for (const t of [
      "marketing_campaign",
      "product_launch",
      "outage",
      "feature_release",
      "seasonal",
    ]) {
      expect(ANOMALY_SPEC[t]).toBeDefined();
    }
  });

  it("every type declares its effect fields", () => {
    for (const spec of Object.values(ANOMALY_SPEC)) {
      expect(spec.effectFields.length).toBeGreaterThan(0);
    }
  });

  it("defaultAnomaly returns a valid anomaly for a type", () => {
    const a = defaultAnomaly("marketing_campaign", 0, 10);
    expect(a.type).toBe("marketing_campaign");
    expect(a.effect.arrivals).toBeDefined();
  });

  it("anomalyTypeColor returns a CSS color string per type", () => {
    expect(anomalyTypeColor("marketing_campaign")).toMatch(
      /^hsl\(var\(--anomaly-/,
    );
    expect(anomalyTypeColor("unknown")).toBe("hsl(var(--muted-foreground))");
  });
});
