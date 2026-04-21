import { createRng, poissonDraw } from "./rng";
import type { RetentionParams, TwinOutput } from "./types";

export type { RetentionParams };

// S[k] = probability a cohort member is active at tenure k (not permanently churned).
// S[0] = 1 (always active on join day). S[k] = S[k-1] * (1 - churnProb(k)).
function buildSurvival(
  params: RetentionParams,
  maxTenure: number,
): Float64Array {
  const S = new Float64Array(maxTenure + 1);
  S[0] = 1;
  for (let k = 1; k <= maxTenure; k++) {
    const cp =
      params.baseChurnRate +
      (params.peakChurnRate - params.baseChurnRate) *
        Math.pow(2, -(k / params.churnDecayDays));
    S[k] = S[k - 1] * (1 - cp);
  }
  return S;
}

// R[d-1] = probability of reactivating after d dormant days (d = 1..maxDormantDays).
function buildReactivationKernel(params: RetentionParams): Float64Array {
  const R = new Float64Array(params.maxDormantDays);
  for (let d = 1; d <= params.maxDormantDays; d++) {
    R[d - 1] =
      params.reactivationRate * Math.pow(params.reactivationDecay, d - 1);
  }
  return R;
}

export function simulateCohorts(
  arrivals: number[], // fractional arrivals per day, sums ≈ totalUsers
  days: number,
  _totalUsers: number, // informational only — no SIM_CAP scaling
  params: RetentionParams,
  eventsPerActiveUser: number,
  seed: number,
): Omit<TwinOutput, "days"> {
  const rng = createRng(seed);
  const S = buildSurvival(params, days);
  const R = buildReactivationKernel(params);

  const activeArr = new Float64Array(days);
  const newArr = new Float64Array(days);
  const churnArr = new Float64Array(days);
  const reactArr = new Float64Array(days);

  // Sample each cohort's size first so newUsers and activeUsers[joinDay] are consistent.
  const cohortSizes = new Float64Array(days);
  for (let c = 0; c < days; c++) {
    cohortSizes[c] = poissonDraw(arrivals[c], rng);
    newArr[c] = cohortSizes[c];
  }

  for (let c = 0; c < days; c++) {
    const N = cohortSizes[c];
    if (N <= 0) continue;

    // tenure 0: all cohort members are active on join day (S[0] = 1)
    activeArr[c] += N;

    for (let t = c + 1; t < days; t++) {
      const tenure = t - c;

      // Active today from this cohort
      activeArr[t] += poissonDraw(N * S[tenure], rng);

      // Entered dormant today (churn stream for reactivation convolution)
      const churnFrac = S[tenure - 1] - S[tenure];
      if (churnFrac > 0) churnArr[t] += poissonDraw(N * churnFrac, rng);

      // Reactivations: users dormant for `dormant` days reactivate today
      let reactExp = 0;
      const dormantMax = Math.min(tenure - 1, params.maxDormantDays);
      for (let dormant = 1; dormant <= dormantMax; dormant++) {
        const k = tenure - dormant; // tenure when they entered dormant state
        const churnedAtK = N * (S[k - 1] - S[k]);
        if (churnedAtK > 0) reactExp += churnedAtK * R[dormant - 1];
      }
      if (reactExp > 0) reactArr[t] += poissonDraw(reactExp, rng);
    }
  }

  // MAU: 28-day window using survival curve (no Poisson — window averaging suffices).
  // Independence approximation: P(active at least once in [t-27, t]) ≈ 1 - Π(1 - S[k]).
  // True events are positively correlated (survival chain), so this slightly overestimates MAU
  // and consequently slightly underestimates stickiness. Acceptable for a simulation display.
  const mauArr = new Float64Array(days);
  for (let t = 28; t < days; t++) {
    let mauSum = 0;
    for (let c = 0; c <= t; c++) {
      const N = cohortSizes[c];
      if (N <= 0) continue;
      const wStart = Math.max(0, t - 27 - c);
      const wEnd = t - c;
      let pInactive = 1;
      for (let k = wStart; k <= wEnd; k++) pInactive *= 1 - S[k];
      mauSum += N * (1 - pInactive);
    }
    mauArr[t] = mauSum;
  }

  // Cumulative new users
  const totalUsersArr = new Array<number>(days);
  let cumulative = 0;
  for (let t = 0; t < days; t++) {
    cumulative += newArr[t];
    totalUsersArr[t] = cumulative;
  }

  // stickiness = DAU / MAU for t >= 28, null before warmup
  const stickiness: (number | null)[] = new Array(days).fill(null);
  for (let t = 28; t < days; t++) {
    const mau = mauArr[t];
    stickiness[t] = mau > 0 ? Math.min(1, activeArr[t] / mau) : 0;
  }

  return {
    events: Array.from(activeArr, (au) => Math.floor(au * eventsPerActiveUser)),
    activeUsers: Array.from(activeArr, Math.round),
    newUsers: Array.from(newArr, Math.round),
    churnedUsers: Array.from(churnArr, Math.round),
    reactivatedUsers: Array.from(reactArr, Math.round),
    stickiness,
    totalUsers: totalUsersArr,
  };
}
