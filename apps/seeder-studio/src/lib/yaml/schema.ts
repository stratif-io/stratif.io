import { z } from "zod";
import {
  GROWTH_VALUES,
  STICKINESS_VALUES,
  ENGAGEMENT_DEPTH_VALUES,
  VIRALITY_VALUES,
  SCALE_VALUES,
  ANOMALIES_VALUES,
  MONETIZATION_VALUES,
  GEOGRAPHY_VALUES,
} from "./axisContract";

export const AxesSchema = z.object({
  growth: z.enum(GROWTH_VALUES).optional().catch(undefined),
  stickiness: z.enum(STICKINESS_VALUES).optional().catch(undefined),
  engagement_depth: z.enum(ENGAGEMENT_DEPTH_VALUES).optional().catch(undefined),
  virality: z.enum(VIRALITY_VALUES).optional().catch(undefined),
  scale: z.enum(SCALE_VALUES).optional().catch(undefined),
  anomalies: z.enum(ANOMALIES_VALUES).optional().catch(undefined),
  monetization: z.enum(MONETIZATION_VALUES).optional().catch(undefined),
  geography: z.enum(GEOGRAPHY_VALUES).optional().catch(undefined),
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

export const SimulationAnomalySchema = z
  .object({
    type: z.string().min(1),
    name: z.string().min(1).optional(),
    // Python loader accepts either `start` (relative like "-45d" or ISO date) or `date` (ISO date)
    start: z.string().min(1).optional(),
    date: z.string().min(1).optional(),
    duration: z.string().min(1).optional(),
    effect: z.record(z.number()),
  })
  .refine((v) => v.start !== undefined || v.date !== undefined, {
    message: "anomaly must have either start or date",
  });

export const SimulationScaleOverrideSchema = z.object({
  total_users: z.number().int().positive().optional(),
  window_days: z.number().int().positive().optional(),
});

export const SimulationConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  axes: AxesSchema,
  markov: MarkovConfigSchema,
  random_seed: z.number().int().nullable().optional(),
  growth_config: z.record(z.unknown()).nullable().optional(),
  scale_config: SimulationScaleOverrideSchema.nullable().optional(),
  anomalies: z.array(SimulationAnomalySchema).optional(),
});

export type SimulationConfigInput = z.input<typeof SimulationConfigSchema>;
export type SimulationConfigOutput = z.output<typeof SimulationConfigSchema>;
