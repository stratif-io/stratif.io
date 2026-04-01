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

// Cycles through the 5 design-system chart tokens, then repeats.
export const DONUT_CHART_COLORS = [
  ...DEFAULT_CHART_COLORS,
  CHART_COLORS.chart[1],
  CHART_COLORS.chart[2],
  CHART_COLORS.chart[3],
]

// Sequential heatmap: low-opacity primary → full primary.
// Uses CSS custom properties so both steps resolve correctly in light and dark mode.
export const HEATMAP_SEQUENTIAL_COLORS = [
  'hsl(var(--primary) / 0.08)',
  'hsl(var(--primary) / 0.18)',
  'hsl(var(--primary) / 0.32)',
  'hsl(var(--primary) / 0.48)',
  'hsl(var(--primary) / 0.65)',
  'hsl(var(--primary) / 0.82)',
  'hsl(var(--primary) / 1)',
]

// Diverging heatmap: destructive → neutral muted → primary.
export const HEATMAP_DIVERGING_COLORS = [
  'hsl(var(--destructive) / 0.9)',
  'hsl(var(--destructive) / 0.6)',
  'hsl(var(--destructive) / 0.35)',
  'hsl(var(--muted-foreground) / 0.25)',
  'hsl(var(--muted-foreground) / 0.12)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.75)',
  'hsl(var(--primary) / 1)',
]

export const FUNNEL_CHART_COLORS = DEFAULT_CHART_COLORS

export const COMPARISON_COLORS = {
  current: [CHART_COLORS.chart[1], CHART_COLORS.chart[4], CHART_COLORS.chart[5]],
  previous: [
    'hsl(var(--muted-foreground) / 0.5)',
    'hsl(var(--muted-foreground) / 0.4)',
    'hsl(var(--muted-foreground) / 0.35)',
  ],
}

export const SPARKLINE_COLORS = {
  positive: CHART_COLORS.chart[2],
  negative: CHART_COLORS.destructive,
  neutral: CHART_COLORS.chart[1],
}
