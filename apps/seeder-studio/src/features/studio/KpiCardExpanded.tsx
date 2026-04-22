import { useMemo, useState, useCallback, useEffect } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { MathFormula } from "@/lib/math/MathFormula";
import { FORMULA_REGISTRY } from "@/features/preview/formulaRegistry";
import type { MetricKey } from "@/features/preview/formulaRegistry";
import { KpiChart } from "@/features/preview/KpiChart";
import type { GhostLine } from "@/features/preview/KpiChart";
import { AnomalyFloatingEditor } from "@/features/anomalies/AnomalyFloatingEditor";
import { useTwinOutput } from "@/features/preview/useTwinOutput";
import { useSeederStore } from "@/stores/seederStore";
import { resolveSimParams } from "@/lib/twin";
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

function ghostLinesFor(
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
    case "stickiness":
      return [
        {
          key: "g_dau",
          label: "Active users",
          values: out.activeUsers,
          color: "hsl(var(--chart-8))",
        },
      ];
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
      ];
  }
}

export function KpiCardExpanded({ metricKey, color, onClose }: Props) {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!floatingEditor) return;
    const handler = (e: MouseEvent) => {
      const path = e.composedPath() as Element[];
      const inside = path.some((el) => el?.closest?.("[data-floating-editor]"));
      if (!inside) setFloatingEditor(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [floatingEditor]);

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

  const ghostLines = ghostLinesFor(metricKey, out);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl flex flex-col w-[min(92vw,980px)] max-h-[90vh] overflow-hidden">
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {entry.explanation.split(".")[0]}.
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {entry.explanation.split(".").slice(1).join(".").trim()}
              </p>
            </div>
          </div>
          <button
            aria-label="close"
            onClick={onClose}
            className="ml-6 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            ×
          </button>
        </div>

        {/* ── SCROLLABLE BODY ─────────────────────────────────────── */}
        <div className="overflow-y-auto flex flex-col divide-y divide-border/40">
          {/* STEP 1 — Visualise */}
          <section className="px-7 py-5">
            <SectionLabel step={1} label="Visualise" />
            <KpiChart
              title=""
              values={valuesFor(metricKey, out)}
              color={color}
              ghostLines={ghostLines}
              anomalies={anomalies}
              windowDays={windowDays}
              onAnomalyChange={handleAnomalyChange}
              onAnomalySelect={handleAnomalySelect}
              chartHeight="h-56"
              className="border-0 p-0 bg-transparent mt-3"
              valueSuffix={metricKey === "stickiness" ? "%" : ""}
            />
          </section>

          {/* STEP 2 & 3 — Math + Practice (two columns) */}
          <section className="grid grid-cols-2 divide-x divide-border/40">
            {/* LEFT: The formula */}
            <div className="px-7 py-6 flex flex-col gap-5">
              <SectionLabel step={2} label="The formula" />

              {/* Main formula — large display math */}
              <div className="rounded-xl bg-muted/40 px-5 py-4 overflow-x-auto">
                <MathFormula latex={entry.latex} display />
              </div>

              {/* Where clause — also math */}
              {entry.where && (
                <div className="rounded-lg bg-muted/20 px-4 py-3 overflow-x-auto">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                    where
                  </p>
                  <MathFormula latex={entry.where} />
                </div>
              )}

              {/* Symbol legend */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                  Variables
                </p>
                <table className="text-xs w-full">
                  <tbody>
                    {entry.variables.map((v) => (
                      <tr key={v.symbol} className="border-t border-border/30">
                        <td className="py-1.5 pr-4 text-primary align-middle whitespace-nowrap w-0">
                          <MathFormula latex={v.symbol} />
                        </td>
                        <td className="py-1.5 text-muted-foreground leading-snug">
                          {v.meaning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: In practice */}
            <div className="px-7 py-6 flex flex-col gap-5">
              <SectionLabel step={3} label="In practice" />

              {/* Current params */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                  Current parameters
                </p>
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <table className="text-xs w-full">
                    <tbody>
                      {params.map((p, i) => (
                        <tr
                          key={p.name}
                          className={i > 0 ? "border-t border-border/30" : ""}
                        >
                          <td className="px-4 py-2 text-muted-foreground">
                            {p.name}
                          </td>
                          <td className="px-4 py-2 font-mono font-semibold text-foreground text-right">
                            {p.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily trace */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                  First {N_DAYS} days — step by step
                </p>
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground/70">
                        <th className="px-3 py-2 text-left font-medium">Day</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Inputs
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Result
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map((row, i) => (
                        <tr
                          key={row.day}
                          className={i > 0 ? "border-t border-border/25" : ""}
                        >
                          <td className="px-3 py-2 font-mono text-muted-foreground">
                            d{row.day}
                          </td>
                          <td
                            className="px-3 py-2 text-muted-foreground font-mono text-[11px] max-w-[180px] truncate"
                            title={row.computation}
                          >
                            {row.computation}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                            {row.result}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

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
    </div>
  );
}

function SectionLabel({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
        {step}
      </span>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}
