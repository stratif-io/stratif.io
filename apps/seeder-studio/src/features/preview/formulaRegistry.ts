export interface FormulaVariable {
  symbol: string;
  meaning: string;
}

export interface FormulaEntry {
  latex: string;
  explanation: string;
  variables: FormulaVariable[];
}

export const FORMULA_REGISTRY: Record<string, FormulaEntry> = {
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
    latex: "N_c = \\text{Poisson}(\\lambda_c)",
    explanation:
      "New users arriving on day c, sampled from a Poisson distribution. λ_c is the rescaled arrival rate from the growth curve, anomalies, jitter, and virality pipeline.",
    variables: [
      {
        symbol: "\\lambda_c",
        meaning:
          "expected arrivals on day c (growth × anomaly × jitter × virality, rescaled to target users)",
      },
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
