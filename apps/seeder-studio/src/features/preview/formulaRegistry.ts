export interface FormulaVariable {
  symbol: string;
  meaning: string;
}

export interface FormulaEntry {
  latex: string;
  explanation: string;
  variables: FormulaVariable[];
}

export type MetricKey =
  | "events"
  | "activeUsers"
  | "newUsers"
  | "stickiness"
  | "totalUsers"
  | "churnedUsers"
  | "reactivatedUsers";

export const FORMULA_REGISTRY: Record<MetricKey, FormulaEntry> = {
  events: {
    latex: "\\text{events}(t) = \\text{DAU}(t) \\times d",
    explanation:
      "Total events fired by all active users on day t. Each active user fires d events per day on average, where d is set by the Depth axis.",
    variables: [
      { symbol: "d", meaning: "events per active user per day (Depth axis)" },
      { symbol: "\\text{DAU}(t)", meaning: "daily active users on day t" },
    ],
  },
  activeUsers: {
    latex:
      "\\text{DAU}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot S[t{-}c]\\right)",
    explanation:
      "Active users on day t, summed across all cohorts. For each cohort c, we sample the number of survivors at tenure t−c from a Poisson distribution using the survival probability S[k].",
    variables: [
      { symbol: "N_c", meaning: "cohort size: users who arrived on day c" },
      {
        symbol: "S[k]",
        meaning:
          "survival probability at tenure k — fraction of cohort still active",
      },
      { symbol: "t-c", meaning: "tenure of cohort c on day t" },
    ],
  },
  newUsers: {
    latex:
      "P(N(t)=k) = \\frac{\\lambda(t)^k\\, e^{-\\lambda(t)}}{k!}, \\quad \\lambda(t) = \\frac{\\tilde{\\lambda}(t)}{\\sum_s \\tilde{\\lambda}(s)} \\cdot U",
    explanation:
      "New users on day t are a Poisson draw with rate λ(t). The raw rate λ̃(t) flows through a four-stage pipeline: growth curve G(t), anomaly multipliers A, day-level jitter J, and viral amplification V. The result is rescaled so the expected total equals the target U.",
    variables: [
      {
        symbol: "\\tilde{\\lambda}(t) = V(J(A(G(t))))",
        meaning: "raw rate: growth → anomalies → jitter → virality",
      },
      {
        symbol: "G(t)",
        meaning: "growth curve (flat / strong / hockey-stick / …)",
      },
      { symbol: "A", meaning: "anomaly multipliers (spike / dip / outage)" },
      { symbol: "J", meaning: "day-level stochastic jitter" },
      { symbol: "V", meaning: "viral amplification (K-factor)" },
      { symbol: "U", meaning: "target total users over the window" },
    ],
  },
  stickiness: {
    latex: "\\text{stickiness}(t) = \\frac{\\text{DAU}(t)}{\\text{MAU}(t)}",
    explanation:
      "Ratio of daily to monthly active users, measuring how habitual usage is. MAU is computed over a 28-day rolling window using an independence approximation on the survival curve.",
    variables: [
      { symbol: "\\text{DAU}(t)", meaning: "daily active users on day t" },
      {
        symbol: "\\text{MAU}(t)",
        meaning: "monthly active users in the 28-day window ending at t",
      },
    ],
  },
  totalUsers: {
    latex: "\\text{total}(t) = \\sum_{c \\leq t} N_c",
    explanation:
      "Cumulative count of all users who have ever signed up through day t. Monotonically non-decreasing.",
    variables: [{ symbol: "N_c", meaning: "new users (cohort size) on day c" }],
  },
  churnedUsers: {
    latex:
      "\\text{churn}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot (S[k{-}1] - S[k])\\right)",
    explanation:
      "Users entering the dormant state today, summed across cohorts. The factor S[k−1]−S[k] is the probability of churning at exactly tenure k. Dormant users may reactivate within maxDormantDays.",
    variables: [
      { symbol: "S[k{-}1] - S[k]", meaning: "churn probability at tenure k" },
      { symbol: "k", meaning: "tenure t−c of cohort c on day t" },
    ],
  },
  reactivatedUsers: {
    latex:
      "\\text{react}(t) = \\sum_c \\text{Poisson}\\!\\left(\\text{ch}_c \\cdot r \\cdot \\delta^{d-1}\\right)",
    explanation:
      "Previously dormant users who return today. For each cohort, users who churned d days ago reactivate with probability r·δ^(d−1), a geometrically decaying kernel.",
    variables: [
      {
        symbol: "\\text{ch}_c",
        meaning: "users who went dormant from cohort c",
      },
      { symbol: "r", meaning: "base reactivation rate (day 1 of dormancy)" },
      {
        symbol: "\\delta",
        meaning: "reactivation decay factor per dormant day",
      },
      { symbol: "d", meaning: "number of days the user has been dormant" },
    ],
  },
};
