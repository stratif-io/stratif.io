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

// Sequential heatmap: low-saturation background → full primary blue.
// These are intentionally literal values because they need to resolve as
// concrete SVG fill colors and must form a perceptual gradient.
export const HEATMAP_SEQUENTIAL_COLORS = [
  'hsl(215, 25%, 93%)',
  'hsl(215, 35%, 82%)',
  'hsl(215, 50%, 68%)',
  'hsl(215, 65%, 53%)',
  'hsl(215, 75%, 43%)',
  'hsl(215, 83%, 33%)',
  'hsl(215, 90%, 23%)',
]

// Diverging heatmap: destructive red → neutral → chart-2 teal.
export const HEATMAP_DIVERGING_COLORS = [
  'hsl(0, 72%, 51%)',
  'hsl(15, 62%, 56%)',
  'hsl(30, 52%, 61%)',
  'hsl(50, 38%, 76%)',
  'hsl(60, 28%, 91%)',
  'hsl(155, 30%, 82%)',
  'hsl(163, 42%, 64%)',
  'hsl(170, 52%, 50%)',
  'hsl(173, 58%, 39%)',
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
