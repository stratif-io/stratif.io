import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runTwin } from "@/lib/twin";
import type { SimulationConfig } from "@/types/simulation";

const FIXTURES = path.join(__dirname, "fixtures");

interface Fixture {
  file: string;
  payload: {
    name: string;
    axes: Record<string, string>;
    scale_config: { total_users?: number; window_days?: number } | null;
    growth_config: Record<string, unknown> | null;
    anomalies: Array<Record<string, unknown>>;
    kpi: {
      events: number[];
      active_users: number[];
      new_users: number[];
      stickiness: number[];
    };
  };
}

function loadFixtures(): Fixture[] {
  if (!fs.existsSync(FIXTURES)) return [];
  return fs
    .readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({
      file,
      payload: JSON.parse(fs.readFileSync(path.join(FIXTURES, file), "utf8")),
    }));
}

const fixtures = loadFixtures();

describe("twin vs python", () => {
  if (fixtures.length === 0) {
    it.skip("fixtures missing — run generate_python_reference.py first", () => {});
    return;
  }

  it.each(fixtures)("$file — twin stays within envelope", ({ payload }) => {
    const config: SimulationConfig = {
      name: payload.name,
      domain: "saas",
      axes: payload.axes,
      scale_config: payload.scale_config ?? undefined,
      growth_config: payload.growth_config ?? undefined,
      anomalies: (payload.anomalies ?? []) as SimulationConfig["anomalies"],
      random_seed: 42,
    };
    const twin = runTwin({ config });
    const ref = payload.kpi;

    // 1. Length alignment — twin uses window_days exactly; Python spans real
    //    calendar dates so can differ by ±3. Both must be within 5 of reference_days.
    const refDays = payload.reference_days ?? ref.events.length;
    expect(Math.abs(twin.days - refDays)).toBeLessThanOrEqual(5);
    expect(Math.abs(ref.events.length - refDays)).toBeLessThanOrEqual(5);

    // 2. Directional alignment: whichever end is larger in the reference must
    //    be larger in the twin (active users). Skip when the reference is flat
    //    (sign=0) — a stochastic 60-day run can round-trip to the same value.
    const refStart = ref.active_users[0];
    const refEnd = ref.active_users.at(-1) ?? 0;
    const twinStart = twin.activeUsers[0];
    const twinEnd = twin.activeUsers.at(-1) ?? 0;
    const refSign = Math.sign(refEnd - refStart);
    if (refSign !== 0) {
      expect(Math.sign(twinEnd - twinStart)).toBe(refSign);
    }

    // 3. Peak index within ±45 days for new_users (twin uses a smooth curve;
    //    Python's stochastic arrivals can place the peak near the boundary for
    //    seasonal presets).
    const argmax = (a: number[]) => a.indexOf(Math.max(...a));
    const refPeak = argmax(ref.new_users);
    const twinPeak = argmax(twin.newUsers);
    // Only assert when reference peak is in the interior (not within 10% of
    // the boundaries) — boundary peaks are artefacts of the calendar window.
    const refLen = ref.new_users.length;
    const boundary = Math.floor(refLen * 0.1);
    if (refPeak > boundary && refPeak < refLen - boundary) {
      expect(Math.abs(refPeak - twinPeak)).toBeLessThanOrEqual(45);
    }

    // 4. Stickiness scale within a 5× envelope.
    const avg = (a: number[]) =>
      a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    const refStick = avg(ref.stickiness);
    const twinStick = avg(twin.stickiness);
    const ratio =
      Math.max(refStick, twinStick) /
      Math.max(0.01, Math.min(refStick, twinStick));
    expect(ratio).toBeLessThanOrEqual(5);
  });
});
