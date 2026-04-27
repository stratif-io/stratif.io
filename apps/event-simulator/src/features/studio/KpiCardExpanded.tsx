import { useMemo, useState, useCallback, useEffect } from "react";
import type { SimulationAnomaly } from "@/types/simulation";
import { MathFormula } from "@/lib/math/MathFormula";
import { FORMULA_REGISTRY } from "@/features/preview/formulaRegistry";
import type { MetricKey } from "@/features/preview/formulaRegistry";
import { KpiChart } from "@/features/preview/KpiChart";
import { AnomalyFloatingEditor } from "@/features/anomalies/AnomalyFloatingEditor";
import { useTwinOutput } from "@/features/preview/useTwinOutput";
import { useSeederStore } from "@/stores/seederStore";
import {
  resolveSimParams,
  getAxisValue,
  resolveAxes,
  resolveScale,
} from "@/lib/twin";
import { formatNum } from "@/lib/format";
import { buildDailyRows, valuesFor, ghostLinesFor } from "./kpiMetricUtils";
import { METRIC_PIPELINES } from "./kpiPipelineConfigs";
import { PipelineFormula } from "./PipelineFormula";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const fix1 = (v: number) => v.toFixed(1);

const METRIC_LABELS: Record<MetricKey, string> = {
  events: "Events",
  activeUsers: "Active users",
  newUsers: "New users",
  stickiness: "Stickiness",
  totalUsers: "Total users",
  churnedUsers: "Churned users",
  reactivatedUsers: "Reactivated",
};

interface Props {
  metricKey: MetricKey;
  color?: string;
  onClose: () => void;
}

export function KpiCardExpanded({ metricKey, color, onClose }: Props) {
  const { isLoading, ...out } = useTwinOutput();
  const config = useSeederStore((s) => s.config);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const setAxis = useSeederStore((s) => s.setAxis);
  const setScaleConfig = useSeederStore((s) => s.setScaleConfig);
  const {
    depth,
    retentionParams: rp,
    totalUsers,
    windowDays,
  } = useMemo(() => resolveSimParams(config), [config]);

  const anomalies = useMemo(() => config.anomalies ?? [], [config.anomalies]);

  const resolvedAxes = useMemo(
    () => resolveAxes(config.axes ?? {}),
    [config.axes],
  );

  const resolvedScaleObj = useMemo(
    () => resolveScale(resolvedAxes.scale, config.scale_config),
    [resolvedAxes.scale, config.scale_config],
  );
  const simulationMode = resolvedScaleObj.mode;
  const startingRate =
    simulationMode === "rate" ? resolvedScaleObj.starting_rate : null;

  const chartTitle = useMemo(() => {
    const base = METRIC_LABELS[metricKey];
    if (metricKey === "totalUsers" && simulationMode === "rate")
      return `~${base}`;
    return base;
  }, [metricKey, simulationMode]);

  const growthLatex = useMemo(() => {
    const axis = resolvedAxes.growth;
    const split =
      (config.growth_config?.split_fraction as number | undefined) ?? 0.3;
    const rate = (config.growth_config?.rate as number | undefined) ?? 0.04;
    const splitPct = Math.round(split * 100);
    const scale = simulationMode === "rate" ? "\\lambda_0" : "\\tfrac{U}{T}";
    switch (axis) {
      case "flat":
        return `G(t) = ${scale}`;
      case "steady":
        return `G(t) = ${scale}\\,(1 + 0.005\\,t)`;
      case "weak":
        return `G(t) = ${scale}\\left(0.5 + \\dfrac{t}{T}\\right)`;
      case "explosive":
        return simulationMode === "rate"
          ? `G(t) = \\lambda_0\\,e^{0.08\\,t}`
          : `G(t) = C\\,e^{0.08\\,t},\\quad C = \\dfrac{0.08\\,U}{e^{0.08T}-1}`;
      case "strong":
        return simulationMode === "rate"
          ? `G(t) = \\lambda_0\\,e^{${rate}\\,t}`
          : `G(t) = C\\,e^{${rate}\\,t},\\quad C = \\dfrac{${rate}\\,U}{e^{${rate}T}-1}`;
      case "declining":
        return `G(t) = ${scale.replace("\\tfrac", "\\dfrac")}\\,e^{-0.015\\,t}`;
      case "seasonal": {
        const amp =
          (config.growth_config?.amplitude as number | undefined) ?? 0.3;
        return `G(t) = ${scale}\\,\\bigl(1 + ${amp}\\sin\\tfrac{2\\pi t}{365}\\bigr)`;
      }
      case "hockey_stick":
        return (
          `G(t) = \\begin{cases} ${scale} & t < t_0 \\\\ ${scale}\\,e^{${rate}(t-t_0)} & t \\ge t_0 \\end{cases}` +
          `,\\quad t_0 = ${splitPct}\\%\\,T`
        );
      default:
        return "G(t)";
    }
  }, [resolvedAxes.growth, config.growth_config, simulationMode]);

  const [floatingEditor, setFloatingEditor] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredLineKey, setHoveredLineKey] = useState<string | null>(null);
  const [clickedLineKey, setClickedLineKey] = useState<string | null>(null);
  const focusedLineKey = clickedLineKey ?? hoveredLineKey;
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set());

  const handleFormulaClick = useCallback((key: string) => {
    setClickedLineKey((prev) => (prev === key ? null : key));
  }, []);

  const toggleStep = useCallback((key: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!clickedLineKey) return;
    const handler = (e: MouseEvent) => {
      const path = e.composedPath() as Element[];
      const inside = path.some(
        (el) =>
          el?.closest?.("[data-pipeline-formula]") ||
          el?.closest?.("[data-radix-popper-content-wrapper]") ||
          el?.closest?.("[data-radix-portal]"),
      );
      if (!inside) setClickedLineKey(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clickedLineKey]);

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

  const params: { sym: string; name: string; value: string }[] = useMemo(() => {
    const k =
      (getAxisValue("virality", resolvedAxes.virality)?.params.k as
        | number
        | undefined) ?? 0;
    const sigma =
      (getAxisValue("anomalies", resolvedAxes.anomalies)?.params.sigma as
        | number
        | undefined) ?? 0;
    switch (metricKey) {
      case "events":
        return [{ sym: "d", name: "events / user / day", value: `${depth}` }];
      case "activeUsers":
        return [
          { sym: "θ₀", name: "peak churn rate", value: pct(rp.peakChurnRate) },
          { sym: "θ∞", name: "base churn rate", value: pct(rp.baseChurnRate) },
          { sym: "τ", name: "churn decay", value: `${rp.churnDecayDays} d` },
          {
            sym: "r",
            name: "reactivation rate",
            value: pct(rp.reactivationRate),
          },
          {
            sym: "δ",
            name: "reactivation decay",
            value: fix1(rp.reactivationDecay),
          },
          {
            sym: "D",
            name: "max dormant days",
            value: `${rp.maxDormantDays} d`,
          },
        ];
      case "churnedUsers":
        return [
          { sym: "θ₀", name: "peak churn rate", value: pct(rp.peakChurnRate) },
          { sym: "θ∞", name: "base churn rate", value: pct(rp.baseChurnRate) },
          { sym: "τ", name: "churn decay", value: `${rp.churnDecayDays} d` },
          {
            sym: "r",
            name: "reactivation rate",
            value: pct(rp.reactivationRate),
          },
          {
            sym: "δ",
            name: "reactivation decay",
            value: fix1(rp.reactivationDecay),
          },
          {
            sym: "D",
            name: "max dormant days",
            value: `${rp.maxDormantDays} d`,
          },
        ];
      case "newUsers":
        return simulationMode === "rate"
          ? [
              {
                sym: "λ₀",
                name: "starting arrival rate (users/day)",
                value: `${startingRate ?? "—"} /d`,
              },
              { sym: "T", name: "window", value: `${windowDays} d` },
              { sym: "K", name: "viral K-factor", value: k.toFixed(2) },
              { sym: "σ", name: "jitter noise", value: sigma.toFixed(2) },
            ]
          : [
              {
                sym: "U",
                name: "target total users",
                value: formatNum(totalUsers),
              },
              { sym: "T", name: "window", value: `${windowDays} d` },
              { sym: "K", name: "viral K-factor", value: k.toFixed(2) },
              { sym: "σ", name: "jitter noise", value: sigma.toFixed(2) },
            ];
      case "reactivatedUsers":
        return [
          { sym: "θ₀", name: "peak churn rate", value: pct(rp.peakChurnRate) },
          { sym: "θ∞", name: "base churn rate", value: pct(rp.baseChurnRate) },
          { sym: "τ", name: "churn decay", value: `${rp.churnDecayDays} d` },
          {
            sym: "r",
            name: "base reactivation rate",
            value: pct(rp.reactivationRate),
          },
          {
            sym: "δ",
            name: "decay per dormant day",
            value: fix1(rp.reactivationDecay),
          },
          {
            sym: "D",
            name: "max dormant days",
            value: `${rp.maxDormantDays} d`,
          },
        ];
      case "stickiness":
        return [{ sym: "W", name: "MAU rolling window", value: "28 d" }];
      case "totalUsers":
        return [{ sym: "T", name: "window", value: `${windowDays} d` }];
      default: {
        const _exhaustive: never = metricKey;
        throw new Error(`Unhandled metricKey: ${_exhaustive}`);
      }
    }
  }, [
    metricKey,
    depth,
    rp,
    totalUsers,
    windowDays,
    startingRate,
    simulationMode,
    resolvedAxes.anomalies,
    resolvedAxes.virality,
  ]);

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

  // Resolve pipeline config — fallback to undefined (triggers static formula)
  const pipeline = METRIC_PIPELINES[metricKey];

  // In rate mode, rewrite newUsers pipeline steps to remove U references.
  // λ₀ is intentionally kept only in tooltipParamSyms (not tooltipVarSymbols)
  // so it appears exactly once — as a param row with its editable value.
  const effectiveSteps = useMemo(() => {
    if (!pipeline || metricKey !== "newUsers" || simulationMode !== "rate")
      return pipeline?.steps;
    return pipeline.steps.map((step) => {
      if (step.lineKey === "g_growth") {
        return {
          ...step,
          tooltipVarSymbols: ["t", "G(t)", "T"],
          tooltipParamSyms: ["λ₀", "T"],
          axisVarMap: { "G(t)": "growth" },
        };
      }
      if (step.lineKey === "__main__") {
        return {
          ...step,
          tooltipVarSymbols: ["N(t)", "\\lambda(t)", "V(t)"],
          tooltipParamSyms: ["λ₀", "T"],
          axisVarMap: {},
        };
      }
      return step;
    });
  }, [pipeline, metricKey, simulationMode]);

  // Hide λ₀ from the variable-description list (it shows via params instead).
  // Hide U in rate mode; hide λ₀ in goal mode.
  const effectiveVars = useMemo(() => {
    if (metricKey !== "newUsers") return entry.variables;
    return entry.variables.filter((v) =>
      simulationMode === "rate"
        ? v.symbol !== "U" && v.symbol !== "\\lambda_0"
        : v.symbol !== "\\lambda_0",
    );
  }, [entry.variables, metricKey, simulationMode]);

  // Intermediate cols filtered by checked steps (only when pipeline exists)
  const activeCols = pipeline
    ? pipeline.intermediateCols.filter((c) => checkedSteps.has(c.stepKey))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
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
            <KpiChart
              title={chartTitle}
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
              focusedLineKey={focusedLineKey}
              onFocusedLineKeyChange={(k) => {
                setClickedLineKey(k);
                setHoveredLineKey(null);
              }}
              isLoading={isLoading}
            />
          </section>

          {/* STEP 2 & 3 — Math + Practice (two columns) */}
          <section className="grid grid-cols-[3fr_2fr] divide-x divide-border/40">
            {/* LEFT: The formula */}
            <div className="px-7 py-6 flex flex-col gap-5">
              <h3 className="text-xs font-semibold text-foreground/80">
                {METRIC_LABELS[metricKey]} — how it's computed
              </h3>

              {pipeline ? (
                <>
                  <PipelineFormula
                    ghostLines={ghostLines}
                    mainColor={color ?? "hsl(var(--chart-1))"}
                    focusedKey={focusedLineKey}
                    clickedKey={clickedLineKey}
                    onHover={setHoveredLineKey}
                    onClick={handleFormulaClick}
                    steps={effectiveSteps ?? pipeline.steps}
                    axisMap={pipeline.axisMap}
                    footnote={pipeline.footnote}
                    latexOverrides={
                      metricKey === "newUsers"
                        ? {
                            g_growth: growthLatex,
                            ...(simulationMode === "rate"
                              ? {
                                  __main__:
                                    "N(t) \\sim \\operatorname{Poisson}\\!\\left(V(t)\\right)",
                                }
                              : {}),
                          }
                        : {}
                    }
                    axes={resolvedAxes}
                    onAxisChange={setAxis}
                    checkedSteps={checkedSteps}
                    onToggleStep={toggleStep}
                    allVars={effectiveVars}
                    allParams={params}
                    editableParams={
                      simulationMode === "rate" && metricKey === "newUsers"
                        ? {
                            "λ₀": (val) =>
                              setScaleConfig({
                                ...config.scale_config,
                                starting_rate: val,
                              }),
                          }
                        : undefined
                    }
                  />

                  {/* Where clause */}
                  {entry.where && (
                    <div className="rounded-lg bg-muted/20 px-4 py-3 overflow-x-auto">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                        where
                      </p>
                      <MathFormula latex={entry.where} />
                    </div>
                  )}
                </>
              ) : (
                <>
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
                        {effectiveVars.map((v) => (
                          <tr
                            key={v.symbol}
                            className="border-t border-border/30"
                          >
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
                </>
              )}
            </div>

            {/* RIGHT: In practice */}
            <div className="px-7 py-6 flex flex-col gap-5 min-w-0">
              {/* Daily trace */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                  Daily trace · {windowDays} days
                </p>
                <div className="rounded-xl border border-border/40 overflow-hidden">
                  <div className="overflow-auto max-h-64">
                    <table className="text-xs w-full min-w-[360px]">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr className="bg-muted/30 text-muted-foreground/70">
                          <th className="px-3 py-2 text-left font-medium">t</th>
                          {activeCols.map((c, idx) => (
                            <th
                              key={`${c.stepKey}-${idx}`}
                              className="px-3 py-2 text-right font-medium whitespace-nowrap"
                              style={{ color: c.color }}
                            >
                              {c.label}
                            </th>
                          ))}
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
                              {row.day}
                            </td>
                            {activeCols.map((c, idx) => (
                              <td
                                key={`${c.stepKey}-${idx}`}
                                className="px-3 py-2 text-right font-mono"
                              >
                                {c.getValue(out, i)}
                              </td>
                            ))}
                            <td
                              className="px-3 py-2 text-muted-foreground font-mono text-[11px] max-w-[140px] truncate"
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
