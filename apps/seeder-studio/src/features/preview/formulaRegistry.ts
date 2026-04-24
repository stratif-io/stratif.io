export interface FormulaVariable {
  symbol: string;
  meaning: string;
}

export interface FormulaEntry {
  latex: string;
  where?: string;
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
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "\\text{DAU}(t)", meaning: "daily active users on day t" },
      { symbol: "d", meaning: "events per active user per day (Depth axis)" },
    ],
  },
  activeUsers: {
    latex:
      "\\text{DAU}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot S[t{-}c]\\right)",
    where:
      "S[k] = \\prod_{i=0}^{k-1}(1 - p(i)),\\quad p(i) = \\theta_\\infty + (\\theta_0 - \\theta_\\infty)\\,e^{-i/\\tau}",
    explanation:
      "Active users on day t, summed across all cohorts. For each cohort c, we sample survivors at tenure t−c using the survival function S[k], which is the product of daily retention probabilities up to tenure k.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "c", meaning: "cohort arrival day" },
      { symbol: "N_c", meaning: "number of users who arrived on day c" },
      {
        symbol: "S[k]",
        meaning: "probability a user is still active k days after arrival",
      },
      { symbol: "p(i)", meaning: "daily churn probability at tenure i" },
      {
        symbol: "\\theta_0",
        meaning: "peak churn rate on arrival day (Stickiness axis)",
      },
      {
        symbol: "\\theta_\\infty",
        meaning: "long-run base churn rate (Stickiness axis)",
      },
      {
        symbol: "\\tau",
        meaning: "churn decay speed in days (Stickiness axis)",
      },
      { symbol: "t - c", meaning: "tenure: days since cohort c arrived" },
    ],
  },
  newUsers: {
    latex:
      "N(t) \\sim \\operatorname{Poisson}(\\lambda(t)),\\quad \\lambda(t) = \\frac{V(J(A(G(t))))}{\\sum_s V(J(A(G(s))))} \\cdot U",
    where: "J(t) = A(t)\\,(1 + \\sigma Z),\\; Z \\sim \\mathcal{N}(0,1)",
    explanation:
      "New users on day t are a Poisson draw with rate λ(t). The raw signal flows through a four-stage pipeline — growth, anomalies, jitter, virality — then rescaled so the expected total equals U.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "N(t)", meaning: "new users arriving on day t" },
      {
        symbol: "\\lambda(t)",
        meaning: "expected new-user arrival rate on day t",
      },
      { symbol: "U", meaning: "target total users over the window T" },
      { symbol: "T", meaning: "simulation window length in days" },
      {
        symbol: "G(t)",
        meaning: "growth curve — baseline arrival shape (Growth axis)",
      },
      {
        symbol: "A(t)",
        meaning:
          "anomaly multipliers applied on day t (spikes / dips / outages)",
      },
      { symbol: "J(t)", meaning: "after stochastic day-level jitter" },
      {
        symbol: "V(t)",
        meaning: "after viral amplification: V(t) = J(t) + K·DAU(t−1)",
      },
      {
        symbol: "K",
        meaning:
          "viral K-factor — new users brought in per active user (Virality axis)",
      },
      { symbol: "\\sigma", meaning: "jitter standard deviation (Noise axis)" },
      { symbol: "Z", meaning: "standard normal draw — Z ∼ 𝒩(0,1)" },
    ],
  },
  stickiness: {
    latex: "\\text{stickiness}(t) = \\frac{\\text{DAU}(t)}{\\text{MAU}(t)}",
    explanation:
      "Ratio of daily to monthly active users, measuring how habitual usage is. MAU is computed over a W-day rolling window using an independence approximation on the survival curve.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "\\text{DAU}(t)", meaning: "daily active users on day t" },
      {
        symbol: "\\text{MAU}(t)",
        meaning: "users active at least once in the W days ending at t",
      },
      { symbol: "W", meaning: "rolling window length (28 days)" },
    ],
  },
  totalUsers: {
    latex: "\\text{total}(t) = \\sum_{c \\leq t} N_c",
    explanation:
      "Cumulative count of all users who have ever signed up through day t. Monotonically non-decreasing.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "c", meaning: "cohort arrival day" },
      { symbol: "N_c", meaning: "number of users who arrived on day c" },
    ],
  },
  churnedUsers: {
    latex:
      "\\text{churn}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot (S[k{-}1] - S[k])\\right)",
    where:
      "S[k] = \\prod_{i=0}^{k-1}(1 - p(i)),\\quad p(i) = \\theta_\\infty + (\\theta_0 - \\theta_\\infty)\\,e^{-i/\\tau}",
    explanation:
      "Users entering the dormant state today, summed across cohorts. S[k−1]−S[k] is the probability of churning at exactly tenure k — the drop in survival between consecutive days.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "c", meaning: "cohort arrival day" },
      { symbol: "N_c", meaning: "number of users who arrived on day c" },
      {
        symbol: "k",
        meaning: "tenure: days since cohort c arrived (k = t − c)",
      },
      { symbol: "S[k]", meaning: "survival probability at tenure k" },
      {
        symbol: "S[k{-}1] - S[k]",
        meaning: "churn probability at exactly tenure k",
      },
      { symbol: "p(i)", meaning: "daily churn probability at tenure i" },
      {
        symbol: "\\theta_0",
        meaning: "peak churn rate on arrival day (Stickiness axis)",
      },
      {
        symbol: "\\theta_\\infty",
        meaning: "long-run base churn rate (Stickiness axis)",
      },
      {
        symbol: "\\tau",
        meaning: "churn decay speed in days (Stickiness axis)",
      },
    ],
  },
  reactivatedUsers: {
    latex:
      "\\text{react}(t) = \\sum_c \\text{Poisson}\\!\\left(C_c \\cdot r \\cdot \\delta^{n-1}\\right)",
    explanation:
      "Previously dormant users who return today. Users who churned n days ago reactivate with probability r·δ^(n−1), a geometrically decaying kernel. Users dormant beyond D days are permanently churned.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "c", meaning: "cohort arrival day" },
      {
        symbol: "C_c",
        meaning: "number of users currently dormant from cohort c",
      },
      {
        symbol: "r",
        meaning: "base reactivation probability on dormancy day 1",
      },
      {
        symbol: "\\delta",
        meaning:
          "decay factor: reactivation probability multiplied by δ each additional dormant day",
      },
      { symbol: "n", meaning: "number of days the user has been dormant" },
      {
        symbol: "D",
        meaning:
          "max dormant days — users dormant longer than D are permanently churned",
      },
    ],
  },
};
