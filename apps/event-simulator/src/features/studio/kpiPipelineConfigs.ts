import type { MetricKey } from "@/features/preview/formulaRegistry";
import type { useTwinOutput } from "@/features/preview/useTwinOutput";
import { formatNum } from "@/lib/format";

const fn = (v: number) => formatNum(Math.round(v));

export interface PipelineStep {
  lineKey: string;
  label: string;
  latex: string;
  color: string;
  /** Symbols from entry.variables to show on hover (LaTeX notation) */
  tooltipVarSymbols?: string[];
  /** Symbols from the params table to show on hover (plain text, e.g. "σ") */
  tooltipParamSyms?: string[];
  /** Maps variable symbol → axisId for inline axis selectors */
  axisVarMap?: Record<string, string>;
}

export interface IntermediateCol {
  stepKey: string;
  label: string;
  color: string;
  getValue: (out: ReturnType<typeof useTwinOutput>, i: number) => string;
}

export interface MetricPipelineConfig {
  steps: PipelineStep[];
  axisMap: Record<string, string>;
  intermediateCols: IntermediateCol[];
  footnote?: string;
}

export const METRIC_PIPELINES: Partial<
  Record<MetricKey, MetricPipelineConfig>
> = {
  newUsers: {
    steps: [
      {
        lineKey: "g_growth",
        label: "Growth curve",
        latex: "G(t)",
        color: "hsl(var(--chart-2))",
        tooltipVarSymbols: ["t", "G(t)", "U", "T"],
        tooltipParamSyms: ["U", "T"],
        axisVarMap: { "G(t)": "growth", U: "scale", T: "scale" },
      },
      {
        lineKey: "g_season",
        label: "Seasonality",
        latex: "S(t) = G(t) \\cdot \\mathrm{dow}(t) \\cdot \\mathrm{cal}(t)",
        color: "hsl(var(--chart-7))",
        tooltipVarSymbols: ["G(t)", "S(t)"],
        axisVarMap: {
          "\\mathrm{dow}": "weekly_pattern",
          "\\mathrm{cal}": "monthly_seasonality",
        },
      },
      {
        lineKey: "g_anom",
        label: "Anomaly multipliers",
        latex: "A(t) = S(t) \\cdot \\prod_k m_k(t)",
        color: "hsl(var(--chart-5))",
        tooltipVarSymbols: ["t", "S(t)", "A(t)"],
      },
      {
        lineKey: "g_jitter",
        label: "Stochastic jitter",
        latex: "J(t) = A(t)\\,(1 + \\sigma Z),\\quad Z \\sim \\mathcal{N}(0,1)",
        color: "hsl(var(--chart-6))",
        tooltipVarSymbols: ["A(t)", "J(t)", "\\sigma", "Z"],
        tooltipParamSyms: ["σ"],
        axisVarMap: { "\\sigma": "anomalies" },
      },
      {
        lineKey: "g_viral",
        label: "Viral amplification",
        latex: "V(t) = J(t) + K \\cdot \\mathrm{DAU}(t{-}1)",
        color: "hsl(var(--chart-4))",
        tooltipVarSymbols: ["J(t)", "V(t)", "K"],
        tooltipParamSyms: ["K"],
        axisVarMap: { K: "virality" },
      },
      {
        lineKey: "__main__",
        label: "Poisson draw",
        latex: "N(t) \\sim \\operatorname{Poisson}(V(t))",
        color: "",
        tooltipVarSymbols: ["N(t)", "\\lambda(t)", "U", "T"],
        tooltipParamSyms: ["U", "T"],
        axisVarMap: { U: "scale", T: "scale" },
      },
    ],
    axisMap: {
      g_growth: "growth",
      g_season: "monthly_seasonality",
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
        stepKey: "g_season",
        label: "S(t)",
        color: "hsl(var(--chart-7))",
        getValue: (out, i) => out.pipeline.seasonality[i]?.toFixed(1) ?? "—",
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
      "DAU = daily active users (estimated from previous day's cohorts).",
  },

  activeUsers: {
    steps: [
      {
        lineKey: "g_new",
        label: "New users",
        latex: "N(t) \\sim \\operatorname{Poisson}(\\lambda(t))",
        color: "hsl(var(--chart-3))",
        tooltipVarSymbols: ["t", "c", "N_c"],
      },
      {
        lineKey: "g_churn",
        label: "Churn",
        latex:
          "\\text{Churn}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot (S[t{-}c{-}1]-S[t{-}c])\\right)",
        color: "hsl(var(--destructive))",
        tooltipVarSymbols: [
          "N_c",
          "S[t{-}c]",
          "p(i)",
          "\\theta_0",
          "\\theta_\\infty",
          "\\tau",
        ],
        tooltipParamSyms: ["θ₀", "θ∞", "τ", "r", "δ", "D"],
        axisVarMap: { "\\theta_0": "stickiness" },
      },
      {
        lineKey: "g_react",
        label: "Reactivation",
        latex:
          "\\text{React}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(C_c \\cdot r \\cdot \\delta^{n-1}\\right)",
        color: "hsl(var(--chart-4))",
        tooltipVarSymbols: ["t - c"],
        tooltipParamSyms: ["r", "δ", "D"],
      },
      {
        lineKey: "__main__",
        label: "DAU net change",
        latex:
          "\\text{DAU}(t) = \\text{DAU}(t{-}1) + N(t) - \\text{Churn}(t) + \\text{React}(t)",
        color: "",
        tooltipVarSymbols: ["t", "c", "N_c"],
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
        label: "Daily active users",
        latex: "\\text{DAU}(t)",
        color: "hsl(var(--chart-8))",
        tooltipVarSymbols: ["t", "\\text{DAU}(t)"],
      },
      {
        lineKey: "__main__",
        label: "Total events",
        latex: "\\text{Events}(t) = \\text{DAU}(t) \\times d",
        color: "",
        tooltipVarSymbols: ["\\text{DAU}(t)", "d"],
        tooltipParamSyms: ["d"],
        axisVarMap: { d: "engagement_depth" },
      },
    ],
    axisMap: { __main__: "engagement" },
    intermediateCols: [
      {
        stepKey: "g_dau",
        label: "DAU(t)",
        color: "hsl(var(--chart-8))",
        getValue: (out, i) => fn(out.activeUsers[i]),
      },
    ],
    footnote:
      "DAU(t) is computed from cohort survival — open the Active users card for the full derivation.",
  },

  stickiness: {
    steps: [
      {
        lineKey: "g_dau",
        label: "Daily active users",
        latex:
          "\\text{DAU}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot S[t{-}c]\\right)",
        color: "hsl(var(--chart-8))",
        tooltipVarSymbols: ["t", "\\text{DAU}(t)"],
      },
      {
        lineKey: "g_mau",
        label: "Monthly active users",
        latex:
          "\\text{MAU}(t) = \\sum_c N_c \\cdot \\left(1 - \\prod_{k=0}^{W-1}(1-S[t{-}c{-}k])\\right)",
        color: "hsl(var(--chart-2))",
        tooltipVarSymbols: ["\\text{MAU}(t)", "W"],
        tooltipParamSyms: ["W"],
      },
      {
        lineKey: "__main__",
        label: "Stickiness ratio",
        latex:
          "\\text{stickiness}(t) = \\dfrac{\\text{DAU}(t)}{\\text{MAU}(t)}",
        color: "",
        tooltipVarSymbols: ["\\text{DAU}(t)", "\\text{MAU}(t)"],
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
        tooltipVarSymbols: ["t", "c", "N_c"],
      },
      {
        lineKey: "__main__",
        label: "Cumulative total",
        latex: "\\text{total}(t) = \\text{total}(t{-}1) + N(t)",
        color: "",
        tooltipVarSymbols: ["t", "c", "N_c"],
        tooltipParamSyms: ["T"],
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
          "\\text{Churn}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot (S[t{-}c{-}1]-S[t{-}c])\\right)",
        color: "",
        tooltipVarSymbols: [
          "N_c",
          "S[t{-}c]",
          "S[t{-}c{-}1] - S[t{-}c]",
          "p(i)",
          "\\theta_0",
          "\\theta_\\infty",
          "\\tau",
        ],
        tooltipParamSyms: ["θ₀", "θ∞", "τ", "r", "δ", "D"],
        axisVarMap: { "\\theta_0": "stickiness" },
      },
      {
        lineKey: "g_react",
        label: "Reactivation",
        latex:
          "\\text{React}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(C_c \\cdot r \\cdot \\delta^{n-1}\\right)",
        color: "hsl(var(--chart-4))",
        tooltipParamSyms: ["r", "δ", "D"],
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
          "\\text{Churn}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(N_c \\cdot (S[t{-}c{-}1]-S[t{-}c])\\right)",
        color: "hsl(var(--destructive))",
        tooltipParamSyms: ["θ₀", "θ∞", "τ"],
      },
      {
        lineKey: "__main__",
        label: "Reactivation",
        latex:
          "\\text{React}(t) = \\sum_c \\operatorname{Poisson}\\!\\left(C_c \\cdot r \\cdot \\delta^{n-1}\\right)",
        color: "",
        tooltipVarSymbols: ["C_c", "r", "\\delta", "n", "D"],
        tooltipParamSyms: ["r", "δ", "D"],
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
