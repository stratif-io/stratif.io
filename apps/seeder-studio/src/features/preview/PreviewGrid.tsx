import { useMemo, useState, useCallback } from "react";
import { useTwinOutput } from "./useTwinOutput";
import { KpiChart } from "./KpiChart";
import { useSeederStore } from "@/stores/seederStore";
import { resolveDateRange } from "@/lib/time/dateRange";
import { resolveSimParams } from "@/lib/twin";
import type { SimulationConfig } from "@/types/simulation";
import { headlineStat } from "./headlineStat";
import { formatNum } from "@/lib/format";
import { AnomalyFloatingEditor } from "@/features/anomalies/AnomalyFloatingEditor";
import { FORMULA_REGISTRY } from "./formulaRegistry";

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
  const config = useSeederStore((s) => s.config);
  const {
    depth,
    retentionParams: rp,
    totalUsers,
    windowDays,
  } = useMemo(() => resolveSimParams(config), [config]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const fix1 = (v: number) => v.toFixed(1);

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

  const formulaWhere: Record<string, string> = {
    events: `where: d = ${depth} events/user/day`,
    activeUsers: `where: peak churn = ${pct(rp.peakChurnRate)}, τ = ${rp.churnDecayDays}d`,
    newUsers: `where: target = ${formatNum(totalUsers)} users over ${windowDays}d`,
    stickiness: `where: 28-day rolling window`,
    totalUsers: `where: over ${windowDays}d`,
    churnedUsers: `where: peak = ${pct(rp.peakChurnRate)}, base = ${pct(rp.baseChurnRate)}, τ = ${rp.churnDecayDays}d`,
    reactivatedUsers: `where: r = ${pct(rp.reactivationRate)}, δ = ${fix1(rp.reactivationDecay)}`,
  };

  const { start: chartStart, end: chartEnd } = useMemo(
    () => resolveDateRange(uiStartDate, uiEndDate, windowDays),
    [uiStartDate, uiEndDate, windowDays],
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

  const sharedProps = {
    anomalies,
    windowDays,
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
          className="flex flex-col gap-5 lg:flex-1 lg:min-h-0 lg:overflow-y-auto"
        >
          {/* Acquisition */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/50">
              Acquisition
            </p>
            <div className="grid grid-cols-2 gap-4">
              <KpiChart
                title="New users/day"
                values={out.newUsers}
                headline={stats.news}
                color="hsl(var(--chart-3))"
                className="col-span-2"
                chartHeight="h-32"
                formulaLatex={FORMULA_REGISTRY.newUsers.latex}
                formulaWhere={formulaWhere.newUsers}
                formulaExplanation={FORMULA_REGISTRY.newUsers.explanation}
                {...sharedProps}
              />
              <KpiChart
                title="Total users"
                values={out.totalUsers}
                headline={`total ${formatNum(out.totalUsers.at(-1) ?? 0)}`}
                color="hsl(var(--chart-2))"
                formulaLatex={FORMULA_REGISTRY.totalUsers.latex}
                formulaWhere={formulaWhere.totalUsers}
                formulaExplanation={FORMULA_REGISTRY.totalUsers.explanation}
                {...sharedProps}
              />
            </div>
          </div>

          {/* Engagement */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/50">
              Engagement
            </p>
            <div className="grid grid-cols-2 gap-4">
              <KpiChart
                title="Events/day"
                values={out.events}
                headline={stats.events}
                color="hsl(var(--chart-6))"
                className="col-span-2"
                chartHeight="h-40"
                formulaLatex={FORMULA_REGISTRY.events.latex}
                formulaWhere={formulaWhere.events}
                formulaExplanation={FORMULA_REGISTRY.events.explanation}
                {...sharedProps}
              />
              <KpiChart
                title="Active users"
                values={out.activeUsers}
                headline={stats.active}
                color="hsl(var(--chart-8))"
                formulaLatex={FORMULA_REGISTRY.activeUsers.latex}
                formulaWhere={formulaWhere.activeUsers}
                formulaExplanation={FORMULA_REGISTRY.activeUsers.explanation}
                {...sharedProps}
              />
              <KpiChart
                title="Stickiness"
                values={out.stickiness.map((v) =>
                  v === null ? null : v * 100,
                )}
                headline={stats.stickiness}
                color="hsl(var(--chart-7))"
                valueSuffix="%"
                formulaLatex={FORMULA_REGISTRY.stickiness.latex}
                formulaWhere={formulaWhere.stickiness}
                formulaExplanation={FORMULA_REGISTRY.stickiness.explanation}
                {...sharedProps}
              />
            </div>
          </div>

          {/* Retention */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/50">
              Retention
            </p>
            <div className="grid grid-cols-2 gap-4">
              <KpiChart
                title="Churned/day"
                values={out.churnedUsers}
                headline={stats.churned}
                color="hsl(var(--destructive))"
                formulaLatex={FORMULA_REGISTRY.churnedUsers.latex}
                formulaWhere={formulaWhere.churnedUsers}
                formulaExplanation={FORMULA_REGISTRY.churnedUsers.explanation}
                {...sharedProps}
              />
              <KpiChart
                title="Reactivated/day"
                values={out.reactivatedUsers}
                headline={stats.reactivated}
                color="hsl(var(--chart-4))"
                formulaLatex={FORMULA_REGISTRY.reactivatedUsers.latex}
                formulaWhere={formulaWhere.reactivatedUsers}
                formulaExplanation={
                  FORMULA_REGISTRY.reactivatedUsers.explanation
                }
                {...sharedProps}
              />
            </div>
          </div>
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
