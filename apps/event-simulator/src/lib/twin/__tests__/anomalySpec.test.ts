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

  it("every type has at least one configurable or fixed effect field", () => {
    for (const spec of Object.values(ANOMALY_SPEC)) {
      const hasEffect =
        spec.effectFields.length > 0 ||
        Object.keys(spec.fixedEffect ?? {}).length > 0;
      expect(hasEffect).toBe(true);
    }
  });

  it("defaultAnomaly returns a valid anomaly for a type", () => {
    const a = defaultAnomaly("marketing_campaign", "2025-01-01", "2025-01-11");
    expect(a.type).toBe("marketing_campaign");
    expect(a.start_date).toBe("2025-01-01");
    expect(a.end_date).toBe("2025-01-11");
    expect(a.effect.arrivals).toBeDefined();
  });

  it("anomalyTypeColor returns a CSS color string per type", () => {
    expect(anomalyTypeColor("marketing_campaign")).toMatch(
      /^hsl\(var\(--anomaly-/,
    );
    expect(anomalyTypeColor("unknown")).toBe("hsl(var(--muted-foreground))");
  });

  it("includes total_outage type", () => {
    expect(ANOMALY_SPEC["total_outage"]).toBeDefined();
  });

  it("total_outage has no user-configurable effect fields", () => {
    expect(ANOMALY_SPEC["total_outage"].effectFields).toHaveLength(0);
  });

  it("defaultAnomaly for total_outage has arrivals=0 in effect", () => {
    const a = defaultAnomaly("total_outage", "2025-01-06", "2025-01-09");
    expect(a.effect.arrivals).toBe(0);
    expect(a.effect.total_outage).toBeUndefined();
  });
});
