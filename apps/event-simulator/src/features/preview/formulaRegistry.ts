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
      "S[t{-}c] = \\prod_{i=0}^{t-c-1}(1 - p(i)),\\quad p(i) = \\theta_\\infty + (\\theta_0 - \\theta_\\infty)\\,e^{-i/\\tau}",
    explanation:
      "Active users on day t, summed across all cohorts. For each cohort c, we sample survivors at tenure t−c using the survival function S[k], which is the product of daily retention probabilities up to tenure k.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "c", meaning: "cohort arrival day" },
      { symbol: "N_c", meaning: "number of users who arrived on day c" },
      {
        symbol: "S[t{-}c]",
        meaning: "survival probability t−c days after arrival",
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
    explanation:
      "New users on day t are a Poisson draw with rate λ(t). The raw signal flows through a four-stage pipeline — growth, anomalies, jitter, virality — then rescaled so the expected total equals U.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "N(t)", meaning: "new users arriving on day t" },
      {
        symbol: "\\lambda(t)",
        meaning: "expected new-user arrival rate on day t (users/day)",
      },
      {
        symbol: "\\lambda_0",
        meaning:
          "starting arrival rate on day 1 (users/day) — set directly; shape(0) = 1 by construction",
      },
      {
        symbol: "U",
        meaning: "target total users over the window T (goal mode)",
      },
      { symbol: "T", meaning: "simulation window length in days" },
      {
        symbol: "G(t)",
        meaning:
          "growth curve — baseline arrival rate shape (Growth axis). G(t) = λ₀ · shape(t) in rate mode, G(t) = (U/T) · shape(t) in goal mode.",
      },
      {
        symbol: "A(t)",
        meaning:
          "after anomaly multipliers: A(t) = G(t) · ∏ₖ mₖ(t), where mₖ is the multiplier for event k on day t",
      },
      {
        symbol: "J(t)",
        meaning: "after stochastic jitter: J(t) = A(t) · (1 + σZ), Z ∼ 𝒩(0,1)",
      },
      {
        symbol: "V(t)",
        meaning:
          "after viral amplification: V(t) = J(t) + K · DAU(t−1). In rate mode this is already in users/day; in goal mode it is rescaled by U/ΣV(s).",
      },
      {
        symbol: "K",
        meaning:
          "viral K-factor — additional new users per daily active user (Virality axis)",
      },
      {
        symbol: "\\sigma",
        meaning:
          "jitter amplitude — standard deviation of the day-level noise (Noise axis)",
      },
      { symbol: "Z", meaning: "standard normal draw — Z ∼ 𝒩(0,1)" },
      {
        symbol: "S(t)",
        meaning:
          "growth after seasonality: G(t) · dow(t) · cal(t) — shape multiplied by day-of-week and month-of-year weights",
      },
      {
        symbol: "\\mathrm{dow}(t)",
        meaning:
          "day-of-week multiplier on day t — set by the Weekly Pattern axis (e.g. weekdays_only drops weekends to ~5%)",
      },
      {
        symbol: "\\mathrm{cal}(t)",
        meaning:
          "month-of-year multiplier on day t — set by the Seasonality axis (e.g. nov_dec_peak spikes Nov–Dec to 2.5×)",
      },
    ],
  },
  stickiness: {
    latex: "\\text{stickiness}(t) = \\frac{\\text{DAU}(t)}{\\text{MAU}(t)}",
    where:
      "S[t{-}c] = \\prod_{i=0}^{t-c-1}(1 - p(i)),\\quad p(i) = \\theta_\\infty + (\\theta_0 - \\theta_\\infty)\\,e^{-i/\\tau}",
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
      {
        symbol: "S[t{-}c]",
        meaning: "survival probability t−c days after arrival",
      },
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
      "\\text{churn}(t) = \\sum_c \\text{Poisson}\\!\\left(N_c \\cdot (S[t{-}c{-}1] - S[t{-}c])\\right)",
    where:
      "S[t{-}c] = \\prod_{i=0}^{t-c-1}(1 - p(i)),\\quad p(i) = \\theta_\\infty + (\\theta_0 - \\theta_\\infty)\\,e^{-i/\\tau}",
    explanation:
      "Users entering the dormant state today, summed across cohorts. S[t−c−1]−S[t−c] is the churn probability for a user from cohort c on day t.",
    variables: [
      { symbol: "t", meaning: "simulation day (1 … T)" },
      { symbol: "c", meaning: "cohort arrival day" },
      { symbol: "N_c", meaning: "number of users who arrived on day c" },
      {
        symbol: "S[t{-}c]",
        meaning: "survival probability t−c days after arrival",
      },
      {
        symbol: "S[t{-}c{-}1] - S[t{-}c]",
        meaning: "churn probability at exactly tenure t−c",
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
