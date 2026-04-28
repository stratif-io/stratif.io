export interface MarkovEvent {
  name: string;
  color?: string | null;
}

export interface MarkovConfig {
  events: MarkovEvent[];
  start: Record<string, number>;
  transitions: Record<string, Record<string, number>>;
}

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
  total_users?: number | null;
  starting_rate?: number | null;
  window_days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface SimulationConfig {
  name: string;
  description?: string;
  axes: Record<string, string>;
  markov: MarkovConfig;
  random_seed?: number | null;
  growth_config?: Record<string, unknown> | null;
  scale_config?: SimulationScaleOverride | null;
  anomalies?: SimulationAnomaly[];
}
