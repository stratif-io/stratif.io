export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  secondary: 'hsl(var(--secondary))',
  secondaryForeground: 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  chart: {
    1: 'hsl(var(--chart-1))',
    2: 'hsl(var(--chart-2))',
    3: 'hsl(var(--chart-3))',
    4: 'hsl(var(--chart-4))',
    5: 'hsl(var(--chart-5))',
  },
}

export const DEFAULT_CHART_COLORS = [
  CHART_COLORS.chart[1],
  CHART_COLORS.chart[2],
  CHART_COLORS.chart[3],
  CHART_COLORS.chart[4],
  CHART_COLORS.chart[5],
]

export const DONUT_CHART_COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 75%, 55%)',
  'hsl(180, 70%, 40%)',
  'hsl(40, 85%, 50%)',
  'hsl(260, 60%, 55%)',
]

export const HEATMAP_SEQUENTIAL_COLORS = [
  'hsl(210, 30%, 95%)',
  'hsl(210, 40%, 85%)',
  'hsl(210, 50%, 70%)',
  'hsl(210, 60%, 55%)',
  'hsl(210, 70%, 45%)',
  'hsl(210, 80%, 35%)',
  'hsl(210, 90%, 25%)',
]

export const HEATMAP_DIVERGING_COLORS = [
  'hsl(0, 70%, 50%)',
  'hsl(15, 60%, 55%)',
  'hsl(30, 50%, 60%)',
  'hsl(50, 40%, 75%)',
  'hsl(60, 30%, 90%)',
  'hsl(150, 30%, 85%)',
  'hsl(160, 40%, 65%)',
  'hsl(170, 50%, 50%)',
  'hsl(180, 60%, 40%)',
]

export const FUNNEL_CHART_COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(200, 65%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(160, 55%, 40%)',
  'hsl(140, 50%, 35%)',
  'hsl(120, 45%, 30%)',
]

export const COMPARISON_COLORS = {
  current: ['hsl(220, 70%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(340, 65%, 50%)'],
  previous: ['hsl(220, 20%, 60%)', 'hsl(280, 15%, 65%)', 'hsl(340, 15%, 60%)'],
}

export const SPARKLINE_COLORS = {
  positive: 'hsl(160, 70%, 45%)',
  negative: 'hsl(0, 70%, 50%)',
  neutral: 'hsl(220, 70%, 50%)',
}
