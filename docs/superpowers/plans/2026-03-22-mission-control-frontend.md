# Mission Control Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Dashboard metric cards + ActivityChart with a hero KPI card (left) and a categorized 2-column mini-grid of 7 supporting cards (right), each showing real sparkline data and period-over-period % change.

**Architecture:** 5 new files (utility, hook, 3 components) + modifications to `DashboardPage` and `useMissionControl`. All 8 sparkline trends are fetched in parallel via `useMissionControlTrends`. The hero metric is local component state — clicking any mini card promotes it instantly (TanStack Query data is already cached). Old `MetricCard` and `ActivityChart` are deleted after verifying no external imports.

**Tech Stack:** React 18, TypeScript, TanStack Query v5, Recharts (`AreaChartComponent`), existing `SparklineChart`, Tailwind CSS v4, Vitest + @testing-library/react

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `apps/web/frontend/lib/format-metric.ts` | **Create** | `formatMetricValue(metric, value)` + helpers |
| `apps/web/frontend/lib/__tests__/format-metric.test.ts` | **Create** | Unit tests for format utility |
| `apps/web/frontend/features/dashboard/hooks/useMissionControlTrends.ts` | **Create** | 8 parallel trend queries |
| `apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControlTrends.test.ts` | **Create** | Hook tests |
| `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx` | **Create** | Supporting card: label + number + % + sparkline |
| `apps/web/frontend/features/dashboard/components/__tests__/MiniMetricCard.test.tsx` | **Create** | Component tests |
| `apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx` | **Create** | Hero card: big number + area chart |
| `apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx` | **Create** | Component tests |
| `apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx` | **Create** | Orchestrates hero + mini-grid layout |
| `apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx` | **Create** | Grid + promote-to-hero interaction tests |
| `apps/web/frontend/features/dashboard/DashboardPage.tsx` | **Modify** | Wire new components, drop old ones |
| `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts` | **Modify** | Remove trend query block |
| `apps/web/frontend/features/dashboard/components/ActivityChart.tsx` | **Delete** | Replaced by HeroMetricCard |
| `apps/web/frontend/features/dashboard/components/MetricCard.tsx` | **Delete** | Replaced by MiniMetricCard + HeroMetricCard |

---

## Task 1: `formatMetricValue` utility

**Files:**
- Create: `apps/web/frontend/lib/format-metric.ts`
- Create: `apps/web/frontend/lib/__tests__/format-metric.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/frontend/lib/__tests__/format-metric.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatMetricValue, computePctChange } from '../format-metric'

describe('formatMetricValue', () => {
  describe('avg_session_duration_sec', () => {
    it('formats seconds only when under a minute', () => {
      expect(formatMetricValue('avg_session_duration_sec', 45)).toBe('45s')
    })

    it('formats minutes and seconds', () => {
      expect(formatMetricValue('avg_session_duration_sec', 142)).toBe('2m 22s')
    })

    it('rounds fractional seconds', () => {
      expect(formatMetricValue('avg_session_duration_sec', 60.9)).toBe('1m 1s')
    })

    it('formats exactly one minute', () => {
      expect(formatMetricValue('avg_session_duration_sec', 60)).toBe('1m 0s')
    })
  })

  describe('dau_mau_ratio', () => {
    it('formats as percentage with one decimal', () => {
      expect(formatMetricValue('dau_mau_ratio', 0.34)).toBe('34.0%')
    })

    it('formats zero', () => {
      expect(formatMetricValue('dau_mau_ratio', 0)).toBe('0.0%')
    })

    it('formats 1.0 as 100.0%', () => {
      expect(formatMetricValue('dau_mau_ratio', 1)).toBe('100.0%')
    })
  })

  describe('avg_events_per_session', () => {
    it('formats to one decimal', () => {
      expect(formatMetricValue('avg_events_per_session', 13.8)).toBe('13.8')
    })

    it('preserves trailing zero', () => {
      expect(formatMetricValue('avg_events_per_session', 10)).toBe('10.0')
    })
  })

  describe('compact number metrics (total_events, unique_users, etc.)', () => {
    it('formats millions with up to 2 significant decimal places', () => {
      expect(formatMetricValue('total_events', 1_240_000)).toBe('1.24M')
    })

    it('strips trailing zeros in millions', () => {
      expect(formatMetricValue('total_events', 2_000_000)).toBe('2M')
    })

    it('formats thousands with one decimal', () => {
      expect(formatMetricValue('unique_users', 48_200)).toBe('48.2K')
    })

    it('strips trailing zeros in thousands', () => {
      expect(formatMetricValue('unique_users', 48_000)).toBe('48K')
    })

    it('formats numbers under 1000 as-is', () => {
      expect(formatMetricValue('total_events', 999)).toBe('999')
    })
  })
})

describe('computePctChange', () => {
  it('returns positive change', () => {
    expect(computePctChange(1240000, 1100000)).toBeCloseTo(12.73, 1)
  })

  it('returns negative change', () => {
    expect(computePctChange(89700, 91000)).toBeCloseTo(-1.43, 1)
  })

  it('returns null when previous is zero', () => {
    expect(computePctChange(100, 0)).toBeNull()
  })

  it('returns 0 when values are equal', () => {
    expect(computePctChange(100, 100)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
npm run test:run -- apps/web/frontend/lib/__tests__/format-metric.test.ts
```

Expected: FAIL — "Cannot find module '../format-metric'"

- [ ] **Step 3: Implement the utility**

Create `apps/web/frontend/lib/format-metric.ts`:

```typescript
/**
 * Format a metric value for display in Mission Control KPI cards.
 * Returns a compact, human-readable string appropriate for the metric type.
 */
export function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'avg_session_duration_sec':
      return formatDuration(value)
    case 'dau_mau_ratio':
      return `${(value * 100).toFixed(1)}%`
    case 'avg_events_per_session':
      return value.toFixed(1)
    default:
      return formatCompactNumber(value)
  }
}

/**
 * Compute period-over-period % change.
 * Returns null if previous is 0 (avoid division by zero → show "—").
 */
export function computePctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`
  }
  return n.toLocaleString()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/lib/__tests__/format-metric.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/lib/format-metric.ts apps/web/frontend/lib/__tests__/format-metric.test.ts
git commit -m "feat(mission-control): add formatMetricValue utility"
```

---

## Task 2: `useMissionControlTrends` hook

**Files:**
- Create: `apps/web/frontend/features/dashboard/hooks/useMissionControlTrends.ts`
- Create: `apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControlTrends.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControlTrends.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useMissionControlTrends } from '../useMissionControlTrends'

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchMissionControlTrend: vi.fn(),
}))

// Mock the store
vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    activeFilters: {},
    activeConnectionId: 'conn-1',
  })),
}))

import { fetchMissionControlTrend } from '@/lib/api'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const dateRange = {
  from: new Date('2024-02-20'),
  to: new Date('2024-03-21'),
}

describe('useMissionControlTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchMissionControlTrend).mockResolvedValue({
      metric: 'total_events',
      data: [
        { date: '2024-02-20', value: 1000 },
        { date: '2024-02-21', value: 1200 },
      ],
    })
  })

  it('returns trends object with all 8 metric keys', async () => {
    const { result } = renderHook(() => useMissionControlTrends({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      const keys = Object.keys(result.current.trends)
      expect(keys).toContain('total_events')
      expect(keys).toContain('unique_users')
      expect(keys).toContain('total_sessions')
      expect(keys).toContain('avg_session_duration_sec')
      expect(keys).toContain('avg_events_per_session')
      expect(keys).toContain('new_users')
      expect(keys).toContain('returning_users')
      expect(keys).toContain('dau_mau_ratio')
    })
  })

  it('maps trend response data to plain number arrays', async () => {
    const { result } = renderHook(() => useMissionControlTrends({ dateRange }), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => {
      expect(result.current.trends['total_events'].values).toEqual([1000, 1200])
    })
  })

  it('does not fire queries when dateRange dates are missing', () => {
    renderHook(
      () => useMissionControlTrends({ dateRange: { from: undefined, to: undefined } }),
      { wrapper: makeWrapper() }
    )
    expect(fetchMissionControlTrend).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControlTrends.test.ts
```

Expected: FAIL — "Cannot find module '../useMissionControlTrends'"

- [ ] **Step 3: Implement the hook**

Create `apps/web/frontend/features/dashboard/hooks/useMissionControlTrends.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchMissionControlTrend } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange } from '@/types'

const METRICS = [
  'total_events',
  'unique_users',
  'total_sessions',
  'avg_session_duration_sec',
  'avg_events_per_session',
  'new_users',
  'returning_users',
  'dau_mau_ratio',
] as const

export type TrendMetric = (typeof METRICS)[number]

export interface MetricTrend {
  values: number[]
  loading: boolean
}

export interface UseMissionControlTrendsReturn {
  trends: Record<TrendMetric, MetricTrend>
}

export function useMissionControlTrends({
  dateRange,
}: {
  dateRange: DateRange
}): UseMissionControlTrendsReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const enabled = !!activeConnectionId && !!startDate && !!endDate

  // 8 unconditional useQuery calls — Rules of Hooks requires consistent call order.
  // All share the same enabled flag and staleTime; TanStack Query deduplicates cache.
  const results = METRICS.map((metric) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: [
        'missionControlTrend',
        metric,
        startDate,
        endDate,
        activeFilters,
        activeConnectionId,
      ],
      queryFn: () =>
        fetchMissionControlTrend({
          metric,
          start_date: startDate!,
          end_date: endDate!,
          filters: activeFilters,
          connection_id: activeConnectionId ?? undefined,
        }),
      enabled,
      staleTime: QUERY_STALE_TIME.default,
    })
  )

  const trends = Object.fromEntries(
    METRICS.map((metric, i) => [
      metric,
      {
        values: results[i].data?.data.map((d) => d.value) ?? [],
        loading: results[i].isLoading,
      },
    ])
  ) as Record<TrendMetric, MetricTrend>

  return { trends }
}
```

> **Note on the ESLint disable comment:** calling hooks inside `.map()` triggers the `react-hooks/rules-of-hooks` lint rule. This is a known pattern for fixed-length arrays — the array is a `const` tuple so the call count never changes. The disable comment is correct and intentional. If the lint rule blocks CI, add a per-line disable; do not restructure to avoid this pattern.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControlTrends.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/dashboard/hooks/useMissionControlTrends.ts \
        apps/web/frontend/features/dashboard/hooks/__tests__/useMissionControlTrends.test.ts
git commit -m "feat(mission-control): add useMissionControlTrends hook (8 parallel trend queries)"
```

---

## Task 3: `MiniMetricCard` component

**Files:**
- Create: `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx`
- Create: `apps/web/frontend/features/dashboard/components/__tests__/MiniMetricCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/frontend/features/dashboard/components/__tests__/MiniMetricCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MiniMetricCard } from '../MiniMetricCard'

// SparklineChart renders SVG — mock it to keep tests simple
vi.mock('@/components/charts/sparkline-chart', () => ({
  SparklineChart: () => <svg data-testid="sparkline" />,
}))

const baseProps = {
  label: 'Unique Users',
  value: '48.2K',
  pctChange: 8.1,
  sparklineValues: [100, 110, 120, 130, 140],
  color: '#10b981',
}

describe('MiniMetricCard', () => {
  it('renders the label', () => {
    render(<MiniMetricCard {...baseProps} />)
    expect(screen.getByText('Unique Users')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(<MiniMetricCard {...baseProps} />)
    expect(screen.getByText('48.2K')).toBeInTheDocument()
  })

  it('renders positive % change with up arrow', () => {
    render(<MiniMetricCard {...baseProps} pctChange={8.1} />)
    expect(screen.getByText(/8\.1%/)).toBeInTheDocument()
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders negative % change with down arrow', () => {
    render(<MiniMetricCard {...baseProps} pctChange={-2.3} />)
    expect(screen.getByText(/2\.3%/)).toBeInTheDocument()
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })

  it('renders "—" when pctChange is null', () => {
    render(<MiniMetricCard {...baseProps} pctChange={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders a sparkline', () => {
    render(<MiniMetricCard {...baseProps} />)
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<MiniMetricCard {...baseProps} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies hero border style when isHero is true', () => {
    render(<MiniMetricCard {...baseProps} isHero />)
    const card = screen.getByRole('button')
    expect(card.className).toMatch(/border-primary/)
  })

  it('renders loading skeleton when loading is true', () => {
    render(<MiniMetricCard {...baseProps} loading />)
    expect(screen.queryByText('48.2K')).not.toBeInTheDocument()
    // Skeleton is rendered instead
    expect(document.querySelector('[class*="animate-pulse"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/components/__tests__/MiniMetricCard.test.tsx
```

Expected: FAIL — "Cannot find module '../MiniMetricCard'"

- [ ] **Step 3: Implement the component**

Create `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx`:

```typescript
import { SparklineChart } from '@/components/charts/sparkline-chart'
import { cn } from '@/lib/utils'

export interface MiniMetricCardProps {
  label: string
  value: string           // pre-formatted (e.g. "48.2K", "2m 22s", "34.0%")
  pctChange: number | null  // null → show "—"
  sparklineValues: number[]
  color: string           // CSS color string for sparkline stroke
  isHero?: boolean        // highlight border when this metric is the hero
  onClick?: () => void
  loading?: boolean
  fullWidth?: boolean     // true for DAU/MAU which spans 2 cols
}

export function MiniMetricCard({
  label,
  value,
  pctChange,
  sparklineValues,
  color,
  isHero,
  onClick,
  loading,
  fullWidth,
}: MiniMetricCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border p-3 animate-pulse',
          fullWidth && 'col-span-2'
        )}
        aria-busy="true"
      >
        <div className="h-3 w-16 bg-muted rounded mb-3" />
        <div className="h-5 w-20 bg-muted rounded mb-2" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    )
  }

  const isPositive = pctChange !== null && pctChange >= 0
  const isNegative = pctChange !== null && pctChange < 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left w-full transition-colors',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isHero ? 'border-2 border-primary' : 'border-border',
        fullWidth && 'col-span-2'
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold tracking-tight leading-none">{value}</div>
          <div className="mt-1.5">
            {pctChange === null ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
                  isPositive && 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
                  isNegative && 'text-destructive bg-destructive/10'
                )}
              >
                <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span>
                <span className="sr-only">{isPositive ? 'increased by' : 'decreased by'}</span>
                {Math.abs(pctChange).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <SparklineChart
          data={sparklineValues}
          width={fullWidth ? 100 : 60}
          height={24}
          color={color}
          showArea={false}
          strokeWidth={1.5}
        />
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/components/__tests__/MiniMetricCard.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx \
        apps/web/frontend/features/dashboard/components/__tests__/MiniMetricCard.test.tsx
git commit -m "feat(mission-control): add MiniMetricCard component"
```

---

## Task 4: `HeroMetricCard` component

**Files:**
- Create: `apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx`
- Create: `apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroMetricCard } from '../HeroMetricCard'

// Mock Recharts AreaChartComponent — it uses ResizeObserver which isn't in jsdom
vi.mock('@/components/charts/area-chart', () => ({
  AreaChartComponent: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div data-testid="area-chart" aria-label={ariaLabel} />
  ),
}))

const baseProps = {
  label: 'Total Events',
  value: '1.24M',
  pctChange: 12.4,
  previousValue: '1.10M',
  sparklineValues: [100, 110, 120, 130, 140, 150, 160],
  color: 'hsl(var(--chart-1))',
}

describe('HeroMetricCard', () => {
  it('renders the metric label', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
  })

  it('renders the formatted value', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText('1.24M')).toBeInTheDocument()
  })

  it('renders positive % change', () => {
    render(<HeroMetricCard {...baseProps} pctChange={12.4} />)
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument()
    expect(screen.getByText(/↑/)).toBeInTheDocument()
  })

  it('renders negative % change', () => {
    render(<HeroMetricCard {...baseProps} pctChange={-2.3} />)
    expect(screen.getByText(/2\.3%/)).toBeInTheDocument()
    expect(screen.getByText(/↓/)).toBeInTheDocument()
  })

  it('renders "—" when pctChange is null', () => {
    render(<HeroMetricCard {...baseProps} pctChange={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the previous value', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByText(/prev: 1\.10M/)).toBeInTheDocument()
  })

  it('renders the area chart', () => {
    render(<HeroMetricCard {...baseProps} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading is true', () => {
    render(<HeroMetricCard {...baseProps} loading />)
    expect(screen.queryByText('1.24M')).not.toBeInTheDocument()
    expect(document.querySelector('[class*="animate-pulse"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx
```

Expected: FAIL — "Cannot find module '../HeroMetricCard'"

- [ ] **Step 3: Implement the component**

Create `apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx`:

```typescript
import { AreaChartComponent } from '@/components/charts/area-chart'
import { cn } from '@/lib/utils'

export interface HeroMetricCardProps {
  label: string
  value: string
  pctChange: number | null
  previousValue: string    // formatted, shown as "prev: {previousValue}"
  sparklineValues: number[]
  color: string
  loading?: boolean
}

export function HeroMetricCard({
  label,
  value,
  pctChange,
  previousValue,
  sparklineValues,
  color,
  loading,
}: HeroMetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border p-5 flex flex-col gap-4 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="flex-1 min-h-[120px] bg-muted rounded-lg" />
      </div>
    )
  }

  const isPositive = pctChange !== null && pctChange >= 0
  const isNegative = pctChange !== null && pctChange < 0

  // Build chart data from sparklineValues (dates are approximations — hero chart shows shape)
  const chartData = sparklineValues.map((v, i) => ({ day: String(i), value: v }))

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col"
      style={{
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        background: `color-mix(in srgb, ${color} 5%, transparent)`,
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color }}
      >
        {label}
      </div>

      <div className="text-4xl font-extrabold tracking-tight leading-none">{value}</div>

      <div className="flex items-center gap-2 mt-2">
        {pctChange === null ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-md',
              isPositive && 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
              isNegative && 'text-destructive bg-destructive/10'
            )}
          >
            <span aria-hidden="true">{isPositive ? '↑' : '↓'}</span>
            <span className="sr-only">{isPositive ? 'increased by' : 'decreased by'}</span>
            {Math.abs(pctChange).toFixed(1)}%
          </span>
        )}
        <span className="text-xs text-muted-foreground">prev: {previousValue}</span>
      </div>

      <div className="mt-4 flex-1 min-h-[120px]">
        <AreaChartComponent
          data={chartData}
          dataKey="value"
          name={label}
          color={color}
          height={140}
          ariaLabel={`${label} daily trend chart`}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx \
        apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx
git commit -m "feat(mission-control): add HeroMetricCard component"
```

---

## Task 5: `MissionControlGrid` component

**Files:**
- Create: `apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx`
- Create: `apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx`

The spec's metric color assignments use indices into `CHART_COLORS.series`. Since that array has only 5 distinct values (repeating for indices 5–7), we'll hardcode the per-metric color map directly in this component for clarity.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MissionControlGrid } from '../MissionControlGrid'
import type { MissionControlResponse } from '@/types'

vi.mock('../MiniMetricCard', () => ({
  MiniMetricCard: ({ label, isHero, onClick }: { label: string; isHero?: boolean; onClick?: () => void }) => (
    <button onClick={onClick} data-hero={isHero ? 'true' : 'false'} data-testid={`mini-${label}`}>
      {label}
    </button>
  ),
}))

vi.mock('../HeroMetricCard', () => ({
  HeroMetricCard: ({ label }: { label: string }) => (
    <div data-testid="hero-card">{label}</div>
  ),
}))

const mockData: MissionControlResponse = {
  period: { start_date: '2024-02-20', end_date: '2024-03-21' },
  previous_period: { start_date: '2024-01-21', end_date: '2024-02-19' },
  current: {
    total_events: 1240000,
    unique_users: 48200,
    total_sessions: 89700,
    avg_session_duration_sec: 142.5,
    avg_events_per_session: 13.8,
    new_users: 12400,
    returning_users: 35800,
    dau_mau_ratio: 0.34,
  },
  previous: {
    total_events: 1100000,
    unique_users: 44500,
    total_sessions: 91000,
    avg_session_duration_sec: 138.2,
    avg_events_per_session: 12.1,
    new_users: 11200,
    returning_users: 33300,
    dau_mau_ratio: 0.31,
  },
}

const emptyTrends = Object.fromEntries(
  [
    'total_events', 'unique_users', 'total_sessions', 'avg_session_duration_sec',
    'avg_events_per_session', 'new_users', 'returning_users', 'dau_mau_ratio',
  ].map((k) => [k, { values: [], loading: false }])
) as any

describe('MissionControlGrid', () => {
  it('renders the hero card with Total Events by default', () => {
    render(<MissionControlGrid data={mockData} trends={emptyTrends} isLoading={false} />)
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Total Events')
  })

  it('renders all 7 supporting mini cards', () => {
    render(<MissionControlGrid data={mockData} trends={emptyTrends} isLoading={false} />)
    expect(screen.getByTestId('mini-Unique Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Sessions')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Avg Session')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Events / Session')).toBeInTheDocument()
    expect(screen.getByTestId('mini-New Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-Returning Users')).toBeInTheDocument()
    expect(screen.getByTestId('mini-DAU / MAU')).toBeInTheDocument()
  })

  it('shows category headers', () => {
    render(<MissionControlGrid data={mockData} trends={emptyTrends} isLoading={false} />)
    expect(screen.getByText('Volume')).toBeInTheDocument()
    expect(screen.getByText('Engagement')).toBeInTheDocument()
    expect(screen.getByText('Acquisition')).toBeInTheDocument()
    expect(screen.getByText('Stickiness')).toBeInTheDocument()
  })

  it('promotes a mini card to hero when clicked', () => {
    render(<MissionControlGrid data={mockData} trends={emptyTrends} isLoading={false} />)

    // Initially hero is Total Events
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Total Events')

    // Click Unique Users mini card
    fireEvent.click(screen.getByTestId('mini-Unique Users'))

    // Hero should now be Unique Users
    expect(screen.getByTestId('hero-card')).toHaveTextContent('Unique Users')
  })

  it('marks the promoted mini card with isHero', () => {
    render(<MissionControlGrid data={mockData} trends={emptyTrends} isLoading={false} />)
    fireEvent.click(screen.getByTestId('mini-Sessions'))
    expect(screen.getByTestId('mini-Sessions')).toHaveAttribute('data-hero', 'true')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx
```

Expected: FAIL — "Cannot find module '../MissionControlGrid'"

- [ ] **Step 3: Implement the component**

Create `apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx`:

```typescript
import { useState } from 'react'
import { HeroMetricCard } from './HeroMetricCard'
import { MiniMetricCard } from './MiniMetricCard'
import { formatMetricValue, computePctChange } from '@/lib/format-metric'
import type { MissionControlResponse } from '@/types'
import type { TrendMetric, MetricTrend } from '../hooks/useMissionControlTrends'

export interface MissionControlGridProps {
  data: MissionControlResponse | undefined
  trends: Record<TrendMetric, MetricTrend>
  isLoading: boolean
}

// Per-metric display config
const METRIC_CONFIG: Array<{
  key: TrendMetric
  label: string
  color: string
}> = [
  { key: 'total_events',             label: 'Total Events',      color: 'hsl(var(--chart-1))' },
  { key: 'unique_users',             label: 'Unique Users',      color: 'hsl(var(--chart-2))' },
  { key: 'total_sessions',           label: 'Sessions',          color: 'hsl(var(--chart-3))' },
  { key: 'avg_session_duration_sec', label: 'Avg Session',       color: 'hsl(var(--chart-4))' },
  { key: 'avg_events_per_session',   label: 'Events / Session',  color: 'hsl(var(--chart-5))' },
  { key: 'new_users',                label: 'New Users',         color: 'hsl(var(--chart-2))' },
  { key: 'returning_users',          label: 'Returning Users',   color: 'hsl(var(--chart-1))' },
  { key: 'dau_mau_ratio',            label: 'DAU / MAU',         color: 'hsl(var(--chart-5))' },
]

const CATEGORIES: Array<{
  label: string
  metrics: TrendMetric[]
}> = [
  { label: 'Volume',      metrics: ['unique_users', 'total_sessions'] },
  { label: 'Engagement',  metrics: ['avg_session_duration_sec', 'avg_events_per_session'] },
  { label: 'Acquisition', metrics: ['new_users', 'returning_users'] },
  { label: 'Stickiness',  metrics: ['dau_mau_ratio'] },
]

function getConfig(key: TrendMetric) {
  return METRIC_CONFIG.find((m) => m.key === key)!
}

export function MissionControlGrid({ data, trends, isLoading }: MissionControlGridProps) {
  const [heroMetric, setHeroMetric] = useState<TrendMetric>('total_events')

  const heroConfig = getConfig(heroMetric)
  const heroCurrentValue = data?.current[heroMetric] ?? 0
  const heroPreviousValue = data?.previous[heroMetric] ?? 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
      {/* LEFT: Hero card */}
      <HeroMetricCard
        label={heroConfig.label}
        value={formatMetricValue(heroMetric, heroCurrentValue)}
        pctChange={computePctChange(heroCurrentValue, heroPreviousValue)}
        previousValue={formatMetricValue(heroMetric, heroPreviousValue)}
        sparklineValues={trends[heroMetric]?.values ?? []}
        color={heroConfig.color}
        loading={isLoading}
      />

      {/* RIGHT: Categorized mini-grid */}
      <div className="flex flex-col gap-4">
        {CATEGORIES.map(({ label, metrics }) => (
          <div key={label}>
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              {label}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((metricKey) => {
                const cfg = getConfig(metricKey)
                const current = data?.current[metricKey] ?? 0
                const previous = data?.previous[metricKey] ?? 0
                return (
                  <MiniMetricCard
                    key={metricKey}
                    label={cfg.label}
                    value={formatMetricValue(metricKey, current)}
                    pctChange={computePctChange(current, previous)}
                    sparklineValues={trends[metricKey]?.values ?? []}
                    color={cfg.color}
                    isHero={heroMetric === metricKey}
                    onClick={() => setHeroMetric(metricKey)}
                    loading={isLoading}
                    fullWidth={metricKey === 'dau_mau_ratio'}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx \
        apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx
git commit -m "feat(mission-control): add MissionControlGrid with hero + categorized layout"
```

---

## Task 6: Wire `DashboardPage`, simplify `useMissionControl`, delete old components

**Files:**
- Modify: `apps/web/frontend/features/dashboard/DashboardPage.tsx`
- Modify: `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`
- Delete: `apps/web/frontend/features/dashboard/components/ActivityChart.tsx`
- Delete: `apps/web/frontend/features/dashboard/components/MetricCard.tsx`

- [ ] **Step 1: Verify no external imports of the files to delete**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
grep -r "ActivityChart" apps/web/frontend --include="*.tsx" --include="*.ts" -l
grep -r "MetricCard" apps/web/frontend --include="*.tsx" --include="*.ts" -l
```

Expected output: only `DashboardPage.tsx` for each. If other files appear, do NOT delete — move the component instead, and update those imports. If only DashboardPage appears, proceed.

- [ ] **Step 2: Simplify `useMissionControl` — remove trend query**

Open `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts`. Remove:
- The `trendMetric` field from `UseMissionControlOptions`
- The `trendData` and `trendLoading` fields from `UseMissionControlReturn`
- The entire second `useQuery` block (the trend query)
- The corresponding return fields

The file after editing should look like:

```typescript
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchMissionControl, fetchTopEvents } from '@/lib/api'
import { useAppStore } from '@/stores'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type { DateRange, MissionControlResponse } from '@/types'

export interface UseMissionControlOptions {
  dateRange: DateRange
}

export interface UseMissionControlReturn {
  data: MissionControlResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  topEvents: Array<{ name: string; count: number }>
  eventsLoading: boolean
}

export function useMissionControl({
  dateRange,
}: UseMissionControlOptions): UseMissionControlReturn {
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  const { activeFilters, activeConnectionId } = useAppStore()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['missionControl', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchMissionControl({
        start_date: startDate!,
        end_date: endDate!,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!activeConnectionId && !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  const { data: topEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['topEvents', startDate, endDate, activeFilters, activeConnectionId],
    queryFn: () =>
      fetchTopEvents({
        limit: 5,
        start_date: startDate,
        end_date: endDate,
        filters: activeFilters,
        connection_id: activeConnectionId ?? undefined,
      }),
    enabled: !!activeConnectionId && !!startDate && !!endDate,
    staleTime: QUERY_STALE_TIME.default,
  })

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    topEvents: topEventsData?.data ?? [],
    eventsLoading,
  }
}
```

- [ ] **Step 3: Run lint to verify no TypeScript errors from the hook change**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors relating to `useMissionControl`.

- [ ] **Step 4: Rewrite `DashboardPage.tsx`**

Replace the contents with:

```typescript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { PageTransition } from '@/components/layout/PageTransition'
import { MissionControlGrid } from './components/MissionControlGrid'
import { TopEvents } from './components/TopEvents'
import { useMissionControl } from './hooks/useMissionControl'
import { useMissionControlTrends } from './hooks/useMissionControlTrends'
import { QueryError } from '@/components/ui/query-error'
import { SPACING, TYPOGRAPHY } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Database } from 'lucide-react'
import { cn } from '@/lib/utils'

function DashboardFirstRun() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-start gap-8 px-1 py-8 max-w-lg">
      <div className="flex h-10 w-10 items-center justify-center border border-border">
        <Database className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h2 className={TYPOGRAPHY.sectionTitleSm}>Connect your warehouse</h2>
        <p className={cn(TYPOGRAPHY.muted, 'leading-relaxed')}>
          stratif.io queries your database directly — no data pipelines, no per-event fees. Connect
          once and your events are available immediately.
        </p>
      </div>

      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-5 pt-0.5">01</span>
          <div>
            <p className="font-medium">Add a connection</p>
            <p className="text-muted-foreground mt-0.5">
              Snowflake, Databricks, PostgreSQL, or DuckDB — provide credentials and stratif.io
              connects directly.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-5 pt-0.5">02</span>
          <div>
            <p className="font-medium">Point to your events table</p>
            <p className="text-muted-foreground mt-0.5">
              Tell stratif.io which table holds your events and which columns map to user, session,
              and timestamp.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground w-5 pt-0.5">03</span>
          <div>
            <p className="font-medium">Explore your data</p>
            <p className="text-muted-foreground mt-0.5">
              Mission Control metrics, activity charts, and top events — all queried live from your
              warehouse.
            </p>
          </div>
        </li>
      </ol>

      <Button onClick={() => navigate('/connections')}>Add your first connection</Button>
    </div>
  )
}

export function DashboardPage() {
  useEffect(() => {
    document.title = 'Mission Control — stratif.io'
  }, [])

  const { dateRange, activeConnectionId, setActiveConnectionId } = useAppStore()
  const { data, isLoading, isError, error, topEvents, eventsLoading } = useMissionControl({
    dateRange,
  })
  const { trends } = useMissionControlTrends({ dateRange })

  const isConnectionNotFound =
    isError && error instanceof Error && error.message.toLowerCase().includes('connection not found')

  useEffect(() => {
    if (isConnectionNotFound && activeConnectionId) {
      setActiveConnectionId(null)
    }
  }, [isConnectionNotFound, activeConnectionId, setActiveConnectionId])

  if (!activeConnectionId || isConnectionNotFound) {
    return (
      <PageTransition>
        <div className={SPACING.page}>
          <h1 className="sr-only">Mission Control</h1>
          <DashboardFirstRun />
        </div>
      </PageTransition>
    )
  }

  if (isError) return <QueryError error={error} />

  return (
    <PageTransition>
      <div className={SPACING.page}>
        <div className={SPACING.section}>
          <h1 className="sr-only">Mission Control</h1>
          <span className={TYPOGRAPHY.pageLabel}>Mission Control</span>

          <MissionControlGrid data={data} trends={trends} isLoading={isLoading} />

          <TopEvents events={topEvents} loading={eventsLoading} />
        </div>
      </div>
    </PageTransition>
  )
}
```

- [ ] **Step 5: Delete the old components**

```bash
git rm apps/web/frontend/features/dashboard/components/ActivityChart.tsx
git rm apps/web/frontend/features/dashboard/components/MetricCard.tsx
```

- [ ] **Step 6: Run full build + tests**

```bash
npm run build
npm run test:run
```

Expected: build passes (no TypeScript errors), all tests pass.

If build fails with "cannot find module" for `ActivityChart` or `MetricCard`, search for the stray import:

```bash
grep -r "ActivityChart\|MetricCard" apps/web/frontend --include="*.tsx" --include="*.ts"
```

Fix any remaining imports before proceeding.

- [ ] **Step 7: Run lint**

```bash
npm run lint
```

Expected: zero warnings. If the `react-hooks/rules-of-hooks` warning appears on `useMissionControlTrends.ts`, the `// eslint-disable-next-line` comment should suppress it — verify it's on the correct line (the line with `useQuery`, not the `.map()` call above it).

- [ ] **Step 8: Commit**

```bash
git add apps/web/frontend/features/dashboard/DashboardPage.tsx \
        apps/web/frontend/features/dashboard/hooks/useMissionControl.ts
git commit -m "feat(mission-control): wire MissionControlGrid into DashboardPage, remove old MetricCard and ActivityChart"
```

---

## Final verification

- [ ] Start the dev server and visually verify the Mission Control page

```bash
npm run dev
```

Open http://localhost:5173, navigate to Mission Control. Confirm:
- Hero card (Total Events) visible on the left with area chart
- 4 category sections on the right with mini cards
- Clicking a mini card promotes it to hero
- % change badges show up/down correctly
- Sparklines render for all cards (may be flat/empty if no data in dev)

- [ ] Run the full test suite one final time

```bash
npm run test:run
```

Expected: all pass.
