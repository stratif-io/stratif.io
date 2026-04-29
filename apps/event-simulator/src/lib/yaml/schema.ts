import { z } from "zod";
import {
  GROWTH_VALUES,
  STICKINESS_VALUES,
  ENGAGEMENT_DEPTH_VALUES,
  VIRALITY_VALUES,
  SCALE_VALUES,
  NOISE_VALUES,
  MONETIZATION_VALUES,
  GEOGRAPHY_VALUES,
  WEEKLY_PATTERN_VALUES,
  MONTHLY_SEASONALITY_VALUES,
} from "./axisContract";

export const AxesSchema = z.object({
  growth: z.enum(GROWTH_VALUES).optional().catch(undefined),
  stickiness: z.enum(STICKINESS_VALUES).optional().catch(undefined),
  engagement_depth: z.enum(ENGAGEMENT_DEPTH_VALUES).optional().catch(undefined),
  virality: z.enum(VIRALITY_VALUES).optional().catch(undefined),
  scale: z.enum(SCALE_VALUES).optional().catch(undefined),
  noise: z.enum(NOISE_VALUES).optional().catch(undefined),
  monetization: z.enum(MONETIZATION_VALUES).optional().catch(undefined),
  geography: z.enum(GEOGRAPHY_VALUES).optional().catch(undefined),
  weekly_pattern: z.enum(WEEKLY_PATTERN_VALUES).optional().catch(undefined),
  monthly_seasonality: z
    .enum(MONTHLY_SEASONALITY_VALUES)
    .optional()
    .catch(undefined),
});

export const MarkovEventSchema = z.object({
  name: z.string().min(1),
  color: z.string().nullable().optional(),
});

export const MarkovConfigSchema = z.object({
  events: z.array(MarkovEventSchema).min(1),
  start: z.record(z.number()),
  transitions: z.record(z.record(z.number())),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const SimEventSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1).optional(),
  start_date: z.string().regex(ISO_DATE, "start_date must be YYYY-MM-DD"),
  end_date: z.string().regex(ISO_DATE, "end_date must be YYYY-MM-DD"),
  effect: z.record(z.number()),
});

export const SimulationScaleOverrideSchema = z.object({
  total_users: z.number().int().positive().nullish(),
  window_days: z.number().int().positive().nullish(),
  starting_rate: z.number().positive().nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
});

export const SimulationConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  axes: AxesSchema,
  markov: MarkovConfigSchema,
  random_seed: z.number().int().nullable().optional(),
  growth_config: z.record(z.unknown()).nullable().optional(),
  scale_config: SimulationScaleOverrideSchema.nullable().optional(),
  events: z.array(SimEventSchema).optional(),
});

export type SimulationConfigInput = z.input<typeof SimulationConfigSchema>;
export type SimulationConfigOutput = z.output<typeof SimulationConfigSchema>;
