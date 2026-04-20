import { AXIS_SPEC } from "./axisSpec";
import type { SimulationConfig } from "@/types/simulation";

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseDays(s: string): number | null {
  const match = /^(-?\d+)d$/.exec(s);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function resolveScale(
  axisValue: string,
  override: SimulationConfig["scale_config"],
): { total_users: number; window_days: number } {
  const axis = AXIS_SPEC.scale.values.find((v) => v.value === axisValue);
  const base =
    axis?.params ??
    AXIS_SPEC.scale.values.find((v) => v.value === "small")!.params;
  return {
    total_users:
      (override?.total_users as number | undefined) ??
      (base.total_users as number),
    window_days:
      (override?.window_days as number | undefined) ??
      (base.window_days as number),
  };
}
