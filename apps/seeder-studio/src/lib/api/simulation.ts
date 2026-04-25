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
      growth: result.new_users,
      anomalies: result.new_users,
      jitter: result.new_users,
      virality: result.new_users,
    },
    events: result.events,
    activeUsers: result.active_users,
    newUsers: result.new_users,
    churnedUsers: result.churned,
    reactivatedUsers: result.reactivated,
    stickiness: result.stickiness,
    totalUsers,
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
