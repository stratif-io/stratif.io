import { getAxisValue, resolveAxes } from "./axisSpec";
import { resolveScale, parseDays } from "./utils";
import { growthCurve } from "./growth";
import { applyAnomalies } from "./anomalies";
import { applyJitter } from "./jitter";
import { applyVirality } from "./virality";
import { simulateCohorts } from "./simulateCohorts";
import type { RetentionParams, TwinInput, TwinOutput } from "./types";

export * from "./types";
export { AXIS_SPEC, getAxis, getAxisValue, resolveAxes } from "./axisSpec";
export { ANOMALY_SPEC, anomalyTypeColor, defaultAnomaly } from "./anomalySpec";

export function resolveSimParams(config: TwinInput["config"]): {
  depth: number;
  retentionParams: RetentionParams;
  totalUsers: number;
  windowDays: number;
} {
  const axes = resolveAxes(config.axes);
  const { total_users, window_days } = resolveScale(
    axes.scale,
    config.scale_config,
  );

  const stickinessParams = getAxisValue("stickiness", axes.stickiness)
    ?.params as RetentionParams | undefined;

  const retentionParams: RetentionParams = stickinessParams ??
    (getAxisValue("stickiness", "sticky")?.params as RetentionParams) ?? {
      peakChurnRate: 0.5,
      baseChurnRate: 0.05,
      churnDecayDays: 10,
      reactivationRate: 0.05,
      reactivationDecay: 0.8,
      maxDormantDays: 45,
    };

  const depth =
    (getAxisValue("engagement_depth", axes.engagement_depth)?.params
      .events_per_user as number | undefined) ?? 10;

  return {
    depth,
    retentionParams,
    totalUsers: total_users,
    windowDays: window_days,
  };
}

export function runTwin({ config }: TwinInput): TwinOutput {
  const {
    depth,
    retentionParams,
    totalUsers: total_users,
    windowDays: days,
  } = resolveSimParams(config);
  const axes = resolveAxes(config.axes);
  const seed = config.random_seed ?? 42;

  const baseline = growthCurve(
    axes.growth,
    days,
    total_users,
    config.growth_config,
  );
  const withAnomalies = applyAnomalies(baseline, config.anomalies);
  const jittered = applyJitter(withAnomalies, axes.anomalies, seed);
  const rawArrivals = applyVirality(jittered, axes.virality, axes.stickiness);
  const rawSum = rawArrivals.reduce((a, b) => a + b, 0);
  const arrivals =
    rawSum > 0
      ? rawArrivals.map((v) => (v * total_users) / rawSum)
      : rawArrivals;

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

  return {
    days,
    arrivals,
    pipeline: {
      growth: baseline,
      anomalies: withAnomalies,
      jitter: jittered,
      virality: rawArrivals,
    },
    ...metrics,
  };
}
