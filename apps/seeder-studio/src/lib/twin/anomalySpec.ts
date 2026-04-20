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
  color: string;
  effectFields: AnomalyEffectField[];
}

export const ANOMALY_SPEC: Record<string, AnomalyTypeSpec> = {
  marketing_campaign: {
    type: "marketing_campaign",
    label: "Marketing campaign",
    color: "#ef476f",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 2.0, min: 0.1, max: 20 },
    ],
  },
  product_launch: {
    type: "product_launch",
    label: "Product launch",
    color: "#ffb703",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 1.5, min: 0.1, max: 20 },
    ],
  },
  outage: {
    type: "outage",
    label: "Outage",
    color: "#d62828",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 0.2, min: 0, max: 1 },
    ],
  },
  feature_release: {
    type: "feature_release",
    label: "Feature release",
    color: "#4895ef",
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
    color: "#48cae4",
    effectFields: [
      { key: "arrivals", label: "arrivals ×", default: 1.4, min: 0.1, max: 10 },
    ],
  },
};

export function anomalyTypeColor(type: string): string {
  return ANOMALY_SPEC[type]?.color ?? "#888888";
}

export function defaultAnomaly(
  type: string,
  startDay: number,
  duration: number,
): SimulationAnomaly {
  const spec = ANOMALY_SPEC[type] ?? ANOMALY_SPEC.marketing_campaign;
  const effect: Record<string, number> = {};
  for (const f of spec.effectFields) effect[f.key] = f.default;
  return {
    type,
    name: `${type}_${startDay}`,
    start: `${startDay}d`,
    duration: `${duration}d`,
    effect,
  };
}
