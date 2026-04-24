import type { SimulationAnomaly } from "@/types/simulation";
import { parseDays } from "./utils";

export function applyAnomalies(
  arrivals: number[],
  anomalies: SimulationAnomaly[] | undefined,
): number[] {
  if (!anomalies || anomalies.length === 0) return arrivals.slice();
  const days = arrivals.length;
  const out = arrivals.slice();
  for (const a of anomalies) {
    if (!a.start || !a.duration) continue;
    const rawStart = parseDays(a.start);
    const rawDuration = parseDays(a.duration);
    if (rawStart === null || rawDuration === null || rawDuration <= 0) continue;
    const startDay = rawStart < 0 ? days + rawStart : rawStart;
    const endDay = startDay + rawDuration;
    if (endDay <= 0 || startDay >= days) continue;
    const lo = Math.max(0, startDay);
    const hi = Math.min(days, endDay);
    const mult = a.effect.arrivals ?? 1;
    for (let t = lo; t < hi; t++) out[t] *= mult;
  }
  return out;
}
