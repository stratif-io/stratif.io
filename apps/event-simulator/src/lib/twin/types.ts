import type { SimulationConfig } from "@/types/simulation";

export interface RetentionParams {
  peakChurnRate: number; // churn prob on user's first day (age 0→1)
  baseChurnRate: number; // churn prob for long-tenured users (asymptote)
  churnDecayDays: number; // tenure half-life: at this tenure, extra churn is halved
  reactivationRate: number; // prob of reactivating on first dormant day
  reactivationDecay: number; // multiplicative decay per additional dormant day (0 < x < 1)
  maxDormantDays: number; // days dormant before permanent churn
}

export interface TwinOutput {
  days: number;
  arrivals: number[];
  /** Pipeline stages for new-user arrival rate (each normalized to [0,1] relative scale) */
  pipeline: {
    growth: number[]; // G(t) — raw growth curve
    anomalies: number[]; // A(G(t)) — after anomaly multipliers
    jitter: number[]; // J(A(G(t))) — after day-level jitter
    virality: number[]; // V(J(A(G(t)))) — after viral amplification
  };
  events: number[];
  activeUsers: number[];
  newUsers: number[];
  /** Users who entered the dormant state today (may reactivate). Not permanently churned. */
  churnedUsers: number[];
  reactivatedUsers: number[];
  stickiness: (number | null)[];
  totalUsers: number[];
}

export interface TwinInput {
  config: SimulationConfig;
}
