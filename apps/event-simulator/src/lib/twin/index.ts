export * from "./types";
export { AXIS_SPEC, getAxis, getAxisValue, resolveAxes } from "./axisSpec";
export { ANOMALY_SPEC, anomalyTypeColor, defaultAnomaly } from "./anomalySpec";

export { resolveScale, parseDays } from "./utils";

import { AXIS_SPEC, getAxisValue, resolveAxes } from "./axisSpec";
import { resolveScale } from "./utils";
import type { RetentionParams, TwinInput } from "./types";

export function resolveSimParams(config: TwinInput["config"]): {
  depth: number;
  retentionParams: RetentionParams;
  totalUsers: number;
  windowDays: number;
} {
  const axes = resolveAxes(config.axes);
  const scale = resolveScale(axes.scale, config.scale_config);
  // In rate-driven mode, totalUsers is not directly specified; fall back to the axis default.
  const total_users =
    scale.mode === "goal"
      ? scale.total_users
      : ((
          AXIS_SPEC.scale.values.find((v) => v.value === axes.scale) ??
          AXIS_SPEC.scale.values.find((v) => v.value === "small")!
        ).params.total_users as number);
  const window_days = scale.window_days;

  const stickinessParams = getAxisValue("stickiness", axes.stickiness)
    ?.params as RetentionParams | undefined;

  const retentionParams: RetentionParams = stickinessParams ??
    (getAxisValue("stickiness", "sticky")
      ?.params as unknown as RetentionParams) ?? {
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
