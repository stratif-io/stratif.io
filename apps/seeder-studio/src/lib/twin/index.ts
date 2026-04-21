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
  const arrivals = applyVirality(
    jittered,
    config.axes.virality ?? "weak",
    config.axes.stickiness ?? "sticky",
  );
  const dau = dauFromArrivals(arrivals, config.axes.stickiness ?? "sticky");

  const mau = new Array(days).fill(0);
  const MAU_WINDOW = 28;
  for (let t = 0; t < days; t++) {
    const lo = Math.max(0, t - MAU_WINDOW + 1);
    let sum = 0;
    for (let k = lo; k <= t; k++) sum += dau[k];
    mau[t] = sum;
  }

  const depth =
    (getAxisValue("engagement_depth", config.axes.engagement_depth ?? "medium")
      ?.params.events_per_user as number | undefined) ?? 10;

  const events = dau.map((v) => Math.floor(v * depth));
  const stickiness = dau.map((d, t) => {
    const m = Math.max(1, mau[t]);
    return Math.min(1, Math.max(0, d / m));
  });

  return {
    days,
    events,
    activeUsers: dau.map((v) => Math.floor(v)),
    newUsers: arrivals.map((v) => Math.floor(v)),
    stickiness,
  };
}
