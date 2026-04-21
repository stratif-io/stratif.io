import { useMemo, useState, useCallback } from "react";
import { useTwinOutput } from "./useTwinOutput";
import { KpiChart } from "./KpiChart";
import { useSeederStore } from "@/stores/seederStore";
import { resolveScale } from "@/lib/twin/utils";
import { resolveDateRange } from "@/lib/time/dateRange";
import { resolveSimParams } from "@/lib/twin";
import type { SimulationConfig } from "@/types/simulation";
import { headlineStat } from "./headlineStat";
import { formatNum } from "@/lib/format";
import { AnomalyFloatingEditor } from "@/features/anomalies/AnomalyFloatingEditor";
import { DayTable } from "./DayTable";

type AnomalyList = NonNullable<SimulationConfig["anomalies"]>;

const EMPTY_ANOMALIES: AnomalyList = [];

export function PreviewGrid() {
  const out = useTwinOutput();
  const anomalies = useSeederStore(
    (s) => s.config.anomalies ?? EMPTY_ANOMALIES,
  );
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const uiStartDate = useSeederStore((s) => s.uiStartDate);
  const uiEndDate = useSeederStore((s) => s.uiEndDate);
  const scaleOverride = useSeederStore((s) => s.config.scale_config);
  const scaleAxis = useSeederStore((s) => s.config.axes.scale ?? "small");
  const config = useSeederStore((s) => s.config);
  const { window_days } = useMemo(
    () => resolveScale(scaleAxis, scaleOverride),
    [scaleAxis, scaleOverride],
  );
  const {
    depth,
    retentionParams: rp,
    totalUsers,
    windowDays,
  } = useMemo(() => resolveSimParams(config), [config]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const fix1 = (v: number) => v.toFixed(1);
  const { start: chartStart, end: chartEnd } = useMemo(
    () => resolveDateRange(uiStartDate, uiEndDate, window_days),
    [uiStartDate, uiEndDate, window_days],
  );

  const handleAnomalyChange = useMemo(
    () => (idx: number, next: (typeof anomalies)[number]) => {
      const copy = anomalies.slice();
      copy[idx] = next;
      setAnomalies(copy);
    },
    [anomalies, setAnomalies],
  );

  const [selected, setSelected] = useState<{
    idx: number;
    x: number;
    y: number;
  } | null>(null);

  const handleAnomalySelect = useCallback(
    (idx: number, x: number, y: number) => {
      setSelected((prev) =>
        prev?.idx === idx && prev.x === x && prev.y === y
          ? null
          : { idx, x, y },
      );
    },
    [],
  );

  const allZero =
    out.events.every((v) => v === 0) && out.activeUsers.every((v) => v === 0);

  const stats = useMemo(
    () => ({
      events: headlineStat(out.events, "count"),
      active: headlineStat(out.activeUsers, "count"),
      news: headlineStat(out.newUsers, "count"),
      churned: headlineStat(out.churnedUsers, "count"),
      reactivated: headlineStat(out.reactivatedUsers, "count"),
      stickiness: headlineStat(out.stickiness, "percent"),
    }),
    [out],
  );

  const sharedProps = {
    anomalies,
    windowDays: window_days,
    onAnomalyChange: handleAnomalyChange,
    onAnomalySelect: handleAnomalySelect,
    startDate: chartStart,
    endDate: chartEnd,
  };

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex flex-col gap-2 lg:flex-1 lg:overflow-hidden p-2"
      onClick={() => setSelected(null)}
    >
      <header>
        <h2
          id="preview-heading"
          className="text-xs uppercase text-muted-foreground font-semibold"
        >
          Preview
        </h2>
      </header>
      {allZero ? (
        <div className="flex-1 flex items-center justify-center text-[13px] text-muted-foreground p-6 text-center">
          Preview is empty. Try a non-zero scale tier or increase total users in
          Tuning overrides.
        </div>
      ) : (
        <div
          data-testid="preview-grid-canvas"
          className="grid grid-cols-2 gap-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto"
        >
          <KpiChart
            title="Events/day"
            values={out.events}
            headline={stats.events}
            color="hsl(var(--chart-6))"
            className="col-span-2"
            chartHeight="h-40"
            formula={`events(t) = DAU(t) × ${depth}`}
            {...sharedProps}
          />
          <KpiChart
            title="Active users"
            values={out.activeUsers}
            headline={stats.active}
            color="hsl(var(--chart-8))"
            formula={`DAU(t) = Σ꜀ Poisson(N꜀ × S[t−c])  peak=${pct(rp.peakChurnRate)} τ=${rp.churnDecayDays}d`}
            {...sharedProps}
          />
          <KpiChart
            title="New users/day"
            values={out.newUsers}
            headline={stats.news}
            color="hsl(var(--chart-3))"
            formula={`N꜀ = Poisson(arrivals[c])  target=${formatNum(totalUsers)} users`}
            {...sharedProps}
          />
          <KpiChart
            title="Stickiness"
            values={out.stickiness.map((v) => (v === null ? null : v * 100))}
            headline={stats.stickiness}
            color="hsl(var(--chart-7))"
            valueSuffix="%"
            formula="DAU / MAU  (28-day window)"
            {...sharedProps}
          />
          <KpiChart
            title="Total users"
            values={out.totalUsers}
            headline={`total ${formatNum(out.totalUsers.at(-1) ?? 0)}`}
            color="hsl(var(--chart-2))"
            formula={`total(t) = Σ꜀≤t N꜀  over ${windowDays}d`}
            {...sharedProps}
          />
          <KpiChart
            title="Churned/day"
            values={out.churnedUsers}
            headline={stats.churned}
            color="hsl(var(--destructive))"
            formula={`churn(t) = Σ꜀ Poisson(N꜀×(S[k−1]−S[k]))  peak=${pct(rp.peakChurnRate)} base=${pct(rp.baseChurnRate)} τ=${rp.churnDecayDays}d`}
            {...sharedProps}
          />
          <KpiChart
            title="Reactivated/day"
            values={out.reactivatedUsers}
            headline={stats.reactivated}
            color="hsl(var(--chart-4))"
            formula={`react(t) = Σ꜀ Poisson(churned꜀×r×δ^(d−1))  r=${pct(rp.reactivationRate)} δ=${fix1(rp.reactivationDecay)}`}
            {...sharedProps}
          />
        </div>
      )}
      {!allZero && (
        <div className="border-t pt-2">
          <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">
            First days
          </h3>
          <DayTable out={out} />
        </div>
      )}
      {selected !== null && anomalies[selected.idx] && (
        <AnomalyFloatingEditor
          anomaly={anomalies[selected.idx]}
          x={selected.x}
          y={selected.y}
          onChange={(next) => handleAnomalyChange(selected.idx, next)}
          onDelete={() => {
            const copy = anomalies.filter((_, i) => i !== selected.idx);
            setAnomalies(copy);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
