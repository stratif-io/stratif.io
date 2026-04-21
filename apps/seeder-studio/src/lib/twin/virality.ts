import { getAxisValue } from "./axisSpec";

function approxDau(arrivals: number[], stickinessAxis: string): number[] {
  const params = getAxisValue("stickiness", stickinessAxis)?.params;
  const r = params ? 1 - (params.baseChurnRate as number) : 0.8;
  const dau = new Array(arrivals.length).fill(0);
  for (let c = 0; c < arrivals.length; c++) {
    let active = arrivals[c];
    if (active <= 0) continue;
    for (let t = c; t < arrivals.length; t++) {
      dau[t] += active;
      active *= r;
    }
  }
  return dau;
}

export function applyVirality(
  baseArrivals: number[],
  viralityAxis: string,
  stickinessAxis: string,
): number[] {
  const k =
    (getAxisValue("virality", viralityAxis)?.params.k as number | undefined) ??
    0.1;
  const out = baseArrivals.slice();
  const dau = approxDau(out, stickinessAxis);
  for (let t = 1; t < out.length; t++) out[t] += k * dau[t - 1];
  return out.map((v) => Math.max(0, v));
}
