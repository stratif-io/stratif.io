import type { SimulationAnomaly } from "@/types/simulation";

export interface AnomalyEffectField {
  key: string;
  label: string;
  default: number;
  min?: number;
  max?: number;
}

export interface AnomalyTypeSpec {
  type: string;
  label: string;
  cssVar: string;
  effectFields: AnomalyEffectField[];
}

export const ANOMALY_SPEC: Record<string, AnomalyTypeSpec> = {
  marketing_campaign: {
    type: "marketing_campaign",
    label: "Marketing campaign",
    cssVar: "--anomaly-marketing-campaign",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 2.0, min: 0.1, max: 20 },
    ],
  },
  product_launch: {
    type: "product_launch",
    label: "Product launch",
    cssVar: "--anomaly-product-launch",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 1.5, min: 0.1, max: 20 },
    ],
  },
  outage: {
    type: "outage",
    label: "Outage",
    cssVar: "--anomaly-outage",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 0.2, min: 0, max: 1 },
    ],
  },
  feature_release: {
    type: "feature_release",
    label: "Feature release",
    cssVar: "--anomaly-feature-release",
    effectFields: [
      {
        key: "arrivals",
        label: "arrivals ×",
        default: 1.25,
        min: 0.1,
        max: 10,
      },
    ],
  },
  seasonal: {
    type: "seasonal",
    label: "Seasonal",
    cssVar: "--anomaly-seasonal",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 1.4, min: 0.1, max: 10 },
    ],
  },
  total_outage: {
    type: "total_outage",
    label: "Total outage",
    cssVar: "--anomaly-total-outage",
    effectFields: [],
  },
};

export function anomalyTypeColor(type: string): string {
  const spec = ANOMALY_SPEC[type];
  return spec ? `hsl(var(${spec.cssVar}))` : "hsl(var(--muted-foreground))";
}

export function defaultAnomaly(
  type: string,
  startDay: number,
  duration: number,
): SimulationAnomaly {
  const spec = ANOMALY_SPEC[type] ?? ANOMALY_SPEC.marketing_campaign;
  const effect: Record<string, number> = {};
  for (const f of spec.effectFields) effect[f.key] = f.default;
  if (type === "total_outage") {
    effect.total_outage = 1;
    effect.arrivals = 0;
  }
  return {
    type,
    name: `${type}_${startDay}`,
    start: `${startDay}d`,
    duration: `${duration}d`,
    effect,
  };
}
