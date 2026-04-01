# SQL Viewer Period Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace vague "this period (1)" / "per day (2)" / "Change vs. previous period" labels throughout the Mission Control dashboard with precise text that includes the actual date range and correct granularity.

**Architecture:** Add a `formatPeriodRange` helper to `lib/format-metric.ts`. Thread `dateRange` into `MissionControlGrid` as a new prop; compute formatted period strings and `granularity` from the store there; pass them down to `buildAllSql`, `HeroMetricCard`, and `MiniMetricCard`. No backend changes, no store reads inside individual metric cards.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library

---

## File Map

| File                                                                                    | Change                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/frontend/lib/format-metric.ts`                                                | Add exported `formatPeriodRange` function                                                                                                                  |
| `apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx`                | Add `dateRange` prop; read `granularity` from store; compute period labels; pass `changeLabel`, `prevPeriodLabel` to cards; update `buildAllSql` signature |
| `apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx`                    | Add `prevPeriodLabel?: string` prop; use it in the `prev. period:` label                                                                                   |
| `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx`                    | No interface change needed — `changeLabel` prop already exists; caller change only                                                                         |
| `apps/web/frontend/features/dashboard/DashboardPage.tsx`                                | Pass `dateRange` to `MissionControlGrid`                                                                                                                   |
| `apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx` | Add `dateRange` to all renders; add label-output tests                                                                                                     |
| `apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx`     | Add tests for `prevPeriodLabel` prop                                                                                                                       |

---

## Task 1: Add `formatPeriodRange` to `lib/format-metric.ts`

**Files:**

- Modify: `apps/web/frontend/lib/format-metric.ts`

- [ ] **Step 1: Write the failing test**

Create a new test file `apps/web/frontend/lib/__tests__/format-metric.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatPeriodRange } from '../format-metric'

describe('formatPeriodRange', () => {
  it('returns formatted range when both dates provided', () => {
    expect(formatPeriodRange('2025-01-01', '2026-01-01')).toBe('2025-01-01 – 2026-01-01')
  })

  it('returns undefined when start is missing', () => {
    expect(formatPeriodRange(undefined, '2026-01-01')).toBeUndefined()
  })

  it('returns undefined when end is missing', () => {
    expect(formatPeriodRange('2025-01-01', undefined)).toBeUndefined()
  })

  it('returns undefined when both are missing', () => {
    expect(formatPeriodRange()).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd apps/web && bun run test:run -- lib/__tests__/format-metric.test.ts
```

Expected: FAIL — `formatPeriodRange is not exported`

- [ ] **Step 3: Add the function to `lib/format-metric.ts`**

Add at the bottom of `apps/web/frontend/lib/format-metric.ts`:

```ts
/**
 * Format a period date range for display labels.
 * Returns "2025-01-01 – 2026-01-01" (en-dash) or undefined when either date is missing.
 */
export function formatPeriodRange(start?: string, end?: string): string | undefined {
  if (!start || !end) return undefined
  return `${start} – ${end}`
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/web && bun run test:run -- lib/__tests__/format-metric.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web && git add frontend/lib/format-metric.ts frontend/lib/__tests__/format-metric.test.ts
git commit -m "feat: add formatPeriodRange helper to format-metric"
```

---

## Task 2: Add `prevPeriodLabel` prop to `HeroMetricCard`

**Files:**

- Modify: `apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx`
- Modify: `apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `apps/web/frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx`:

```ts
it('renders "prev. period:" label when prevPeriodLabel is not provided', () => {
  renderWithTooltip(<HeroMetricCard {...baseProps} />)
  expect(screen.getByText(/prev\. period:/)).toBeInTheDocument()
})

it('renders prevPeriodLabel when provided', () => {
  renderWithTooltip(
    <HeroMetricCard {...baseProps} prevPeriodLabel="2025-01-01 – 2025-12-31" />
  )
  expect(screen.getByText(/prev\. \(2025-01-01 – 2025-12-31\):/)).toBeInTheDocument()
  expect(screen.queryByText(/prev\. period:/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
cd apps/web && bun run test:run -- features/dashboard/components/__tests__/HeroMetricCard.test.tsx
```

Expected: 2 new tests FAIL (prop doesn't exist yet), existing tests still PASS

- [ ] **Step 3: Update `HeroMetricCardProps` and the component**

In `apps/web/frontend/features/dashboard/components/HeroMetricCard.tsx`:

Add `prevPeriodLabel?: string` to `HeroMetricCardProps`:

```ts
export interface HeroMetricCardProps {
  label: string
  metricKey: string
  value: string
  rawValue?: number
  pctChange: number | null
  previousValue: string
  sparklineValues: number[]
  sparklineDates?: string[]
  sparklinePreviousValues?: number[]
  sparklinePreviousDates?: string[]
  color: string
  loading?: boolean
  description?: string
  changeLabel?: string
  prevPeriodLabel?: string
  currentMetrics?: MissionControlMetrics
  breakdown?: MetricBreakdown
}
```

Destructure it in the component function signature (add `prevPeriodLabel` alongside the existing destructured props).

Replace this line in the JSX (currently around line 264):

```tsx
<span className="text-xs text-muted-foreground">
  prev. period: <span className="font-medium">{previousValue}</span>
</span>
```

With:

```tsx
<span className="text-xs text-muted-foreground">
  {prevPeriodLabel ? `prev. (${prevPeriodLabel}):` : 'prev. period:'}{' '}
  <span className="font-medium">{previousValue}</span>
</span>
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/web && bun run test:run -- features/dashboard/components/__tests__/HeroMetricCard.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
cd apps/web && git add frontend/features/dashboard/components/HeroMetricCard.tsx frontend/features/dashboard/components/__tests__/HeroMetricCard.test.tsx
git commit -m "feat: add prevPeriodLabel prop to HeroMetricCard"
```

---

## Task 3: Update `MissionControlGrid` — wire up date labels

**Files:**

- Modify: `apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx`
- Modify: `apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx`

This task covers all four surfaces: `buildAllSql` labels, `changeLabel` for MiniMetricCard, `changeLabel` for HeroMetricCard, and `prevPeriodLabel` for HeroMetricCard.

- [ ] **Step 1: Write failing tests**

Add to `apps/web/frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx`:

First update the mock for `MiniMetricCard` to capture `changeLabel`:

```tsx
vi.mock('../MiniMetricCard', () => ({
  MiniMetricCard: ({
    label,
    isHero,
    onClick,
    changeLabel,
  }: {
    label: string
    isHero?: boolean
    onClick?: () => void
    changeLabel?: string
  }) => (
    <button
      onClick={onClick}
      data-hero={isHero ? 'true' : 'false'}
      data-testid={`mini-${label}`}
      data-change-label={changeLabel}
    >
      {label}
    </button>
  ),
}))
```

Update the mock for `HeroMetricCard` to capture `changeLabel` and `prevPeriodLabel`:

```tsx
vi.mock('../HeroMetricCard', () => ({
  HeroMetricCard: ({
    label,
    changeLabel,
    prevPeriodLabel,
  }: {
    label: string
    changeLabel?: string
    prevPeriodLabel?: string
  }) => (
    <div
      data-testid="hero-card"
      data-change-label={changeLabel}
      data-prev-period-label={prevPeriodLabel}
    >
      {label}
    </div>
  ),
}))
```

Add `dateRange` to `mockDateRange` and the new test cases. Also add `dateRange` to the helper renders. Note: you'll need to add `dateRange` to all existing render calls too (see step 3).

Add the new test cases:

```tsx
const mockDateRange = {
  from: new Date('2025-01-01'),
  to: new Date('2026-01-01'),
}

const mockDateRangeNoEnd = {
  from: new Date('2025-01-01'),
  to: null,
}

describe('MissionControlGrid period labels', () => {
  it('passes changeLabel with dates to HeroMetricCard when dateRange is set', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveAttribute(
      'data-change-label',
      'Change vs. 2024-01-21 – 2024-02-19'
    )
  })

  it('passes prevPeriodLabel with dates to HeroMetricCard when dateRange is set', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveAttribute(
      'data-prev-period-label',
      '2024-01-21 – 2024-02-19'
    )
  })

  it('passes changeLabel with dates to MiniMetricCard when dateRange is set', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRange}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('mini-Unique Users')).toHaveAttribute(
      'data-change-label',
      'Change vs. 2024-01-21 – 2024-02-19'
    )
  })

  it('passes generic changeLabel when dateRange has no end', () => {
    render(
      <MissionControlGrid
        data={mockData}
        trends={emptyTrends}
        metricLoading={noMetricLoading}
        dateRange={mockDateRangeNoEnd}
        {...defaultPinProps}
      />
    )
    expect(screen.getByTestId('hero-card')).toHaveAttribute(
      'data-change-label',
      'Change vs. previous period'
    )
  })
})
```

- [ ] **Step 2: Run to confirm the new tests fail**

```bash
cd apps/web && bun run test:run -- features/dashboard/components/__tests__/MissionControlGrid.test.tsx
```

Expected: new tests FAIL (no `dateRange` prop yet), existing tests PASS

- [ ] **Step 3: Update `MissionControlGrid`**

**3a. Update imports** at the top of `MissionControlGrid.tsx`:

```ts
import { memo, useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/stores'
import { formatPeriodRange } from '@/lib/format-metric'
import type { DateRange, Granularity } from '@/types'
// ... rest of existing imports
```

**3b. Update `MissionControlGridProps`** — add `dateRange`:

```ts
export interface MissionControlGridProps {
  data: MissionControlResponse | undefined
  trends: Record<TrendMetric, MetricTrend>
  metricLoading: Record<TrendMetric, boolean>
  metricSql?: Record<TrendMetric, string | string[] | null>
  dateRange: DateRange
  togglePin: (key: string) => void
  isPinned: (key: string) => boolean
  resetToDefault: () => void
}
```

**3c. Update `buildAllSql` signature and labels**:

Replace the existing `buildAllSql` function entirely:

```ts
function buildAllSql(
  metricSql: string | string[] | null | undefined,
  trendSql: string | string[] | undefined,
  label: string,
  currentPeriodLabel: string,
  previousPeriodLabel: string,
  granularity: Granularity
): { sql: string | string[] | undefined; sqlLabels: string | string[] | undefined } {
  const parts: string[] = []
  const labelParts: string[] = []

  if (metricSql) {
    const qs = Array.isArray(metricSql) ? metricSql : [metricSql]
    parts.push(...qs)
    labelParts.push(
      ...qs.map((_, i) =>
        i === 0
          ? `Number of ${label} — ${currentPeriodLabel}`
          : `Number of ${label} — ${previousPeriodLabel}`
      )
    )
  }

  if (trendSql) {
    const qs = Array.isArray(trendSql) ? trendSql : [trendSql]
    parts.push(...qs)
    labelParts.push(
      ...qs.map((_, i) =>
        i === 0
          ? `${label} per ${granularity} — ${currentPeriodLabel}`
          : `${label} per ${granularity} — ${previousPeriodLabel}`
      )
    )
  }

  if (parts.length === 0) return { sql: undefined, sqlLabels: undefined }
  if (parts.length === 1) return { sql: parts[0], sqlLabels: labelParts[0] }
  return { sql: parts, sqlLabels: labelParts }
}
```

**3d. Destructure `dateRange` and compute labels in `MissionControlGrid`**:

In the `MissionControlGrid` function body, after the existing destructuring, add:

```ts
const granularity = useAppStore((s) => s.granularity)

// Compute formatted period strings from data (available after first load)
const prevStart = data?.previous_period?.start_date
const prevEnd = data?.previous_period?.end_date
const curStart = data?.period?.start_date
const curEnd = data?.period?.end_date

const currentRange = formatPeriodRange(curStart, curEnd)
const previousRange = formatPeriodRange(prevStart, prevEnd)

const currentPeriodLabel = currentRange ? `this period (${currentRange})` : 'this period'
const previousPeriodLabel = previousRange ? `previous period (${previousRange})` : 'previous period'
const changeLabel = previousRange ? `Change vs. ${previousRange}` : 'Change vs. previous period'
const prevPeriodLabel = previousRange ?? undefined
```

**3e. Pass extra args to all `buildAllSql` calls** (there are two: for hero and for mini cards):

```ts
// Hero card:
{...buildAllSql(
  metricSql?.[heroMetric],
  trends[heroMetric]?.sql,
  heroConfig.label,
  currentPeriodLabel,
  previousPeriodLabel,
  granularity
)}

// Mini cards:
{...buildAllSql(
  metricSql?.[metricKey],
  trends[metricKey]?.sql,
  cfg.label,
  currentPeriodLabel,
  previousPeriodLabel,
  granularity
)}
```

**3f. Pass `changeLabel` and `prevPeriodLabel` to `HeroMetricCard`**:

```tsx
<HeroMetricCard
  label={heroConfig.label}
  metricKey={heroMetric}
  value={formatMetricValue(heroMetric, heroCurrentValue)}
  rawValue={heroCurrentValue}
  pctChange={computePctChange(heroCurrentValue, heroPreviousValue)}
  previousValue={
    heroPreviousValue !== null ? formatMetricValue(heroMetric, heroPreviousValue) : '—'
  }
  sparklineValues={trends[heroMetric]?.values ?? []}
  sparklineDates={trends[heroMetric]?.dates}
  sparklinePreviousValues={trends[heroMetric]?.previousValues}
  sparklinePreviousDates={trends[heroMetric]?.previousDates}
  color={heroConfig.color}
  loading={(metricLoading[heroMetric] ?? true) || (trends[heroMetric]?.loading ?? true)}
  currentMetrics={data?.current}
  changeLabel={changeLabel}
  prevPeriodLabel={prevPeriodLabel}
/>
```

**3g. Pass `changeLabel` to `MiniMetricCard`** — find the MiniMetricCard render and add:

```tsx
changeLabel = { changeLabel }
```

alongside the other props already passed.

**3h. Update all existing test renders in `MissionControlGrid.test.tsx`** — add `dateRange={mockDateRange}` to every existing `<MissionControlGrid ... />` render call in the test file so TypeScript doesn't complain about the now-required prop.

- [ ] **Step 4: Run tests**

```bash
cd apps/web && bun run test:run -- features/dashboard/components/__tests__/MissionControlGrid.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Type-check**

```bash
cd apps/web && bun run build 2>&1 | head -40
```

Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add frontend/features/dashboard/components/MissionControlGrid.tsx frontend/features/dashboard/components/__tests__/MissionControlGrid.test.tsx
git commit -m "feat: add date-range period labels to SQL viewer DevCard tabs and metric cards"
```

---

## Task 4: Pass `dateRange` from `DashboardPage`

**Files:**

- Modify: `apps/web/frontend/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Pass `dateRange` to `MissionControlGrid`**

In `DashboardPage.tsx`, `dateRange` is already available (from `useAppStore()`). Update the `MissionControlGrid` JSX:

```tsx
<MissionControlGrid
  data={data}
  trends={trends}
  metricLoading={metricLoading}
  metricSql={metricSql}
  dateRange={dateRange}
  togglePin={togglePin}
  isPinned={isPinned}
  resetToDefault={resetToDefault}
/>
```

- [ ] **Step 2: Type-check and run all dashboard tests**

```bash
cd apps/web && bun run build 2>&1 | head -40
bun run test:run -- features/dashboard
```

Expected: no errors, all tests PASS

- [ ] **Step 3: Commit**

```bash
cd apps/web && git add frontend/features/dashboard/DashboardPage.tsx
git commit -m "feat: wire dateRange into MissionControlGrid for period labels"
```

---

## Task 5: Final check

- [ ] **Step 1: Run full test suite**

```bash
cd apps/web && bun run test:run
```

Expected: all tests PASS, no regressions

- [ ] **Step 2: Type-check**

```bash
cd apps/web && bun run build 2>&1 | head -60
```

Expected: zero TypeScript errors

- [ ] **Step 3: Lint**

```bash
cd apps/web && bun run lint
```

Expected: zero warnings
