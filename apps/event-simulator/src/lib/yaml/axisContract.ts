/**
 * Single source of truth for valid axis values.
 *
 * The Python equivalent lives at:
 *   seeders/simulator/axes/contract.py
 *
 * When adding or removing values here, update that file too.
 */

export const GROWTH_VALUES = [
  "explosive",
  "strong",
  "steady",
  "flat",
  "declining",
  "seasonal",
  "hockey_stick",
] as const;

export const STICKINESS_VALUES = [
  "addictive",
  "sticky",
  "normal",
  "churn_heavy",
  "one_shot",
] as const;

export const ENGAGEMENT_DEPTH_VALUES = ["shallow", "medium", "deep"] as const;

export const VIRALITY_VALUES = [
  "none",
  "weak",
  "moderate",
  "strong_viral",
] as const;

export const SCALE_VALUES = ["tiny", "small", "medium", "large"] as const;

export const ANOMALIES_VALUES = [
  "none",
  "clean",
  "moderate",
  "campaigns",
  "outages",
  "ab_tests",
  "full",
  "explicit",
] as const;

export const MONETIZATION_VALUES = [
  "one_off_purchase",
  "subscription",
  "iap_whales",
  "ad_supported",
  "freemium",
  "marketplace_fee",
] as const;

export const GEOGRAPHY_VALUES = [
  "global",
  "us_only",
  "eu_only",
  "apac_only",
] as const;

export const DAILY_PATTERN_VALUES = [
  "business_hours",
  "evening_peak",
  "always_on",
  "night_owl",
] as const;

export const WEEKLY_PATTERN_VALUES = [
  "weekdays_only",
  "weekends_heavy",
  "flat",
] as const;

export const MONTHLY_SEASONALITY_VALUES = [
  "nov_dec_peak",
  "q4_heavy",
  "summer_peak",
  "flat",
] as const;

export type GrowthValue = (typeof GROWTH_VALUES)[number];
export type StickinessValue = (typeof STICKINESS_VALUES)[number];
export type EngagementDepthValue = (typeof ENGAGEMENT_DEPTH_VALUES)[number];
export type ViralityValue = (typeof VIRALITY_VALUES)[number];
export type ScaleValue = (typeof SCALE_VALUES)[number];
export type AnomaliesValue = (typeof ANOMALIES_VALUES)[number];
export type MonetizationValue = (typeof MONETIZATION_VALUES)[number];
export type GeographyValue = (typeof GEOGRAPHY_VALUES)[number];
export type DailyPatternValue = (typeof DAILY_PATTERN_VALUES)[number];
export type WeeklyPatternValue = (typeof WEEKLY_PATTERN_VALUES)[number];
export type MonthlySeasonalityValue =
  (typeof MONTHLY_SEASONALITY_VALUES)[number];

export const AXIS_VALUES = {
  growth: GROWTH_VALUES,
  stickiness: STICKINESS_VALUES,
  engagement_depth: ENGAGEMENT_DEPTH_VALUES,
  virality: VIRALITY_VALUES,
  scale: SCALE_VALUES,
  anomalies: ANOMALIES_VALUES,
  monetization: MONETIZATION_VALUES,
  geography: GEOGRAPHY_VALUES,
  daily_pattern: DAILY_PATTERN_VALUES,
  weekly_pattern: WEEKLY_PATTERN_VALUES,
  monthly_seasonality: MONTHLY_SEASONALITY_VALUES,
} as const;
