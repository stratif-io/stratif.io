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
import { resolveSimParams, getAxisValue } from "@/lib/twin";
import { formatNum } from "@/lib/format";
import { Popover, PopoverTrigger, PopoverContent } from "@stratif-io/web";
import { AXIS_DISPLAY } from "@/features/axes/axisDisplaySpec";
import { AxisPopover } from "@/features/studio/AxisPopover";

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

// ── Pipeline config types ───────────────────────────────────────────────────

interface PipelineStep {
  lineKey: string;
  label: string;
  latex: string;
  color: string;
}

interface IntermediateCol {
  stepKey: string;
  label: string;
  color: string;
  getValue: (out: ReturnType<typeof useTwinOutput>, i: number) => string;
}

interface MetricPipelineConfig {
  steps: PipelineStep[];
  axisMap: Record<string, string>;
  intermediateCols: IntermediateCol[];
  footnote?: string;
}

// ── Per-metric pipeline configs ─────────────────────────────────────────────

const METRIC_PIPELINES: Partial<Record<MetricKey, MetricPipelineConfig>> = {
  newUsers: {
    steps: [
      {
        lineKey: "g_growth",
        label: "Growth curve",
        latex: "G(t)",
        color: "hsl(var(--chart-2))",
      },
      {
        lineKey: "g_anom",
        label: "Anomaly multipliers",
        latex: "A(t) = G(t) \\cdot \\prod_k m_k(t)",
        color: "hsl(var(--chart-5))",
      },
      {
        lineKey: "g_jitter",
        label: "Stochastic jitter",
        latex: "J(t) = A(t)\\,(1 + \\sigma Z),\\quad Z \\sim \\mathcal{N}(0,1)",
        color: "hsl(var(--chart-6))",
      },
      {
        lineKey: "g_viral",
        label: "Viral amplification",
        latex: "V(t) = J(t) + K \\cdot \\mathrm{DAU}(t{-}1)",
        color: "hsl(var(--chart-4))",
      },
      {
        lineKey: "__main__",
        label: "Poisson draw",
        latex:
          "N(t) \\sim \\operatorname{Poisson}\\!\\left(\\frac{V(t)}{\\sum_s V(s)} \\cdot U\\right)",
        color: "",
      },
    ],
    axisMap: {
      g_growth: "growth",
      g_jitter: "anomalies",
      g_viral: "virality",
      __main__: "scale",
    },
    intermediateCols: [
      {
        stepKey: "g_growth",
        label: "G(t)",
        color: "hsl(var(--chart-2))",
        getValue: (out, i) => out.pipeline.growth[i]?.toFixed(1) ?? "—",
      },
      {
        stepKey: "g_anom",
        label: "A(t)",
        color: "hsl(var(--chart-5))",
        getValue: (out, i) => out.pipeline.anomalies[i]?.toFixed(1) ?? "—",
      },
      {
        stepKey: "g_jitter",
        label: "J(t)",
        color: "hsl(var(--chart-6))",
        getValue: (out, i) => out.pipeline.jitter[i]?.toFixed(1) ?? "—",
      },
      {
        stepKey: "g_viral",
        label: "DAU(t-1)",
        color: "hsl(var(--chart-8))",
        getValue: (out, i) =>
          i === 0 ? "0" : formatNum(Math.round(out.activeUsers[i - 1])),
      },
      {
        stepKey: "g_viral",
        label: "V(t)",
        color: "hsl(var(--chart-4))",
        getValue: (out, i) => out.pipeline.virality[i]?.toFixed(1) ?? "—",
      },
    ],
    footnote:
      "DAU = daily active users (estimated from previous day's cohorts)",
  },

  activeUsers: {
    steps: [
      {
        lineKey: "g_new",
        label: "New users",
        latex: "N(t) \\sim \\operatorname{Poisson}(\\lambda(t))",
        color: "hsl(var(--chart-3))",
      },
      {
        lineKey: "g_churn",
        label: "Churn",
        latex:
          "\\text{Churn}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot (S[k{-}1]-S[k])\\right)",
        color: "hsl(var(--destructive))",
      },
      {
        lineKey: "g_react",
        label: "Reactivation",
        latex:
          "\\text{React}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(\\text{ch}_c \\cdot r \\cdot \\delta^{d-1}\\right)",
        color: "hsl(var(--chart-4))",
      },
      {
        lineKey: "__main__",
        label: "DAU update",
        latex:
          "\\text{DAU}(t) = \\text{DAU}(t{-}1) + N(t) - \\text{Churn}(t) + \\text{React}(t)",
        color: "",
      },
    ],
    axisMap: { g_new: "scale", g_churn: "stickiness" },
    intermediateCols: [
      {
        stepKey: "g_new",
        label: "N(t)",
        color: "hsl(var(--chart-3))",
        getValue: (out, i) => fn(out.newUsers[i]),
      },
      {
        stepKey: "g_churn",
        label: "Churn(t)",
        color: "hsl(var(--destructive))",
        getValue: (out, i) => fn(out.churnedUsers[i]),
      },
      {
        stepKey: "g_react",
        label: "React(t)",
        color: "hsl(var(--chart-4))",
        getValue: (out, i) => fn(out.reactivatedUsers[i]),
      },
    ],
  },

  events: {
    steps: [
      {
        lineKey: "g_dau",
        label: "Active users",
        latex:
          "\\text{DAU}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot S[t{-}c]\\right)",
        color: "hsl(var(--chart-8))",
      },
      {
        lineKey: "__main__",
        label: "Events",
        latex: "\\text{Events}(t) = \\text{DAU}(t) \\times d",
        color: "",
      },
    ],
    axisMap: { g_dau: "stickiness", __main__: "engagement" },
    intermediateCols: [
      {
        stepKey: "g_dau",
        label: "DAU(t)",
        color: "hsl(var(--chart-8))",
        getValue: (out, i) => fn(out.activeUsers[i]),
      },
    ],
  },

  stickiness: {
    steps: [
      {
        lineKey: "g_dau",
        label: "Daily active users",
        latex:
          "\\text{DAU}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot S[t{-}c]\\right)",
        color: "hsl(var(--chart-8))",
      },
      {
        lineKey: "g_mau",
        label: "Monthly active users",
        latex:
          "\\text{MAU}(t) = \\sum_c N_c \\cdot \\left(1 - \\prod_{k=0}^{27}(1-S[t{-}c{-}k])\\right)",
        color: "hsl(var(--chart-2))",
      },
      {
        lineKey: "__main__",
        label: "Stickiness ratio",
        latex:
          "\\text{stickiness}(t) = \\dfrac{\\text{DAU}(t)}{\\text{MAU}(t)}",
        color: "",
      },
    ],
    axisMap: { g_dau: "stickiness", g_mau: "stickiness" },
    intermediateCols: [
      {
        stepKey: "g_dau",
        label: "DAU(t)",
        color: "hsl(var(--chart-8))",
        getValue: (out, i) => fn(out.activeUsers[i]),
      },
      {
        stepKey: "g_mau",
        label: "MAU(t)",
        color: "hsl(var(--chart-2))",
        getValue: (out, i) => {
          const s = out.stickiness[i];
          return s !== null && s > 0
            ? fn(Math.round(out.activeUsers[i] / s))
            : "—";
        },
      },
    ],
  },

  totalUsers: {
    steps: [
      {
        lineKey: "g_new",
        label: "New users/day",
        latex: "N(t) \\sim \\operatorname{Poisson}(\\lambda(t))",
        color: "hsl(var(--chart-3))",
      },
      {
        lineKey: "__main__",
        label: "Cumulative total",
        latex: "\\text{total}(t) = \\text{total}(t{-}1) + N(t)",
        color: "",
      },
    ],
    axisMap: { g_new: "scale" },
    intermediateCols: [
      {
        stepKey: "g_new",
        label: "N(t)",
        color: "hsl(var(--chart-3))",
        getValue: (out, i) => fn(out.newUsers[i]),
      },
    ],
  },

  churnedUsers: {
    steps: [
      {
        lineKey: "__main__",
        label: "Churn",
        latex:
          "\\text{Churn}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot (S[k{-}1]-S[k])\\right)",
        color: "",
      },
      {
        lineKey: "g_react",
        label: "Reactivation",
        latex:
          "\\text{React}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(\\text{ch}_c \\cdot r \\cdot \\delta^{d-1}\\right)",
        color: "hsl(var(--chart-4))",
      },
    ],
    axisMap: { __main__: "stickiness" },
    intermediateCols: [
      {
        stepKey: "g_react",
        label: "React(t)",
        color: "hsl(var(--chart-4))",
        getValue: (out, i) => fn(out.reactivatedUsers[i]),
      },
    ],
  },

  reactivatedUsers: {
    steps: [
      {
        lineKey: "g_churn",
        label: "Churn",
        latex:
          "\\text{Churn}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot (S[k{-}1]-S[k])\\right)",
        color: "hsl(var(--destructive))",
      },
      {
        lineKey: "__main__",
        label: "Reactivation",
        latex:
          "\\text{React}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(\\text{ch}_c \\cdot r \\cdot \\delta^{d-1}\\right)",
        color: "",
      },
    ],
    axisMap: { g_churn: "stickiness" },
    intermediateCols: [
      {
        stepKey: "g_churn",
        label: "Churn(t)",
        color: "hsl(var(--destructive))",
        getValue: (out, i) => fn(out.churnedUsers[i]),
      },
    ],
  },
};

export function KpiCardExpanded({ metricKey, color, onClose }: Props) {
  const out = useTwinOutput();
  const config = useSeederStore((s) => s.config);
  const setAnomalies = useSeederStore((s) => s.setAnomalies);
  const setAxis = useSeederStore((s) => s.setAxis);
  const {
    depth,
    retentionParams: rp,
    totalUsers,
    windowDays,
  } = useMemo(() => resolveSimParams(config), [config]);

  const anomalies = useMemo(() => config.anomalies ?? [], [config.anomalies]);

  const growthLatex = useMemo(() => {
    const axis = config.axes?.growth ?? "strong";
    const split =
      (config.growth_config?.split_fraction as number | undefined) ?? 0.3;
    const rate = (config.growth_config?.rate as number | undefined) ?? 0.04;
    const splitPct = Math.round(split * 100);
    switch (axis) {
      case "flat":
        return "G(t) = \\dfrac{U}{T}";
      case "weak":
        return "G(t) = \\dfrac{U}{T}\\left(0.5 + \\dfrac{t}{T}\\right)";
      case "strong":
        return `G(t) = C\\,e^{${rate}\\,t},\\quad C = \\dfrac{${rate}\\,U}{e^{${rate}T}-1}`;
      case "decline":
        return "G(t) = 0.03\\,U\\,e^{-t\\,/\\,(0.5\\,T)}";
      case "hockey_stick":
        return (
          `G(t) = \\begin{cases} \\tfrac{0.05U}{t_0} & t < t_0 \\\\ C\\,e^{${rate}(t-t_0)} & t \\ge t_0 \\end{cases}` +
          `,\\quad t_0 = ${splitPct}\\%\\,T`
        );
      default:
        return "G(t)";
    }
  }, [config.axes?.growth, config.growth_config]);

  const [floatingEditor, setFloatingEditor] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredLineKey, setHoveredLineKey] = useState<string | null>(null);
  const [clickedLineKey, setClickedLineKey] = useState<string | null>(null);
  const focusedLineKey = clickedLineKey ?? hoveredLineKey;
  const handleFormulaClick = useCallback((key: string) => {
    setClickedLineKey((prev) => (prev === key ? null : key));
  }, []);

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
    const axes = config.axes ?? {};
    const k =
      (getAxisValue("virality", axes.virality ?? "weak")?.params.k as
        | number
        | undefined) ?? 0.1;
    const sigma =
      (getAxisValue("anomalies", axes.anomalies ?? "moderate")?.params.sigma as
        | number
        | undefined) ?? 0.05;
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
        ];
      case "churnedUsers":
        return [
          { sym: "θ₀", name: "peak churn rate", value: pct(rp.peakChurnRate) },
          { sym: "θ∞", name: "base churn rate", value: pct(rp.baseChurnRate) },
          { sym: "τ", name: "churn decay", value: `${rp.churnDecayDays} d` },
        ];
      case "newUsers":
        return [
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
  }, [metricKey, depth, rp, totalUsers, windowDays, config.axes]);

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

  // All intermediate cols — always shown
  const activeCols = pipeline ? pipeline.intermediateCols : [];

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
              focusedLineKey={focusedLineKey}
              onFocusedLineKeyChange={(k) => {
                setClickedLineKey(k);
                setHoveredLineKey(null);
              }}
            />
          </section>

          {/* STEP 2 & 3 — Daily table (left) + Formula & params (right) */}
          <section className="grid grid-cols-[1fr_380px] divide-x divide-border/40">
            {/* LEFT: Daily trace — all days, all values */}
            <div className="flex flex-col overflow-hidden">
              <div className="px-6 pt-5 pb-2 shrink-0">
                <SectionLabel step={2} label="Day by day" />
              </div>
              <div className="overflow-auto flex-1 min-h-0 max-h-[420px]">
                <table className="text-xs w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="bg-muted/30 text-muted-foreground/70">
                      <th className="px-3 py-2 text-left font-medium">Day</th>
                      {activeCols.map((c, idx) => (
                        <th
                          key={`${c.stepKey}-${idx}`}
                          className="px-3 py-2 text-right font-medium whitespace-nowrap"
                          style={{ color: c.color }}
                        >
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
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
                        {activeCols.map((c, idx) => (
                          <td
                            key={`${c.stepKey}-${idx}`}
                            className="px-3 py-2 text-right font-mono"
                          >
                            {c.getValue(out, i)}
                          </td>
                        ))}
                        <td
                          className="px-3 py-2 text-muted-foreground font-mono text-[11px] max-w-[160px] truncate"
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

            {/* RIGHT: Formula + parameters */}
            <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[420px]">
              <SectionLabel step={3} label="The formula" />

              {/* Circular-dependency callout for newUsers / activeUsers */}
              {(metricKey === "newUsers" || metricKey === "activeUsers") && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex gap-3">
                  <span className="text-amber-500/80 text-sm leading-none mt-0.5 shrink-0">
                    ⚠
                  </span>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground/80">
                      Why does N(t) use DAU, and DAU use N(t)?
                    </span>{" "}
                    There is no circularity — only a one-day lag. Each day is
                    computed in two steps:{" "}
                    <span className="font-mono text-foreground/70">①</span> N(t)
                    is drawn using <em>yesterday&apos;s</em> DAU(t−1) for viral
                    amplification.{" "}
                    <span className="font-mono text-foreground/70">②</span>{" "}
                    DAU(t) is then updated with today&apos;s N(t).
                    Yesterday&apos;s value feeds today&apos;s arrival;
                    today&apos;s arrival feeds today&apos;s headcount.
                  </div>
                </div>
              )}

              {pipeline ? (
                <PipelineFormula
                  ghostLines={ghostLines}
                  mainColor={color}
                  focusedKey={focusedLineKey}
                  clickedKey={clickedLineKey}
                  onHover={setHoveredLineKey}
                  onClick={handleFormulaClick}
                  steps={pipeline.steps}
                  axisMap={pipeline.axisMap}
                  footnote={pipeline.footnote}
                  latexOverrides={
                    metricKey === "newUsers" ? { g_growth: growthLatex } : {}
                  }
                  axes={config.axes ?? {}}
                  onAxisChange={setAxis}
                />
              ) : (
                <>
                  <div className="rounded-xl bg-muted/40 px-5 py-4 overflow-x-auto">
                    <MathFormula latex={entry.latex} display />
                  </div>
                  {entry.where && (
                    <div className="rounded-lg bg-muted/20 px-4 py-3 overflow-x-auto">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                        where
                      </p>
                      <MathFormula latex={entry.where} />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-2">
                      Variables
                    </p>
                    <table className="text-xs w-full">
                      <tbody>
                        {entry.variables.map((v) => (
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
                          key={p.sym}
                          className={i > 0 ? "border-t border-border/30" : ""}
                        >
                          <td className="px-3 py-2 font-mono font-semibold text-primary text-sm w-10 shrink-0">
                            {p.sym}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">
                            {p.name}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-foreground text-right">
                            {p.value}
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

function PipelineFormula({
  ghostLines,
  mainColor,
  focusedKey,
  clickedKey: _clickedKey,
  onHover,
  onClick,
  steps,
  axisMap,
  footnote,
  latexOverrides = {},
  axes = {},
  onAxisChange,
}: {
  ghostLines: GhostLine[];
  mainColor: string;
  focusedKey: string | null;
  clickedKey: string | null;
  onHover: (key: string | null) => void;
  onClick: (key: string) => void;
  steps: PipelineStep[];
  axisMap: Record<string, string>;
  footnote?: string;
  latexOverrides?: Record<string, string>;
  axes?: Record<string, string>;
  onAxisChange?: (axisId: string, value: string) => void;
}) {
  const colorMap: Record<string, string> = { __main__: mainColor };
  for (const g of ghostLines) colorMap[g.key] = g.color;

  return (
    <div className="flex flex-col gap-0.5">
      {steps.map((step) => {
        const stepColor =
          step.lineKey === "__main__"
            ? mainColor
            : (colorMap[step.lineKey] ?? step.color);
        const latex = latexOverrides[step.lineKey] ?? step.latex;
        const isActive = focusedKey === step.lineKey;
        const isDimmed = focusedKey !== null && !isActive;
        const axisId = axisMap[step.lineKey];
        const axisDisplay = axisId ? AXIS_DISPLAY[axisId] : null;
        const currentVal = axisDisplay
          ? (axes[axisId] ?? axisDisplay.values[0]?.value ?? "")
          : "";
        const currentLabel = axisDisplay
          ? (axisDisplay.values.find((v) => v.value === currentVal)?.label ??
            currentVal)
          : "";

        return (
          <div
            key={step.lineKey}
            className={[
              "flex items-center gap-2 rounded-xl px-2 py-2 transition-all",
              isActive
                ? "bg-muted/60 ring-1 ring-border/60"
                : "hover:bg-muted/40",
              isDimmed ? "opacity-35" : "opacity-100",
            ].join(" ")}
            onMouseEnter={() => onHover(step.lineKey)}
            onMouseLeave={() => onHover(null)}
          >
            {/* Color dot */}
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: stepColor }}
            />

            {/* Label + formula — click to focus */}
            <button
              type="button"
              className="flex-1 min-w-0 text-left cursor-pointer"
              onClick={() => onClick(step.lineKey)}
            >
              <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wide mb-0.5">
                {step.label}
              </p>
              <div className="overflow-x-auto text-sm">
                <MathFormula latex={latex} />
              </div>
            </button>

            {/* Axis chip — right side */}
            {axisDisplay && onAxisChange && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 flex flex-col items-start px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted transition-colors text-left"
                  >
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60 font-medium leading-none mb-0.5">
                      {axisDisplay.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground leading-none">
                      {currentLabel}
                      <span className="text-muted-foreground/40 font-normal">
                        ▾
                      </span>
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  className="w-64 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AxisPopover
                    axis={axisDisplay}
                    currentValue={currentVal}
                    onSelect={(v) => onAxisChange(axisId, v)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      })}
      {/* Optional footnote */}
      {footnote && (
        <p className="text-[10px] text-muted-foreground/50 px-2 pt-1">
          {footnote}
        </p>
      )}
    </div>
  );
}
