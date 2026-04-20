import { useMemo } from "react";
import { useTwinOutput } from "./useTwinOutput";
import { KpiChart, type KpiBand } from "./KpiChart";
import { useSeederStore } from "@/stores/seederStore";
import { anomalyTypeColor } from "@/lib/twin";
import { parseDays } from "@/lib/twin/utils";
import type { SimulationConfig } from "@/types/simulation";

type AnomalyList = NonNullable<SimulationConfig["anomalies"]>;

function headlineStat(values: number[], kind: "count" | "ratio"): string {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (kind === "ratio") return `avg ${avg.toFixed(2)}`;
  return `peak ${Math.round(max)} · avg ${Math.round(avg)} · min ${Math.round(min)}`;
}

const EMPTY_ANOMALIES: AnomalyList = [];

export function PreviewGrid() {
  const out = useTwinOutput();
  const anomalies = useSeederStore(
    (s) => s.config.anomalies ?? EMPTY_ANOMALIES,
  );

  const bands: KpiBand[] = useMemo(
    () =>
      anomalies.flatMap((a) => {
        if (!a.start || !a.duration) return [];
        const rawStart = parseDays(a.start);
        const rawDur = parseDays(a.duration);
        if (rawStart == null || rawDur == null || rawDur <= 0) return [];
        const start =
          rawStart < 0
            ? Math.max(0, out.days + rawStart)
            : Math.max(0, rawStart);
        const end = Math.min(out.days, start + rawDur);
        if (end <= start) return [];
        return [{ start, end, color: anomalyTypeColor(a.type) }];
      }),
    [anomalies, out.days],
  );

  const stats = useMemo(
    () => ({
      events: headlineStat(out.events, "count"),
      active: headlineStat(out.activeUsers, "count"),
      news: headlineStat(out.newUsers, "count"),
      stickiness: headlineStat(out.stickiness, "ratio"),
    }),
    [out],
  );

  return (
    <section className="flex flex-col gap-2 flex-1 overflow-hidden p-2">
      <header className="flex items-center justify-between">
        <span className="text-xs uppercase text-muted-foreground">Preview</span>
        <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px]">
          approximate
        </span>
      </header>
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        <KpiChart
          title="Events/day"
          values={out.events}
          headline={stats.events}
          color="#2563eb"
          bands={bands}
        />
        <KpiChart
          title="Active users"
          values={out.activeUsers}
          headline={stats.active}
          color="#10b981"
          bands={bands}
        />
        <KpiChart
          title="New users/day"
          values={out.newUsers}
          headline={stats.news}
          color="#f59e0b"
          bands={bands}
        />
        <KpiChart
          title="Stickiness"
          values={out.stickiness}
          headline={stats.stickiness}
          color="#ec4899"
          bands={bands}
        />
      </div>
    </section>
  );
}
