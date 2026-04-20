import { getAxisValue } from "./axisSpec";

export function dauFromArrivals(
  arrivals: number[],
  stickinessAxis: string,
): number[] {
  const params = getAxisValue("stickiness", stickinessAxis)?.params;
  const r = (params?.retention_day as number | undefined) ?? 0.8;
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
