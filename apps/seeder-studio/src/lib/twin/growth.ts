import type { SimulationConfig } from "@/types/simulation";

export function growthCurve(
  axis: string,
  days: number,
  totalUsers: number,
  growthConfig: SimulationConfig["growth_config"],
): number[] {
  const out = new Array(days).fill(0);
  switch (axis) {
    case "decline": {
      const rate = 0.03;
      for (let t = 0; t < days; t++)
        out[t] = totalUsers * rate * Math.exp(-t / (days * 0.5));
      break;
    }
    case "flat": {
      const base = totalUsers / days;
      for (let t = 0; t < days; t++) out[t] = base;
      break;
    }
    case "weak": {
      const base = totalUsers / days;
      for (let t = 0; t < days; t++) out[t] = base * (0.5 + t / days);
      break;
    }
    case "strong": {
      const rate = 0.02;
      const norm = (Math.exp(rate * days) - 1) / rate;
      const scale = totalUsers / norm;
      for (let t = 0; t < days; t++) out[t] = scale * Math.exp(rate * t);
      break;
    }
    case "hockey_stick": {
      const split = (growthConfig?.split_fraction as number | undefined) ?? 0.3;
      const rate = (growthConfig?.rate as number | undefined) ?? 0.04;
      const inflection = Math.floor(days * split);
      const bladeDays = days - inflection;
      const bladeNorm = (Math.exp(rate * bladeDays) - 1) / rate;
      const flatWeight = 0.05 * totalUsers;
      const bladeWeight = 0.95 * totalUsers;
      const flatBase = flatWeight / Math.max(inflection, 1);
      const bladeScale = bladeWeight / bladeNorm;
      for (let t = 0; t < inflection; t++) out[t] = flatBase;
      for (let t = inflection; t < days; t++)
        out[t] = bladeScale * Math.exp(rate * (t - inflection));
      break;
    }
    default: {
      const base = totalUsers / days;
      for (let t = 0; t < days; t++) out[t] = base;
    }
  }
  return out.map((v) => Math.max(0, v));
}
