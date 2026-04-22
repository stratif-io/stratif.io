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
import { DayTable } from "./DayTable";
import { FORMULA_REGISTRY } from "./formulaRegistry";
import { SimMathPanel } from "./SimMathPanel";
import type { SimMathEntry } from "./SimMathPanel";

type AnomalyList = NonNullable<SimulationConfig["anomalies"]>;

const EMPTY_ANOMALIES: AnomalyList = [];

const METRIC_LABELS: Record<string, string> = {
  events: "Events/day",
  activeUsers: "Active users",
  newUsers: "New users/day",
  stickiness: "Stickiness",
  totalUsers: "Total users",
  churnedUsers: "Churned/day",
  reactivatedUsers: "Reactivated/day",
};

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

  const N_DAYS = 7;
  const fn = (v: number) => formatNum(Math.round(v));

  const simMathEntries = useMemo(
    (): SimMathEntry[] => {
      const n = Math.min(N_DAYS, out.activeUsers.length);

      const activeDailyRows = Array.from({ length: n }, (_, i) => {
        const prev = i === 0 ? 0 : out.activeUsers[i - 1];
        const newU = out.newUsers[i];
        const churn = out.churnedUsers[i];
        const react = out.reactivatedUsers[i];
        return {
          day: i + 1,
          formulaLabeled: `DAU(${i})=${fn(prev)} + N(${i + 1})=${fn(newU)} − C(${i + 1})=${fn(churn)} + R(${i + 1})=${fn(react)}`,
          formula: `${fn(prev)} + ${fn(newU)} − ${fn(churn)} + ${fn(react)}`,
          result: fn(out.activeUsers[i]),
        };
      });

      const eventsDailyRows = Array.from({ length: n }, (_, i) => ({
        day: i + 1,
        formulaLabeled: `DAU(${i + 1})=${fn(out.activeUsers[i])} × d=${depth}`,
        formula: `${fn(out.activeUsers[i])} × ${depth}`,
        result: fn(out.events[i]),
      }));

      const newUsersDailyRows = Array.from({ length: n }, (_, i) => ({
        day: i + 1,
        formulaLabeled: `λ(${i + 1})=${out.arrivals[i].toFixed(1)}`,
        formula: `Poisson(${out.arrivals[i].toFixed(1)})`,
        result: fn(out.newUsers[i]),
      }));

      const totalDailyRows = Array.from({ length: n }, (_, i) => {
        const prev = i === 0 ? 0 : out.totalUsers[i - 1];
        return {
          day: i + 1,
          formulaLabeled: `T(${i})=${fn(prev)} + N(${i + 1})=${fn(out.newUsers[i])}`,
          formula: `${fn(prev)} + ${fn(out.newUsers[i])}`,
          result: fn(out.totalUsers[i]),
        };
      });

      const churnedDailyRows = Array.from({ length: n }, (_, i) => {
        const prevActive = i === 0 ? 0 : out.activeUsers[i - 1];
        const rate =
          prevActive > 0
            ? `${((out.churnedUsers[i] / prevActive) * 100).toFixed(1)}%`
            : "—";
        return {
          day: i + 1,
          formulaLabeled: `DAU(${i})=${fn(prevActive)} × λ(${i + 1})=${rate}`,
          formula: `${fn(prevActive)} × ${rate}`,
          result: fn(out.churnedUsers[i]),
        };
      });

      const reactivatedDailyRows = Array.from({ length: n }, (_, i) => ({
        day: i + 1,
        formulaLabeled: `R(${i + 1})=${fn(out.reactivatedUsers[i])}`,
        result: fn(out.reactivatedUsers[i]),
      }));

      const stickinessDailyRows = Array.from({ length: n }, (_, i) => {
        const s = out.stickiness[i];
        const val = s === null ? "—" : `${(s * 100).toFixed(1)}%`;
        return {
          day: i + 1,
          formulaLabeled: `DAU(${i + 1})=${fn(out.activeUsers[i])} / MAU(${i + 1})`,
          formula: `${fn(out.activeUsers[i])} / MAU`,
          result: val,
        };
      });

      return [
        {
          metric: METRIC_LABELS.events,
          ...FORMULA_REGISTRY.events,
          where: formulaWhere.events,
          params: [{ name: "d (depth)", value: `${depth} events/user/day` }],
          outputValue: stats.events,
          dailyRows: eventsDailyRows,
        },
        {
          metric: METRIC_LABELS.activeUsers,
          ...FORMULA_REGISTRY.activeUsers,
          where: formulaWhere.activeUsers,
          params: [
            { name: "peak churn rate", value: pct(rp.peakChurnRate) },
            { name: "churn decay τ", value: `${rp.churnDecayDays}d` },
            { name: "reactivation r", value: pct(rp.reactivationRate) },
          ],
          outputValue: stats.active,
          dailyRows: activeDailyRows,
        },
        {
          metric: METRIC_LABELS.newUsers,
          ...FORMULA_REGISTRY.newUsers,
          where: formulaWhere.newUsers,
          params: [
            { name: "target users", value: formatNum(totalUsers) },
            { name: "window", value: `${windowDays}d` },
          ],
          outputValue: stats.news,
          dailyRows: newUsersDailyRows,
        },
        {
          metric: METRIC_LABELS.stickiness,
          ...FORMULA_REGISTRY.stickiness,
          where: formulaWhere.stickiness,
          params: [{ name: "MAU window", value: "28d" }],
          outputValue: stats.stickiness,
          dailyRows: stickinessDailyRows,
        },
        {
          metric: METRIC_LABELS.totalUsers,
          ...FORMULA_REGISTRY.totalUsers,
          where: formulaWhere.totalUsers,
          params: [{ name: "window", value: `${windowDays}d` }],
          outputValue: `total ${formatNum(out.totalUsers.at(-1) ?? 0)}`,
          dailyRows: totalDailyRows,
        },
        {
          metric: METRIC_LABELS.churnedUsers,
          ...FORMULA_REGISTRY.churnedUsers,
          where: formulaWhere.churnedUsers,
          params: [
            { name: "peak churn rate", value: pct(rp.peakChurnRate) },
            { name: "base churn rate", value: pct(rp.baseChurnRate) },
            { name: "churn decay τ", value: `${rp.churnDecayDays}d` },
            { name: "max dormant days", value: `${rp.maxDormantDays}d` },
          ],
          outputValue: stats.churned,
          dailyRows: churnedDailyRows,
        },
        {
          metric: METRIC_LABELS.reactivatedUsers,
          ...FORMULA_REGISTRY.reactivatedUsers,
          where: formulaWhere.reactivatedUsers,
          params: [
            { name: "reactivation rate r", value: pct(rp.reactivationRate) },
            { name: "decay factor δ", value: fix1(rp.reactivationDecay) },
            { name: "max dormant days", value: `${rp.maxDormantDays}d` },
          ],
          outputValue: stats.reactivated,
          dailyRows: reactivatedDailyRows,
        },
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depth, rp, totalUsers, windowDays, stats, out],
  );

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

          <div
            className="border-t pt-2 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">
                First days
              </h3>
              <DayTable out={out} />
            </div>
            <SimMathPanel entries={simMathEntries} />
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
