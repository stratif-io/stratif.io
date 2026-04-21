import { getAxisValue } from "./axisSpec";

export function dauFromArrivals(
  arrivals: number[],
  stickinessAxis: string,
): number[] {
  const params = getAxisValue("stickiness", stickinessAxis)?.params;
  // Derive daily retention from baseChurnRate (survival = 1 - baseChurnRate).
  // Task 5 replaces dauFromArrivals with the full per-user simulation.
  const r = params ? 1 - (params.baseChurnRate as number) : 0.8;
  const dau = new Array(arrivals.length).fill(0);
  for (let c = 0; c < arrivals.length; c++) {
    const count = arrivals[c];
    if (count <= 0) continue;
    let active = count;
    for (let t = c; t < arrivals.length; t++) {
      dau[t] += active;
      active *= r;
    }
  }
  return dau;
}
