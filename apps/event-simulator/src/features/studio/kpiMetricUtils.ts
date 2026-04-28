import type { MetricKey } from "@/features/preview/formulaRegistry";
import type { GhostLine } from "@/features/preview/KpiChart";
import type { useTwinOutput } from "@/features/preview/useTwinOutput";
import { formatNum } from "@/lib/format";

const fn = (v: number) => formatNum(Math.round(v));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const fix1 = (v: number) => v.toFixed(1);

export interface DailyRow {
  day: number;
  formula: string;
  computation: string;
  result: string;
}

export function buildDailyRows(
  metricKey: MetricKey,
  out: ReturnType<typeof useTwinOutput>,
  depth: number,
): DailyRow[] {
  const n = out.activeUsers.length;
  return Array.from({ length: n }, (_, i) => {
    const day = i + 1;
    switch (metricKey) {
      case "activeUsers": {
        const prev = i === 0 ? 0 : out.activeUsers[i - 1];
        const nu = out.newUsers[i];
        const ch = out.churnedUsers[i];
        const re = out.reactivatedUsers[i];
        return {
          day,
          formula: `DAU(${i})=${fn(prev)} + N(${day})=${fn(nu)} − C(${day})=${fn(ch)} + R(${day})=${fn(re)}`,
          computation: `${fn(prev)} + ${fn(nu)} − ${fn(ch)} + ${fn(re)}`,
          result: fn(out.activeUsers[i]),
        };
      }
      case "newUsers": {
        const rate = out.pipeline.virality[i] ?? 0;
        return {
          day,
          formula: `V(${day})=${fix1(rate)}`,
          computation: `Poisson(${fix1(rate)})`,
          result: fn(out.newUsers[i]),
        };
      }
      case "events":
        return {
          day,
          formula: `DAU(${day}) × d`,
          computation: `${fn(out.activeUsers[i])} × ${depth}`,
          result: fn(out.events[i]),
        };
      case "stickiness": {
        const dau = out.activeUsers[i];
        const mau =
          out.stickiness[i] !== null && dau > 0
            ? Math.round(dau / out.stickiness[i]!)
            : 0;
        return {
          day,
          formula: `DAU(${day}) / MAU(${day})`,
          computation: `${fn(dau)} / ${fn(mau)}`,
          result:
            out.stickiness[i] !== null
              ? `${(out.stickiness[i]! * 100).toFixed(1)}%`
              : "—",
        };
      }
      case "totalUsers":
        return {
          day,
          formula: `Σ N_c through d${day}`,
          computation: `+${fn(out.newUsers[i])}`,
          result: fn(out.totalUsers[i]),
        };
      case "churnedUsers":
        return {
          day,
          formula: `Σ Poisson(N_c · ΔS[k])`,
          computation: `cohorts × p_churn`,
          result: fn(out.churnedUsers[i]),
        };
      case "reactivatedUsers":
        return {
          day,
          formula: `Σ C_c · r · δ^(n-1)`,
          computation: `dormant × decay`,
          result: fn(out.reactivatedUsers[i]),
        };
      default: {
        const _exhaustive: never = metricKey;
        throw new Error(`Unhandled metricKey: ${_exhaustive}`);
      }
    }
  });
}

export function valuesFor(
  metricKey: MetricKey,
  out: ReturnType<typeof useTwinOutput>,
): (number | null)[] {
  switch (metricKey) {
    case "events":
      return out.events;
    case "activeUsers":
      return out.activeUsers;
    case "newUsers":
      return out.newUsers;
    case "stickiness":
      return out.stickiness.map((v) => (v === null ? null : v * 100));
    case "totalUsers":
      return out.totalUsers;
    case "churnedUsers":
      return out.churnedUsers;
    case "reactivatedUsers":
      return out.reactivatedUsers;
  }
}

export function ghostLinesFor(
  metricKey: MetricKey,
  out: ReturnType<typeof useTwinOutput>,
): GhostLine[] {
  switch (metricKey) {
    case "activeUsers":
      return [
        {
          key: "g_new",
          label: "New users",
          values: out.newUsers,
          color: "hsl(var(--chart-3))",
        },
        {
          key: "g_churn",
          label: "Churned",
          values: out.churnedUsers,
          color: "hsl(var(--destructive))",
        },
        {
          key: "g_react",
          label: "Reactivated",
          values: out.reactivatedUsers,
          color: "hsl(var(--chart-4))",
        },
      ];
    case "events":
      return [
        {
          key: "g_dau",
          label: "Active users",
          values: out.activeUsers,
          color: "hsl(var(--chart-8))",
        },
      ];
    case "totalUsers":
      return [
        {
          key: "g_new",
          label: "New users/day",
          values: out.newUsers,
          color: "hsl(var(--chart-3))",
        },
      ];
    case "stickiness": {
      const mauValues = out.activeUsers.map((dau, i) => {
        const s = out.stickiness[i];
        return s !== null && s > 0 ? dau / s : null;
      });
      return [
        {
          key: "g_dau",
          label: "DAU — daily active users",
          values: out.activeUsers,
          color: "hsl(var(--chart-8))",
        },
        {
          key: "g_mau",
          label: "MAU — monthly active users",
          values: mauValues,
          color: "hsl(var(--chart-2))",
        },
      ];
    }
    case "churnedUsers":
      return [
        {
          key: "g_react",
          label: "Reactivated",
          values: out.reactivatedUsers,
          color: "hsl(var(--chart-4))",
        },
      ];
    case "reactivatedUsers":
      return [
        {
          key: "g_churn",
          label: "Churned",
          values: out.churnedUsers,
          color: "hsl(var(--destructive))",
        },
      ];
    case "newUsers":
      return [
        {
          key: "g_growth",
          label: "G(t) — growth curve",
          values: out.pipeline.growth,
          color: "hsl(var(--chart-2))",
        },
        {
          key: "g_season",
          label: "S(t) — after seasonality",
          values: out.pipeline.seasonality,
          color: "hsl(var(--chart-7))",
        },
        {
          key: "g_anom",
          label: "A — after anomalies",
          values: out.pipeline.anomalies,
          color: "hsl(var(--chart-5))",
        },
        {
          key: "g_jitter",
          label: "J — after jitter",
          values: out.pipeline.jitter,
          color: "hsl(var(--chart-6))",
        },
        {
          key: "g_viral",
          label: "V — after virality",
          values: out.pipeline.virality,
          color: "hsl(var(--chart-4))",
        },
        {
          key: "g_active",
          label: "Active users",
          values: out.activeUsers,
          color: "hsl(var(--chart-3))",
        },
      ];
  }
}

// Suppress unused warning — pct is available for callers if needed
export { pct };
