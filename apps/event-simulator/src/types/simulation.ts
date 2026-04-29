export interface MarkovEvent {
  name: string;
  color?: string | null;
}

export interface MarkovConfig {
  events: MarkovEvent[];
  start: Record<string, number>;
  transitions: Record<string, Record<string, number>>;
}

export interface SimEvent {
  type: string;
  name?: string;
  start_date: string; // ISO date e.g. "2025-01-15"
  end_date: string; // ISO date e.g. "2025-01-22"
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
  events?: SimEvent[];
}
