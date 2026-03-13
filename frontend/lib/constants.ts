/**
 * Design System Constants
 * Centralized spacing, typography, and styling values for consistent UI
 */

// Spacing System
export const SPACING = {
  // Page-level spacing
  page: 'p-4 sm:p-6 lg:p-8',
  pageY: 'py-4 sm:py-6 lg:py-8',
  pageX: 'px-4 sm:px-6 lg:px-8',

  // Section spacing (between major sections)
  section: 'space-y-6',
  sectionSm: 'space-y-4',
  sectionLg: 'space-y-8',

  // Card/component internal spacing
  card: 'space-y-4',
  cardSm: 'space-y-2',
  cardLg: 'space-y-6',

  // Grid gaps
  gridGap: 'gap-6',
  gridGapSm: 'gap-4',
  gridGapLg: 'gap-8',
} as const

// Typography System
export const TYPOGRAPHY = {
  // Page titles
  pageTitle: 'text-3xl font-bold tracking-tight',
  pageTitleSm: 'text-2xl font-bold tracking-tight',
  // Subtle page label — replaces heavy h1, sits inline without dominating
  pageLabel: 'text-xs font-medium text-muted-foreground tracking-widest uppercase select-none',

  // Section headings
  sectionTitle: 'text-xl font-semibold',
  sectionTitleSm: 'text-lg font-semibold',

  // Card headings
  cardTitle: 'text-lg font-semibold',
  cardTitleSm: 'text-base font-semibold',

  // Body text
  body: 'text-sm',
  bodyLg: 'text-base',
  bodySm: 'text-xs',

  // Labels
  label: 'text-sm font-medium',
  labelSm: 'text-xs font-medium',

  // Muted/secondary text
  muted: 'text-sm text-muted-foreground',
  mutedSm: 'text-xs text-muted-foreground',

  // Metrics/numbers
  metric: 'text-xl sm:text-2xl font-bold',
  metricLg: 'text-2xl sm:text-3xl font-bold',
  metricSm: 'text-lg sm:text-xl font-bold',
} as const

// Elevation/Shadow System
export const ELEVATION = {
  none: '',
  subtle: 'shadow-sm',
  medium: 'shadow-md',
  prominent: 'shadow-lg',

  // Hover elevations
  hoverSubtle: 'hover:shadow-md transition-shadow duration-200',
  hoverMedium: 'hover:shadow-lg transition-shadow duration-200',
  hoverProminent: 'hover:shadow-xl transition-shadow duration-200',
} as const

// Animation Durations
export const ANIMATION = {
  fastest: 'duration-75',
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  slowest: 'duration-500',
} as const

// Chart Color Palette (theme-aware)
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',

  // Multi-series colors (8 distinct colors for charts)
  series: [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    // Cycles back through chart tokens for 6+ series
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
  ],

  // Semantic colors — mapped to design tokens where possible
  success: 'hsl(var(--chart-2))',
  warning: 'hsl(var(--warning))',
  error: 'hsl(var(--destructive))',
  info: 'hsl(var(--chart-1))',
} as const

// Icon Sizes
export const ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

// Segment/filter trigger style — used in inline filter bars (PathsExplorer, FunnelDetail, PathFunnelDialog)
export const FILTER_TRIGGER_CLASS =
  'h-9 border-0 shadow-none rounded-none bg-transparent gap-1.5 px-3 text-sm font-medium focus:ring-0 focus:ring-offset-0 hover:bg-accent/60 transition-colors text-muted-foreground'

// Responsive Grid Columns
export const GRID_COLS = {
  metrics: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cards: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  split: 'grid-cols-1 lg:grid-cols-2',
} as const
