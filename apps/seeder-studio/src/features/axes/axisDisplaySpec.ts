export interface AxisDisplayValue {
  value: string;
  label: string;
  description: string;
  sparkPoints: string; // SVG polyline points for a 52×28 viewBox
}

export interface AxisDisplay {
  id: string;
  label: string; // short chip header label
  values: AxisDisplayValue[];
}

export const AXIS_DISPLAY: Record<string, AxisDisplay> = {
  growth: {
    id: "growth",
    label: "growth",
    values: [
      {
        value: "decline",
        label: "Decline",
        description: "Losing users — churn exceeds acquisition",
        sparkPoints: "0,4 14,8 28,14 40,20 52,26",
      },
      {
        value: "flat",
        label: "Flat",
        description: "Constant acquisition — no growth, no decline",
        sparkPoints: "0,14 14,14 28,14 40,14 52,14",
      },
      {
        value: "weak",
        label: "Weak growth",
        description: "Slow, linear — early-stage or niche product",
        sparkPoints: "0,26 14,24 28,21 40,18 52,15",
      },
      {
        value: "strong",
        label: "Strong growth",
        description: "Steady exponential rise throughout the window",
        sparkPoints: "0,26 12,22 24,16 36,9 52,4",
      },
      {
        value: "hockey_stick",
        label: "Hockey stick",
        description: "Flat early, then explosive — typical B2B/PLG",
        sparkPoints: "0,24 14,23 24,22 32,20 36,14 42,8 52,3",
      },
    ],
  },
  stickiness: {
    id: "stickiness",
    label: "retention",
    values: [
      {
        value: "churny",
        label: "High churn",
        description: "Users leave fast — DAU/MAU ≈ 12%",
        sparkPoints: "0,5 6,12 14,20 24,25 52,27",
      },
      {
        value: "sticky",
        label: "Sticky",
        description: "Healthy retention — DAU/MAU ≈ 30%",
        sparkPoints: "0,5 8,9 18,14 30,18 52,20",
      },
      {
        value: "addictive",
        label: "Addictive",
        description: "Users keep coming back — DAU/MAU ≈ 55%",
        sparkPoints: "0,5 10,6 22,8 36,10 52,11",
      },
    ],
  },
  engagement_depth: {
    id: "engagement_depth",
    label: "engagement",
    values: [
      {
        value: "shallow",
        label: "Light usage",
        description: "~3 events per active user per day",
        sparkPoints: "0,22 26,22 52,22",
      },
      {
        value: "medium",
        label: "Medium usage",
        description: "~10 events per active user per day",
        sparkPoints: "0,14 26,14 52,14",
      },
      {
        value: "deep",
        label: "Heavy usage",
        description: "~25 events per active user per day",
        sparkPoints: "0,6 26,6 52,6",
      },
    ],
  },
  virality: {
    id: "virality",
    label: "virality",
    values: [
      {
        value: "weak",
        label: "No word-of-mouth",
        description: "Growth purely from acquisition channels (k ≈ 0.1)",
        sparkPoints: "0,26 16,22 32,18 52,14",
      },
      {
        value: "moderate",
        label: "Some word-of-mouth",
        description: "Each active user brings ~0.5 new users/day",
        sparkPoints: "0,26 12,20 24,14 36,9 52,5",
      },
      {
        value: "strong_viral",
        label: "Goes viral",
        description: "Each active user brings ~1.2 new users/day — explosive",
        sparkPoints: "0,26 6,24 10,20 14,14 18,8 22,3 28,1 52,1",
      },
    ],
  },
  scale: {
    id: "scale",
    label: "scale",
    values: [
      {
        value: "tiny",
        label: "Indie",
        description: "1k users / 30 days",
        sparkPoints: "0,26 26,26 52,26",
      },
      {
        value: "small",
        label: "Startup",
        description: "10k users / 90 days",
        sparkPoints: "0,20 26,18 52,16",
      },
      {
        value: "medium",
        label: "Growth co.",
        description: "100k users / 180 days",
        sparkPoints: "0,16 26,10 52,6",
      },
      {
        value: "large",
        label: "Unicorn",
        description: "1M users / 365 days",
        sparkPoints: "0,26 12,18 24,10 36,5 52,2",
      },
    ],
  },
  anomalies: {
    id: "anomalies",
    label: "noise",
    values: [
      {
        value: "clean",
        label: "Clean",
        description: "Very smooth curves — minimal variance (σ ≈ 2%)",
        sparkPoints: "0,14 13,14 26,14 39,14 52,14",
      },
      {
        value: "moderate",
        label: "Some noise",
        description: "Mild daily variance — realistic (σ ≈ 5%)",
        sparkPoints:
          "0,14 4,12 8,16 12,13 16,15 20,12 24,15 28,13 32,15 36,12 40,14 44,16 48,13 52,14",
      },
      {
        value: "explicit",
        label: "Noisy",
        description: "High daily variance — raw feel (σ ≈ 10%)",
        sparkPoints:
          "0,14 4,8 8,20 12,10 16,18 20,9 24,19 28,11 32,17 36,8 40,18 44,10 48,20 52,12",
      },
    ],
  },
};

export const STRIP_AXIS_IDS = [
  "growth",
  "stickiness",
  "engagement_depth",
  "virality",
  "scale",
  "anomalies",
] as const;
