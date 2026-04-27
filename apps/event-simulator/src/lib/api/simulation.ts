import type { SimulationConfigOutput } from "@/lib/yaml/schema";

export interface TwinOutput {
  days: number;
  arrivals: number[];
  pipeline: {
    growth: number[];
    anomalies: number[];
    jitter: number[];
    virality: number[];
  };
  events: number[];
  activeUsers: number[];
  newUsers: number[];
  churnedUsers: number[];
  reactivatedUsers: number[];
  stickiness: (number | null)[];
  totalUsers: number[];
  /** Fraction applied before each Poisson draw. Real λ(t) = pipeline.virality[t] × arrivalCap */
  arrivalCap: number;
  /** Multiplier applied after the Poisson draw. Displayed result = k × reportScale */
  reportScale: number;
}

const SEED_SERVER_URL =
  import.meta.env.VITE_SEED_SERVER_URL ?? "http://localhost:8001";

export interface PreviewResult {
  days: number[];
  new_users: number[];
  active_users: number[];
  churned: number[];
  reactivated: number[];
  events: number[];
  stickiness: number[];
  growth_curve: number[];
  anomaly_curve: number[];
  jitter_curve: number[];
  virality_curve: number[];
  arrival_cap: number;
  report_scale: number;
}

export function mapToTwinOutput(result: PreviewResult): TwinOutput {
  const windowDays = result.days.length;
  const totalUsers: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < windowDays; i++) {
    cumulative += result.new_users[i];
    totalUsers.push(cumulative);
  }
  return {
    days: windowDays,
    arrivals: result.new_users,
    pipeline: {
      growth: result.growth_curve,
      anomalies: result.anomaly_curve,
      jitter: result.jitter_curve,
      virality: result.virality_curve,
    },
    events: result.events,
    activeUsers: result.active_users,
    newUsers: result.new_users,
    churnedUsers: result.churned,
    reactivatedUsers: result.reactivated,
    stickiness: result.stickiness,
    totalUsers,
    arrivalCap: result.arrival_cap,
    reportScale: result.report_scale,
  };
}

export async function fetchSimulation(
  config: SimulationConfigOutput,
): Promise<TwinOutput> {
  const res = await fetch(`${SEED_SERVER_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.status}`);
  const result: PreviewResult = await res.json();
  return mapToTwinOutput(result);
}
