import { useMemo, useState, useCallback } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { MathFormula } from "@/lib/math/MathFormula";
import { FORMULA_REGISTRY } from "@/features/preview/formulaRegistry";
import type { MetricKey } from "@/features/preview/formulaRegistry";
import { KpiChart } from "@/features/preview/KpiChart";
import type { KpiBand } from "@/features/preview/KpiChart";
import { AnomalyFloatingEditor } from "@/features/anomalies/AnomalyFloatingEditor";
import { useTwinOutput } from "@/features/preview/useTwinOutput";
import { useSeederStore } from "@/stores/seederStore";
import { resolveSimParams, anomalyTypeColor } from "@/lib/twin";
import { parseDays } from "@/lib/twin/utils";
import { formatNum } from "@/lib/format";

const N_DAYS = 7;
const fn = (v: number) => formatNum(Math.round(v));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const fix1 = (v: number) => v.toFixed(1);

interface DailyRow {
  day: number;
  formula: string;
  computation: string;
  result: string;
}

interface Props {
  metricKey: MetricKey;
  color: string;
  bands: KpiBand[];
  onClose: () => void;
}

function buildDailyRows(
  metricKey: MetricKey,
  out: ReturnType<typeof useTwinOutput>,
  depth: number,
): DailyRow[] {
  const n = Math.min(N_DAYS, out.activeUsers.length);
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
      case "newUsers":
        return {
          day,
          formula: `λ(${day})=${fix1(out.arrivals[i])}`,
          computation: `Poisson(${fix1(out.arrivals[i])})`,
          result: fn(out.newUsers[i]),
        };
      case "events":
        return {
          day,
          formula: `DAU(${day})=${fn(out.activeUsers[i])} × d=${depth}`,
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
          formula: `Σ ch_c · r · δ^(d-1)`,
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

function valuesFor(
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

// eslint-disable-next-line react-refresh/only-export-components
export function toBands(
  anomalies: SimulationAnomaly[] | undefined,
  days: number,
): (KpiBand & { index: number })[] {
  if (!anomalies?.length) return [];
  return anomalies.flatMap((a, i) => {
    const rawStart = parseDays(a.start);
    const rawDur = parseDays(a.duration);
    if (rawStart === null || rawDur === null || rawDur <= 0) return [];
    const start = rawStart < 0 ? days + rawStart : rawStart;
    return [
      { start, end: start + rawDur, color: anomalyTypeColor(a.type), index: i },
    ];
  });
}

export function KpiCardExpanded({ metricKey, color, bands, onClose }: Props) {
  const out = useTwinOutput();
  const config = useSeederStore((s) => s.config);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const {
    depth,
    retentionParams: rp,
    totalUsers,
    windowDays,
  } = useMemo(() => resolveSimParams(config), [config]);

  const anomalies = useMemo(() => config.anomalies ?? [], [config.anomalies]);

  const [floatingEditor, setFloatingEditor] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const entry = FORMULA_REGISTRY[metricKey];

  const handleAnomalyChange = useCallback(
    (index: number, next: SimulationAnomaly) => {
      const updated = anomalies.map((a, i) => (i === index ? next : a));
      setAnomalies(updated);
    },
    [anomalies, setAnomalies],
  );

  const handleAnomalySelect = useCallback(
    (index: number, x: number, y: number) => {
      setFloatingEditor((prev) =>
        prev?.index === index ? null : { index, x, y },
      );
    },
    [],
  );

  const params: { name: string; value: string }[] = useMemo(() => {
    switch (metricKey) {
      case "events":
        return [{ name: "d (depth)", value: `${depth} events/user/day` }];
      case "activeUsers":
      case "churnedUsers":
        return [
          { name: "peak churn", value: pct(rp.peakChurnRate) },
          { name: "base churn", value: pct(rp.baseChurnRate) },
          { name: "τ (decay)", value: `${rp.churnDecayDays}d` },
        ];
      case "newUsers":
        return [
          { name: "target users (U)", value: formatNum(totalUsers) },
          { name: "window", value: `${windowDays}d` },
        ];
      case "reactivatedUsers":
        return [
          { name: "r (base rate)", value: pct(rp.reactivationRate) },
          { name: "δ (decay)", value: fix1(rp.reactivationDecay) },
          { name: "max dormant", value: `${rp.maxDormantDays}d` },
        ];
      case "stickiness":
        return [{ name: "window", value: "28-day rolling" }];
      case "totalUsers":
        return [{ name: "window", value: `${windowDays}d` }];
      default: {
        const _exhaustive: never = metricKey;
        throw new Error(`Unhandled metricKey: ${_exhaustive}`);
      }
    }
  }, [metricKey, depth, rp, totalUsers, windowDays]);

  const dailyRows = useMemo(
    () => buildDailyRows(metricKey, out, depth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      metricKey,
      depth,
      out.activeUsers,
      out.newUsers,
      out.churnedUsers,
      out.reactivatedUsers,
      out.stickiness,
      out.totalUsers,
      out.arrivals,
    ],
  );

  return (
    <div className="col-span-3 rounded-lg border border-primary/40 bg-card p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {entry.explanation.split(".")[0]}.
        </h3>
        <button
          aria-label="close"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none px-1"
        >
          ×
        </button>
      </div>

      <KpiChart
        title=""
        values={valuesFor(metricKey, out)}
        color={color}
        bands={bands}
        anomalies={anomalies}
        windowDays={windowDays}
        onAnomalyChange={handleAnomalyChange}
        onAnomalySelect={handleAnomalySelect}
        chartHeight="h-40"
        className="border-0 p-0 bg-transparent"
        valueSuffix={metricKey === "stickiness" ? "%" : ""}
      />

      {floatingEditor !== null && anomalies[floatingEditor.index] && (
        <AnomalyFloatingEditor
          anomaly={anomalies[floatingEditor.index]}
          x={floatingEditor.x}
          y={floatingEditor.y}
          onChange={(next) => handleAnomalyChange(floatingEditor.index, next)}
          onDelete={() => {
            setAnomalies(
              anomalies.filter((_, i) => i !== floatingEditor.index),
            );
            setFloatingEditor(null);
          }}
          onClose={() => setFloatingEditor(null)}
        />
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: formula + variables */}
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <MathFormula latex={entry.latex} />
          </div>
          <table className="text-[11px] w-full">
            <tbody>
              {entry.variables.map((v) => (
                <tr key={v.symbol} className="border-t border-border/40">
                  <td className="py-0.5 pr-2 font-mono text-primary align-top">
                    <MathFormula latex={v.symbol} />
                  </td>
                  <td className="py-0.5 text-muted-foreground">{v.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Center: params */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Current params
          </p>
          <table className="text-[11px] w-full">
            <tbody>
              {params.map((p) => (
                <tr key={p.name} className="border-t border-border/40">
                  <td className="py-0.5 pr-2 text-muted-foreground">
                    {p.name}
                  </td>
                  <td className="py-0.5 font-mono font-semibold text-foreground">
                    {p.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: daily breakdown */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            First {N_DAYS} days
          </p>
          <table className="text-[10px] w-full">
            <thead>
              <tr className="text-muted-foreground/60">
                <th className="text-left font-normal pb-1 pr-2">day</th>
                <th className="text-left font-normal pb-1 pr-2">formula</th>
                <th className="text-left font-normal pb-1 pr-2">computation</th>
                <th className="text-right font-normal pb-1">=</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((row) => (
                <tr key={row.day} className="border-t border-border/30">
                  <td className="py-0.5 pr-2 font-mono text-muted-foreground">{`d${row.day}`}</td>
                  <td
                    className="py-0.5 pr-2 text-muted-foreground max-w-[120px] truncate"
                    title={row.formula}
                  >
                    {row.formula}
                  </td>
                  <td className="py-0.5 pr-2 font-mono">{row.computation}</td>
                  <td className="py-0.5 text-right font-mono font-semibold text-foreground">
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
