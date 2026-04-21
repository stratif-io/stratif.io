export interface AxisEnumValue {
  value: string;
  label: string;
  description: string;
  params: Record<string, number>;
}

export interface AxisDefinition {
  id: string;
  label: string;
  description: string;
  values: AxisEnumValue[];
  default: string;
}

export const AXIS_SPEC: Record<string, AxisDefinition> = {
  growth: {
    id: "growth",
    label: "Growth",
    description: "Shape of the new-user arrival curve.",
    values: [
      {
        value: "decline",
        label: "decline",
        description: "Arrivals decay over time.",
        params: { shape: 0, rate: -0.01 },
      },
      {
        value: "flat",
        label: "flat",
        description: "Constant acquisition — no growth, no decline.",
        params: { shape: 0, rate: 0 },
      },
      {
        value: "weak",
        label: "weak",
        description: "Slow linear growth.",
        params: { shape: 1, rate: 0.005 },
      },
      {
        value: "strong",
        label: "strong",
        description: "Moderate exponential growth.",
        params: { shape: 2, rate: 0.02 },
      },
      {
        value: "hockey_stick",
        label: "hockey_stick",
        description:
          "Flat region, then a sharp blade after the inflection point.",
        params: { shape: 3, split_fraction: 0.3, rate: 0.04 },
      },
    ],
    default: "strong",
  },
  stickiness: {
    id: "stickiness",
    label: "Stickiness",
    description: "How likely a user is to return.",
    values: [
      {
        value: "churny",
        label: "churny",
        description: "Low retention; DAU/MAU around 0.12.",
        params: { dau_mau_target: 0.12, retention_day: 0.55 },
      },
      {
        value: "sticky",
        label: "sticky",
        description: "Moderate retention; DAU/MAU around 0.30.",
        params: { dau_mau_target: 0.3, retention_day: 0.8 },
      },
      {
        value: "addictive",
        label: "addictive",
        description: "Heavy return; DAU/MAU around 0.55.",
        params: { dau_mau_target: 0.55, retention_day: 0.93 },
      },
    ],
    default: "sticky",
  },
  engagement_depth: {
    id: "engagement_depth",
    label: "Depth",
    description: "Events emitted per active user per day.",
    values: [
      {
        value: "shallow",
        label: "shallow",
        description: "~3 events per active user per day.",
        params: { events_per_user: 3 },
      },
      {
        value: "medium",
        label: "medium",
        description: "~10 events per active user per day.",
        params: { events_per_user: 10 },
      },
      {
        value: "deep",
        label: "deep",
        description: "~25 events per active user per day.",
        params: { events_per_user: 25 },
      },
    ],
    default: "medium",
  },
  monetization: {
    id: "monetization",
    label: "Monetization",
    description:
      "Revenue model. Categorical — does not affect the twin output.",
    values: [
      { value: "ads", label: "ads", description: "", params: {} },
      { value: "freemium", label: "freemium", description: "", params: {} },
      {
        value: "subscription",
        label: "subscription",
        description: "",
        params: {},
      },
      { value: "iap_whales", label: "iap_whales", description: "", params: {} },
    ],
    default: "subscription",
  },
  virality: {
    id: "virality",
    label: "Virality",
    description: "Existing-user-driven arrivals (k-factor).",
    values: [
      {
        value: "weak",
        label: "weak",
        description: "k ≈ 0.1.",
        params: { k: 0.1 },
      },
      {
        value: "moderate",
        label: "moderate",
        description: "k ≈ 0.5.",
        params: { k: 0.5 },
      },
      {
        value: "strong_viral",
        label: "strong_viral",
        description: "k ≈ 1.2.",
        params: { k: 1.2 },
      },
    ],
    default: "weak",
  },
  scale: {
    id: "scale",
    label: "Scale",
    description: "Baseline user volume and window size.",
    values: [
      {
        value: "tiny",
        label: "tiny",
        description: "1k users / 30d.",
        params: { total_users: 1000, window_days: 30 },
      },
      {
        value: "small",
        label: "small",
        description: "10k / 90d.",
        params: { total_users: 10000, window_days: 90 },
      },
      {
        value: "medium",
        label: "medium",
        description: "100k / 180d.",
        params: { total_users: 100000, window_days: 180 },
      },
      {
        value: "large",
        label: "large",
        description: "1M / 365d.",
        params: { total_users: 1000000, window_days: 365 },
      },
    ],
    default: "small",
  },
  geography: {
    id: "geography",
    label: "Geography",
    description:
      "Timezone distribution. Categorical — does not affect the twin output.",
    values: [
      { value: "global", label: "global", description: "", params: {} },
      { value: "regional", label: "regional", description: "", params: {} },
      { value: "local", label: "local", description: "", params: {} },
    ],
    default: "global",
  },
  anomalies: {
    id: "anomalies",
    label: "Anomalies",
    description: "Noise level applied to all four KPI curves.",
    values: [
      {
        value: "clean",
        label: "clean",
        description: "σ ≈ 2%.",
        params: { sigma: 0.02 },
      },
      {
        value: "moderate",
        label: "moderate",
        description: "σ ≈ 5%.",
        params: { sigma: 0.05 },
      },
      {
        value: "explicit",
        label: "explicit",
        description: "σ ≈ 10%.",
        params: { sigma: 0.1 },
      },
    ],
    default: "moderate",
  },
};

export function getAxis(id: string): AxisDefinition | undefined {
  return AXIS_SPEC[id];
}

export function getAxisValue(
  axisId: string,
  value: string,
): AxisEnumValue | undefined {
  return AXIS_SPEC[axisId]?.values.find((v) => v.value === value);
}
