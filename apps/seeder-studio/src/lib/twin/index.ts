import { getAxisValue } from "./axisSpec";
import { resolveScale, parseDays } from "./utils";
import { growthCurve } from "./growth";
import { applyAnomalies } from "./anomalies";
import { applyJitter } from "./jitter";
import { applyVirality } from "./virality";
import { simulateCohorts } from "./simulateCohorts";
import type { RetentionParams, TwinInput, TwinOutput } from "./types";

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
  const rawSum = rawArrivals.reduce((a, b) => a + b, 0);
  const arrivals =
    rawSum > 0
      ? rawArrivals.map((v) => (v * total_users) / rawSum)
      : rawArrivals;

  const stickinessParams = getAxisValue(
    "stickiness",
    config.axes.stickiness ?? "sticky",
  )?.params as RetentionParams | undefined;

  const retentionParams: RetentionParams = stickinessParams ?? {
    peakChurnRate: 0.5,
    baseChurnRate: 0.05,
    churnDecayDays: 10,
    reactivationRate: 0.05,
    reactivationDecay: 0.8,
    maxDormantDays: 45,
  };

  const depth =
    (getAxisValue("engagement_depth", config.axes.engagement_depth ?? "medium")
      ?.params.events_per_user as number | undefined) ?? 10;

  const metrics = simulateCohorts(
    arrivals,
    days,
    total_users,
    retentionParams,
    depth,
    seed,
  );

  // Post-process total_outage anomalies: zero activeUsers, events, stickiness
  const totalOutageDays = new Set<number>();
  for (const anomaly of config.anomalies ?? []) {
    if (anomaly.type !== "total_outage") continue;
    const rawStart = parseDays(anomaly.start);
    const rawDuration = parseDays(anomaly.duration);
    if (rawStart === null || rawDuration === null || rawDuration <= 0) continue;
    const start = rawStart < 0 ? days + rawStart : rawStart;
    const end = start + rawDuration;
    if (end <= 0 || start >= days) continue;
    for (let t = Math.max(0, start); t < Math.min(end, days); t++) {
      totalOutageDays.add(t);
    }
  }
  if (totalOutageDays.size > 0) {
    for (const t of totalOutageDays) {
      metrics.activeUsers[t] = 0;
      metrics.newUsers[t] = 0;
      metrics.events[t] = 0;
      metrics.stickiness[t] = null;
    }
  }

  return { days, ...metrics };
}
