import { getAxisValue } from "./axisSpec";
import { dauFromArrivals } from "./retention";

export function applyVirality(
  baseArrivals: number[],
  viralityAxis: string,
  stickinessAxis: string,
): number[] {
  const k =
    (getAxisValue("virality", viralityAxis)?.params.k as number | undefined) ??
    0.1;
  const out = baseArrivals.slice();
  const dau = dauFromArrivals(out, stickinessAxis);
  for (let t = 1; t < out.length; t++) out[t] += k * dau[t - 1];
  return out.map((v) => Math.max(0, v));
}
