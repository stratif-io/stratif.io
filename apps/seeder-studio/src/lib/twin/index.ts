import { getAxisValue } from "./axisSpec";
import { resolveScale } from "./utils";
import { growthCurve } from "./growth";
import { applyAnomalies } from "./anomalies";
import { applyJitter } from "./jitter";
import { applyVirality } from "./virality";
import { dauFromArrivals } from "./retention";
import type { TwinInput, TwinOutput } from "./types";

export * from "./types";
export { AXIS_SPEC, getAxis, getAxisValue } from "./axisSpec";
export { ANOMALY_SPEC, anomalyTypeColor, defaultAnomaly } from "./anomalySpec";

export function runTwin({ config }: TwinInput): TwinOutput {
  const scaleAxis = config.axes.scale ?? "small";
  const { total_users, window_days } = resolveScale(
    scaleAxis,
    config.scale_config,
  );
  const days = window_days;
  const seed = config.random_seed ?? 42;

  const growthAxis = config.axes.growth ?? "strong";
  const baseline = growthCurve(
    growthAxis,
    days,
    total_users,
    config.growth_config,
  );
  const withAnomalies = applyAnomalies(baseline, config.anomalies);
  const jittered = applyJitter(
    withAnomalies,
    config.axes.anomalies ?? "moderate",
    seed,
  );
  const rawArrivals = applyVirality(
    jittered,
    config.axes.virality ?? "weak",
    config.axes.stickiness ?? "sticky",
  );
  // Normalize so arrivals always sum to exactly total_users,
  // keeping the shape (growth curve + virality) but matching the input count.
  const rawSum = rawArrivals.reduce((a, b) => a + b, 0);
  const arrivals =
    rawSum > 0
      ? rawArrivals.map((v) => (v * total_users) / rawSum)
      : rawArrivals;
  const dau = dauFromArrivals(arrivals, config.axes.stickiness ?? "sticky");

  // MAU = unique users active at least once in the 28-day window.
  // Cohorts that joined in the window are counted once each (arrivals[c]).
  // Cohorts from before the window are counted by how many survived to window start (arrivals[c] * r^gap).
  const r =
    (getAxisValue("stickiness", config.axes.stickiness ?? "sticky")?.params
      .retention_day as number | undefined) ?? 0.8;
  const mau = new Array(days).fill(0);
  const MAU_WINDOW = 28;
  for (let t = 0; t < days; t++) {
    const windowStart = Math.max(0, t - MAU_WINDOW + 1);
    let mauCount = 0;
    for (let c = windowStart; c <= t; c++) mauCount += arrivals[c];
    for (let c = 0; c < windowStart; c++)
      mauCount += arrivals[c] * Math.pow(r, windowStart - c);
    mau[t] = mauCount;
  }

  const depth =
    (getAxisValue("engagement_depth", config.axes.engagement_depth ?? "medium")
      ?.params.events_per_user as number | undefined) ?? 10;

  // Accumulate fractional arrivals and emit whole users so that e.g. 30 users
  // over 90 days still shows ~30 new-user events distributed across days
  // rather than all zeros.
  let arrivalAcc = 0;
  const newUsers = arrivals.map((v) => {
    arrivalAcc += v;
    const whole = Math.floor(arrivalAcc);
    arrivalAcc -= whole;
    return whole;
  });

  // Total users = cumulative unique users (running sum of newUsers)
  const totalUsers: number[] = [];
  let cumulative = 0;
  for (const n of newUsers) {
    cumulative += n;
    totalUsers.push(cumulative);
  }

  const activeUsers = dau.map((v) => Math.floor(v));
  // Events must come from whole-number activeUsers to stay consistent.
  const events = activeUsers.map((v) => Math.floor(v * depth));

  // Churned = users active yesterday but not today: dau[t-1] * (1 - r).
  // Day 0 has no prior day so churn is 0.
  const churnedUsers = dau.map((_, t) =>
    t === 0 ? 0 : Math.floor(dau[t - 1] * (1 - r)),
  );

  const target =
    (getAxisValue("stickiness", config.axes.stickiness ?? "sticky")?.params
      .dau_mau_target as number | undefined) ?? 0.3;

  const rawStickiness = dau.map((d, t) =>
    Math.min(1, Math.max(0, d / Math.max(1, mau[t]))),
  );

  // Scale so post-warmup average converges toward the axis dau_mau_target.
  const postWarmup = rawStickiness.slice(MAU_WINDOW);
  const postAvg =
    postWarmup.length > 0
      ? postWarmup.reduce((a, b) => a + b, 0) / postWarmup.length
      : 0;
  const scaleFactor = postAvg > 0 ? target / postAvg : 1;

  // Return null during warmup — MAU window isn't full yet, value is meaningless.
  const stickiness: (number | null)[] = rawStickiness.map((v, t) => {
    if (t < MAU_WINDOW) return null;
    return Math.min(1, Math.max(0, v * scaleFactor));
  });

  return {
    days,
    events,
    activeUsers,
    newUsers,
    churnedUsers,
    stickiness,
    totalUsers,
  };
}
