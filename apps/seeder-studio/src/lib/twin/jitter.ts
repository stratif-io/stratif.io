import { getAxisValue } from "./axisSpec";
import { seededRandom } from "./utils";

export function applyJitter(
  series: number[],
  anomaliesAxis: string,
  seed: number,
): number[] {
  const sigma =
    (getAxisValue("anomalies", anomaliesAxis)?.params.sigma as
      | number
      | undefined) ?? 0.05;
  const rng = seededRandom(seed);
  return series.map((v) => {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, v * (1 + sigma * z));
  });
}
