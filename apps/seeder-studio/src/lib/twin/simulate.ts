import { createRng } from "./rng";

export type { RetentionParams } from "./types";

export interface SimulatedUser {
  id: number;
  joinDay: number;
  activeDays: number[]; // sorted list of days this user was active
  reactivationDays: number[]; // subset of activeDays where user returned from dormant
  churnDay: number | null; // day permanently churned, null if still in window
}

export const SIM_CAP = 5000; // max users to actually simulate

function churnProb(tenure: number, params: RetentionParams): number {
  return (
    params.baseChurnRate +
    (params.peakChurnRate - params.baseChurnRate) *
      Math.pow(2, -tenure / params.churnDecayDays)
  );
}

function reactivationProb(
  dormantDays: number,
  params: RetentionParams,
): number {
  return (
    params.reactivationRate *
    Math.pow(params.reactivationDecay, dormantDays - 1)
  );
}

export function simulateUsers(
  arrivals: number[], // fractional arrivals per day, sums ≈ totalUsers
  days: number,
  totalUsers: number,
  params: RetentionParams,
  seed: number,
): SimulatedUser[] {
  const rng = createRng(seed);
  const simCount = Math.min(totalUsers, SIM_CAP);
  const scaleFactor = simCount / Math.max(1, totalUsers);

  // Distribute arrivals across simulated users
  const joinDays: number[] = [];
  let acc = 0;
  for (let d = 0; d < arrivals.length; d++) {
    acc += arrivals[d] * scaleFactor;
    const joining = Math.floor(acc);
    acc -= joining;
    for (let i = 0; i < joining; i++) {
      joinDays.push(d);
    }
  }

  const users: SimulatedUser[] = [];

  for (let uid = 0; uid < joinDays.length; uid++) {
    const joinDay = joinDays[uid];
    const activeDays: number[] = [joinDay];
    const reactivationDays: number[] = [];
    let churnDay: number | null = null;

    let state: "active" | "dormant" = "active";
    let dormantDays = 0;

    for (let t = joinDay + 1; t < days; t++) {
      if (state === "active") {
        const tenure = t - joinDay;
        const cp = churnProb(tenure, params);
        if (rng() < cp) {
          state = "dormant";
          dormantDays = 1;
        } else {
          activeDays.push(t);
        }
      } else {
        // dormant — dormantDays starts at 1 (set on entry).
        // Churn fires when dormantDays reaches maxDormantDays (inclusive).
        if (dormantDays >= params.maxDormantDays) {
          churnDay = t;
          break;
        } else if (rng() < reactivationProb(dormantDays, params)) {
          state = "active";
          dormantDays = 0;
          activeDays.push(t);
          reactivationDays.push(t);
        } else {
          dormantDays++;
        }
      }
    }

    users.push({ id: uid, joinDay, activeDays, reactivationDays, churnDay });
  }

  return users;
}
