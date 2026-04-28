import { describe, it, expect } from "vitest";
import { ghostLinesFor } from "../kpiMetricUtils";
import type { TwinOutputWithLoading } from "@/features/preview/useTwinOutput";

function makeOut(
  overrides: Partial<TwinOutputWithLoading> = {},
): TwinOutputWithLoading {
  const n = 10;
  const zeros = Array(n).fill(0);
  return {
    isLoading: false,
    days: n,
    arrivals: zeros,
    pipeline: {
      growth: zeros,
      seasonality: zeros,
      anomalies: zeros,
      jitter: zeros,
      virality: zeros,
    },
    events: zeros,
    activeUsers: zeros,
    newUsers: zeros,
    churnedUsers: zeros,
    reactivatedUsers: zeros,
    stickiness: zeros,
    mau: zeros,
    totalUsers: zeros,
    arrivalCap: 1,
    reportScale: 1,
    ...overrides,
  };
}

describe("ghostLinesFor newUsers", () => {
  it("includes a seasonality ghost line", () => {
    const out = makeOut();
    const lines = ghostLinesFor("newUsers", out);
    const keys = lines.map((l) => l.key);
    expect(keys).toContain("g_season");
  });

  it("includes active users ghost line", () => {
    const out = makeOut();
    const lines = ghostLinesFor("newUsers", out);
    const keys = lines.map((l) => l.key);
    expect(keys).toContain("g_active");
  });

  it("orders pipeline lines: growth → seasonality → anomalies → jitter → virality", () => {
    const out = makeOut();
    const lines = ghostLinesFor("newUsers", out);
    const pipelineKeys = [
      "g_growth",
      "g_season",
      "g_anom",
      "g_jitter",
      "g_viral",
    ];
    const filtered = lines
      .filter((l) => pipelineKeys.includes(l.key))
      .map((l) => l.key);
    expect(filtered).toEqual(pipelineKeys);
  });
});
