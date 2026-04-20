import { z } from "zod";

export const SimulationAnomalySchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  start: z.string().min(1),
  duration: z.string().min(1),
  effect: z.record(z.number()),
});

export const SimulationScaleOverrideSchema = z.object({
  total_users: z.number().int().positive().optional(),
  window_days: z.number().int().positive().optional(),
});

export const SimulationConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  domain: z.string().min(1),
  axes: z.record(z.string()),
  random_seed: z.number().int().optional(),
  growth_config: z.record(z.unknown()).optional(),
  scale_config: SimulationScaleOverrideSchema.optional(),
  anomalies: z.array(SimulationAnomalySchema).optional(),
});

export type SimulationConfigInput = z.input<typeof SimulationConfigSchema>;
export type SimulationConfigOutput = z.output<typeof SimulationConfigSchema>;
