export interface SimulationAnomaly {
  type: string;
  name?: string;
  // Python loader accepts either `start` (relative like "-45d" or ISO date) or `date` (ISO date)
  start?: string;
  date?: string;
  duration?: string;
  effect: Record<string, number>;
}

export interface SimulationScaleOverride {
  total_users?: number;
  window_days?: number;
}

export interface SimulationConfig {
  name: string;
  description?: string;
  domain: string;
  axes: Record<string, string>;
  random_seed?: number;
  growth_config?: Record<string, unknown>;
  scale_config?: SimulationScaleOverride;
  anomalies?: SimulationAnomaly[];
}
