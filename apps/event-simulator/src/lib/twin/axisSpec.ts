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
        value: "declining",
        label: "declining",
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
        value: "steady",
        label: "steady",
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
      {
        value: "explosive",
        label: "explosive",
        description: "Fast exponential growth — viral consumer app.",
        params: { shape: 2, rate: 0.08 },
      },
      {
        value: "seasonal",
        label: "seasonal",
        description: "Sinusoidal annual cycle — e-commerce / travel.",
        params: { shape: 4, rate: 0.01 },
      },
    ],
    default: "strong",
  },
  stickiness: {
    id: "stickiness",
    label: "Stickiness",
    description:
      "User retention profile: churn rate, reactivation probability, dormancy threshold.",
    values: [
      {
        value: "one_shot",
        label: "one_shot",
        description: "Near-total churn. Day-1 retention ~5%, no recovery.",
        params: {
          peakChurnRate: 0.97,
          baseChurnRate: 0.6,
          churnDecayDays: 2,
          reactivationRate: 0.005,
          reactivationDecay: 0.5,
          maxDormantDays: 7,
        },
      },
      {
        value: "churn_heavy",
        label: "churn_heavy",
        description: "High early churn, low reactivation. Day-7 retention ~8%.",
        params: {
          peakChurnRate: 0.75,
          baseChurnRate: 0.2,
          churnDecayDays: 4,
          reactivationRate: 0.02,
          reactivationDecay: 0.7,
          maxDormantDays: 20,
        },
      },
      {
        value: "normal",
        label: "normal",
        description: "Average retention. Day-7 retention ~15%.",
        params: {
          peakChurnRate: 0.5,
          baseChurnRate: 0.05,
          churnDecayDays: 10,
          reactivationRate: 0.05,
          reactivationDecay: 0.8,
          maxDormantDays: 45,
        },
      },
      {
        value: "sticky",
        label: "sticky",
        description: "Healthy retention. Day-7 retention ~30%.",
        params: {
          peakChurnRate: 0.25,
          baseChurnRate: 0.01,
          churnDecayDays: 14,
          reactivationRate: 0.1,
          reactivationDecay: 0.85,
          maxDormantDays: 90,
        },
      },
      {
        value: "addictive",
        label: "addictive",
        description: "Low churn, strong reactivation. Day-7 retention ~70%.",
        params: {
          peakChurnRate: 0.05,
          baseChurnRate: 0.001,
          churnDecayDays: 30,
          reactivationRate: 0.3,
          reactivationDecay: 0.95,
          maxDormantDays: 180,
        },
      },
      {
        value: "no_one_churns",
        label: "no_one_churns",
        description: "Virtually no churn. Day-7 retention ~99%.",
        params: {
          peakChurnRate: 0.001,
          baseChurnRate: 0.0001,
          churnDecayDays: 1,
          reactivationRate: 0.8,
          reactivationDecay: 0.99,
          maxDormantDays: 365,
        },
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
      {
        value: "ad_supported",
        label: "ad_supported",
        description: "",
        params: {},
      },
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
        value: "none",
        label: "none",
        description: "k = 0 — purely organic, no viral loop.",
        params: { k: 0 },
      },
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
      { value: "eu_only", label: "eu_only", description: "", params: {} },
      { value: "us_only", label: "us_only", description: "", params: {} },
    ],
    default: "global",
  },
  noise: {
    id: "noise",
    label: "Anomalies",
    description: "Noise level applied to all four KPI curves.",
    values: [
      {
        value: "none",
        label: "none",
        description: "σ = 0 — perfectly smooth curves.",
        params: { sigma: 0 },
      },
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
  daily_pattern: {
    id: "daily_pattern",
    label: "Daily Pattern",
    description: "Hour-of-day activity distribution.",
    values: [
      {
        value: "business_hours",
        label: "business_hours",
        description: "Peak 09:00–18:00, low at night.",
        params: {},
      },
      {
        value: "evening_peak",
        label: "evening_peak",
        description: "Peak 18:00–23:00.",
        params: {},
      },
      {
        value: "always_on",
        label: "always_on",
        description: "Flat 24h — no time-of-day preference.",
        params: {},
      },
      {
        value: "night_owl",
        label: "night_owl",
        description: "Peak 22:00–03:00.",
        params: {},
      },
    ],
    default: "evening_peak",
  },
  weekly_pattern: {
    id: "weekly_pattern",
    label: "Weekly Pattern",
    description: "Day-of-week activity distribution.",
    values: [
      {
        value: "weekdays_only",
        label: "weekdays_only",
        description: "Mon–Fri heavy, weekends near-zero.",
        params: {},
      },
      {
        value: "weekends_heavy",
        label: "weekends_heavy",
        description: "Saturday and Sunday heaviest.",
        params: {},
      },
      {
        value: "flat",
        label: "flat",
        description: "Uniform across all days.",
        params: {},
      },
    ],
    default: "flat",
  },
  monthly_seasonality: {
    id: "monthly_seasonality",
    label: "Seasonality",
    description: "Month-of-year multiplier applied to arrivals.",
    values: [
      {
        value: "nov_dec_peak",
        label: "nov_dec_peak",
        description: "Christmas / holiday apps — Nov–Dec spike.",
        params: {},
      },
      {
        value: "q4_heavy",
        label: "q4_heavy",
        description: "Retail / ecommerce — Q4 growth ramp.",
        params: {},
      },
      {
        value: "summer_peak",
        label: "summer_peak",
        description: "Travel / outdoor — Jun–Aug peak.",
        params: {},
      },
      {
        value: "flat",
        label: "flat",
        description: "No monthly variation.",
        params: {},
      },
    ],
    default: "flat",
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

/** Fill in any missing axes using the defaults declared in AXIS_SPEC. */
export function resolveAxes(
  axes: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = { ...axes };
  for (const [id, def] of Object.entries(AXIS_SPEC)) {
    if (!resolved[id]) resolved[id] = def.default;
  }
  return resolved;
}
