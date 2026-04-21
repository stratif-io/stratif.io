import type { SimulationConfig } from "@/types/simulation";

export interface TwinOutput {
  days: number;
  events: number[];
  activeUsers: number[];
  newUsers: number[];
  churnedUsers: number[];
  stickiness: (number | null)[];
  totalUsers: number[];
}

export interface TwinInput {
  config: SimulationConfig;
}
