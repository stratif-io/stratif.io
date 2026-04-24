import { z } from "zod";

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
  domain: z.string().min(1),
  axes: z.record(z.string()),
  random_seed: z.number().int().optional(),
  growth_config: z.record(z.unknown()).optional(),
  scale_config: SimulationScaleOverrideSchema.optional(),
  anomalies: z.array(SimulationAnomalySchema).optional(),
});

export type SimulationConfigInput = z.input<typeof SimulationConfigSchema>;
export type SimulationConfigOutput = z.output<typeof SimulationConfigSchema>;
