# Trend → Pivot Explorer Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Run in Pivot Explorer" ghost button below the Trend chart that navigates to `/pivot` with the current measure, breakdown, and filters pre-seeded.

**Architecture:** State is encoded into URL search params when navigating to `/pivot`. `NewPivotPage` reads those params and passes typed initial state to `PivotTable`. `PivotTable` accepts optional `initialRowGroups`, `initialValueCols`, and `initialPivotFilters` props and uses them to skip the default-seeding effect.

**Tech Stack:** React 18, React Router v6 (`useNavigate`, `useSearchParams`), TypeScript, Vitest + Testing Library

---

## File Map

| File                                                                                 | Change                                                   |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `apps/web/frontend/components/pivot-table/types.ts`                                  | Add 3 optional props to `PivotTableProps`                |
| `apps/web/frontend/components/pivot-table/PivotTable.tsx`                            | Accept + use initial props; guard default-seeding effect |
| `apps/web/frontend/components/pivot-table/__tests__/PivotTableInitialState.test.tsx` | New — test initial-state seeding                         |
| `apps/web/frontend/features/analytics/trends/trendToPivot.ts`                        | New — `buildPivotUrl()` pure helper                      |
| `apps/web/frontend/features/analytics/trends/__tests__/trendToPivot.test.ts`         | New — unit tests for `buildPivotUrl`                     |
| `apps/web/frontend/features/analytics/pivot/parseTrendParams.ts`                     | New — `parseTrendParams()` pure helper                   |
| `apps/web/frontend/features/analytics/pivot/__tests__/parseTrendParams.test.ts`      | New — unit tests for `parseTrendParams`                  |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`                         | Add button + `useNavigate`                               |
| `apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx`                        | Read params, pass initial state to `PivotTable`          |

---

## Task 1: Extend `PivotTableProps` with optional initial-state props

**Files:**

- Modify: `apps/web/frontend/components/pivot-table/types.ts`

- [ ] **Step 1: Add the three optional props to `PivotTableProps`**

In `apps/web/frontend/components/pivot-table/types.ts`, update `PivotTableProps`:

```ts
export interface PivotTableProps {
  colDefsData: PivotColDefsResponse | undefined
  colDefsLoading: boolean
  startDate?: string
  endDate?: string
  activeFilters: Record<string, string>
  activeConnectionId?: string | null
  fetchRows: (params: PivotRowsRequest) => Promise<PivotRowsResponse>
  fetchFilterValues: (field: string) => Promise<string[]>
  // Optional initial state injected from Trend page handoff
  initialRowGroups?: ZoneCol[]
  initialValueCols?: ZoneCol[]
  initialPivotFilters?: FilterEntry[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/stratifio-oss && bun run build 2>&1 | head -30
```

Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/pivot-table/types.ts
git commit -m "feat: add initial-state props to PivotTableProps"
```

---

## Task 2: Update `PivotTable` to consume initial-state props

**Files:**

- Modify: `apps/web/frontend/components/pivot-table/PivotTable.tsx`
- Create: `apps/web/frontend/components/pivot-table/__tests__/PivotTableInitialState.test.tsx`

- [ ] **Step 1: Write a failing test**

Create `apps/web/frontend/components/pivot-table/__tests__/PivotTableInitialState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PivotTable } from '../PivotTable'
import type { PivotTableProps, ZoneCol, FilterEntry } from '../types'

// Minimal stub props — tests only care about initial state
function makeProps(overrides: Partial<PivotTableProps> = {}): PivotTableProps {
  return {
    colDefsData: undefined,
    colDefsLoading: false,
    startDate: undefined,
    endDate: undefined,
    activeFilters: {},
    activeConnectionId: 'conn-1',
    fetchRows: vi.fn().mockResolvedValue({ rows: [], columnDefs: [] }),
    fetchFilterValues: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe('PivotTable initial state from Trend handoff', () => {
  it('renders initial value col chip when initialValueCols provided', () => {
    const initialValueCols: ZoneCol[] = [{ colId: 'event_count', label: 'Events', aggFunc: 'sum' }]
    render(<PivotTable {...makeProps({ initialValueCols })} />)
    expect(screen.getByText('Events')).toBeInTheDocument()
  })

  it('renders initial row group chip when initialRowGroups provided', () => {
    const initialRowGroups: ZoneCol[] = [{ colId: 'country', label: 'Country' }]
    render(<PivotTable {...makeProps({ initialRowGroups })} />)
    expect(screen.getByText('Country')).toBeInTheDocument()
  })

  it('renders initial pivot filter when initialPivotFilters provided', () => {
    const initialPivotFilters: FilterEntry[] = [
      { field: 'platform', fieldLabel: 'platform', value: 'web' },
    ]
    render(<PivotTable {...makeProps({ initialPivotFilters })} />)
    expect(screen.getByText('web')).toBeInTheDocument()
  })

  it('skips default-seeding effect when initialValueCols provided', async () => {
    // colDefsData has event_count and user_id — but they must NOT be added
    // because initialValueCols already seeds the state
    const initialValueCols: ZoneCol[] = [{ colId: 'event_count', label: 'Events', aggFunc: 'sum' }]
    const colDefsData = {
      columnDefs: [
        { field: 'event_count', headerName: 'Events', enableValue: true, allowedAggFuncs: ['sum'] },
        {
          field: 'user_id',
          headerName: 'Users',
          enableValue: true,
          allowedAggFuncs: ['count_distinct'],
        },
      ],
    }
    render(<PivotTable {...makeProps({ initialValueCols, colDefsData })} />)
    // Only the initial col should be present — NOT the auto-seeded user_id
    const chips = screen.getAllByText(/Events|Users/)
    expect(chips).toHaveLength(1)
    expect(chips[0].textContent).toContain('Events')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test:run apps/web/frontend/components/pivot-table/__tests__/PivotTableInitialState.test.tsx
```

Expected: FAIL — props not yet accepted.

- [ ] **Step 3: Update `PivotTable` to accept and use initial props**

In `apps/web/frontend/components/pivot-table/PivotTable.tsx`:

**a) Update the destructure at line 39 to include the new props:**

```ts
export function PivotTable({
  colDefsData,
  colDefsLoading,
  startDate,
  endDate,
  activeFilters,
  activeConnectionId,
  fetchRows,
  fetchFilterValues,
  initialRowGroups,
  initialValueCols,
  initialPivotFilters,
}: PivotTableProps) {
```

**b) Update the three `useState` calls (lines 49–52) to use initial values:**

```ts
const [rowGroups, setRowGroups] = useState<ZoneCol[]>(initialRowGroups ?? DEFAULT_ROW_GROUPS)
const [pivotCols, setPivotCols] = useState<ZoneCol[]>(DEFAULT_PIVOT_COLS)
const [valueCols, setValueCols] = useState<ZoneCol[]>(initialValueCols ?? DEFAULT_VALUE_COLS)
const [pivotFilters, setPivotFilters] = useState<FilterEntry[]>(initialPivotFilters ?? [])
```

**c) Add `initialValueCols` to the guard in the default-seeding `useEffect` (around line 76–107):**

```ts
useEffect(() => {
  if (!colDefsData || leafCols.length === 0) return
  if (rowGroups.length > 0 || valueCols.length > 0 || initialValueCols?.length) return
  // ... rest unchanged
}, [colDefsData, leafCols.length])
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run apps/web/frontend/components/pivot-table/__tests__/PivotTableInitialState.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
bun run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/components/pivot-table/PivotTable.tsx \
        apps/web/frontend/components/pivot-table/__tests__/PivotTableInitialState.test.tsx
git commit -m "feat: PivotTable accepts initialRowGroups, initialValueCols, initialPivotFilters"
```

---

## Task 3: Write `buildPivotUrl` helper

**Files:**

- Create: `apps/web/frontend/features/analytics/trends/trendToPivot.ts`
- Create: `apps/web/frontend/features/analytics/trends/__tests__/trendToPivot.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/frontend/features/analytics/trends/__tests__/trendToPivot.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPivotUrl } from '../trendToPivot'

describe('buildPivotUrl', () => {
  it('includes from_trend sentinel', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).toContain('from_trend=1')
  })

  it('encodes measure', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).toContain('measure=count_events')
  })

  it('encodes custom measure with aggregation', () => {
    const url = buildPivotUrl({
      measure: 'sum:revenue',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).toContain('measure=sum%3Arevenue')
  })

  it('encodes breakdown dimension when present', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: 'country',
      localFilters: {},
    })
    expect(url).toContain('breakdown=country')
  })

  it('omits breakdown param when null', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url).not.toContain('breakdown')
  })

  it('encodes filters as filter_<field>=<firstValue>', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: { platform: ['web', 'mobile'] },
    })
    expect(url).toContain('filter_platform=web')
    expect(url).not.toContain('filter_platform=mobile')
  })

  it('omits filter keys with empty arrays', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: { platform: [] },
    })
    expect(url).not.toContain('filter_platform')
  })

  it('encodes multiple filters', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: { platform: ['web'], device: ['desktop'] },
    })
    expect(url).toContain('filter_platform=web')
    expect(url).toContain('filter_device=desktop')
  })

  it('returns path starting with /pivot', () => {
    const url = buildPivotUrl({
      measure: 'count_events',
      breakdownDimension: null,
      localFilters: {},
    })
    expect(url.startsWith('/pivot?')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test:run apps/web/frontend/features/analytics/trends/__tests__/trendToPivot.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `buildPivotUrl`**

Create `apps/web/frontend/features/analytics/trends/trendToPivot.ts`:

```ts
export interface BuildPivotUrlOptions {
  measure: string
  breakdownDimension: string | null
  localFilters: Record<string, string[]>
}

/**
 * Encodes the current Trend page state into a /pivot URL with search params
 * so NewPivotPage can pre-seed the Pivot Explorer.
 */
export function buildPivotUrl({
  measure,
  breakdownDimension,
  localFilters,
}: BuildPivotUrlOptions): string {
  const params = new URLSearchParams()
  params.set('from_trend', '1')
  params.set('measure', measure)
  if (breakdownDimension) {
    params.set('breakdown', breakdownDimension)
  }
  for (const [field, values] of Object.entries(localFilters)) {
    if (values.length > 0) {
      params.set(`filter_${field}`, values[0])
    }
  }
  return `/pivot?${params.toString()}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run apps/web/frontend/features/analytics/trends/__tests__/trendToPivot.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/analytics/trends/trendToPivot.ts \
        apps/web/frontend/features/analytics/trends/__tests__/trendToPivot.test.ts
git commit -m "feat: add buildPivotUrl helper for Trend → Pivot handoff"
```

---

## Task 4: Write `parseTrendParams` helper

**Files:**

- Create: `apps/web/frontend/features/analytics/pivot/parseTrendParams.ts`
- Create: `apps/web/frontend/features/analytics/pivot/__tests__/parseTrendParams.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/frontend/features/analytics/pivot/__tests__/parseTrendParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseTrendParams } from '../parseTrendParams'
import type { ZoneCol, FilterEntry } from '@/components/pivot-table/types'

describe('parseTrendParams', () => {
  function params(obj: Record<string, string>): URLSearchParams {
    return new URLSearchParams(obj)
  }

  it('returns null when from_trend is absent', () => {
    expect(parseTrendParams(params({ measure: 'count_events' }))).toBeNull()
  })

  it('maps count_events to event_count value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'count_events' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'event_count', label: 'Events', aggFunc: 'sum' },
    ])
  })

  it('maps unique_users to user_id value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'unique_users' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'user_id', label: 'Users', aggFunc: 'count_distinct' },
    ])
  })

  it('maps sum:revenue to revenue value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'sum:revenue' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'revenue', label: 'revenue', aggFunc: 'sum' },
    ])
  })

  it('maps avg:load_time to load_time value col', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'avg:load_time' }))
    expect(result?.initialValueCols).toEqual<ZoneCol[]>([
      { colId: 'load_time', label: 'load_time', aggFunc: 'avg' },
    ])
  })

  it('maps breakdown to initialRowGroups', () => {
    const result = parseTrendParams(
      params({ from_trend: '1', measure: 'count_events', breakdown: 'country' })
    )
    expect(result?.initialRowGroups).toEqual<ZoneCol[]>([{ colId: 'country', label: 'country' }])
  })

  it('returns undefined initialRowGroups when no breakdown', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'count_events' }))
    expect(result?.initialRowGroups).toBeUndefined()
  })

  it('maps filter_ params to initialPivotFilters', () => {
    const result = parseTrendParams(
      params({
        from_trend: '1',
        measure: 'count_events',
        filter_platform: 'web',
        filter_device: 'desktop',
      })
    )
    expect(result?.initialPivotFilters).toEqual<FilterEntry[]>(
      expect.arrayContaining([
        { field: 'platform', fieldLabel: 'platform', value: 'web' },
        { field: 'device', fieldLabel: 'device', value: 'desktop' },
      ])
    )
  })

  it('returns empty initialPivotFilters when no filter_ params', () => {
    const result = parseTrendParams(params({ from_trend: '1', measure: 'count_events' }))
    expect(result?.initialPivotFilters).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test:run apps/web/frontend/features/analytics/pivot/__tests__/parseTrendParams.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `parseTrendParams`**

Create `apps/web/frontend/features/analytics/pivot/parseTrendParams.ts`:

```ts
import type { ZoneCol, FilterEntry } from '@/components/pivot-table/types'

export interface TrendInitialState {
  initialValueCols: ZoneCol[]
  initialRowGroups?: ZoneCol[]
  initialPivotFilters: FilterEntry[]
}

/**
 * Parses URL search params written by buildPivotUrl() and returns typed
 * initial state for PivotTable. Returns null if the params don't contain
 * the from_trend sentinel (i.e. the user navigated normally).
 */
export function parseTrendParams(params: URLSearchParams): TrendInitialState | null {
  if (params.get('from_trend') !== '1') return null

  const measure = params.get('measure') ?? 'count_events'
  const breakdown = params.get('breakdown')

  // Map measure string → ZoneCol
  let valueCol: ZoneCol
  if (measure === 'count_events') {
    valueCol = { colId: 'event_count', label: 'Events', aggFunc: 'sum' }
  } else if (measure === 'unique_users') {
    valueCol = { colId: 'user_id', label: 'Users', aggFunc: 'count_distinct' }
  } else {
    // Format: "<agg>:<field>"
    const colonIdx = measure.indexOf(':')
    const aggFunc = measure.slice(0, colonIdx)
    const colId = measure.slice(colonIdx + 1)
    valueCol = { colId, label: colId, aggFunc }
  }

  // Map breakdown → row group
  const initialRowGroups: ZoneCol[] | undefined = breakdown
    ? [{ colId: breakdown, label: breakdown }]
    : undefined

  // Collect filter_ params
  const initialPivotFilters: FilterEntry[] = []
  for (const [key, value] of params.entries()) {
    if (key.startsWith('filter_')) {
      const field = key.slice('filter_'.length)
      initialPivotFilters.push({ field, fieldLabel: field, value })
    }
  }

  return {
    initialValueCols: [valueCol],
    initialRowGroups,
    initialPivotFilters,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run apps/web/frontend/features/analytics/pivot/__tests__/parseTrendParams.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/analytics/pivot/parseTrendParams.ts \
        apps/web/frontend/features/analytics/pivot/__tests__/parseTrendParams.test.ts
git commit -m "feat: add parseTrendParams helper for Trend → Pivot handoff"
```

---

## Task 5: Wire up `NewPivotPage` to read trend params

**Files:**

- Modify: `apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx`

- [ ] **Step 1: Add `useSearchParams` and pass initial state to `PivotTable`**

In `apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx`:

**a) Add import at the top:**

```ts
import { useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
```

(Replace the existing `import { useMemo, useCallback, useEffect } from 'react'` line — just add `useSearchParams` to the router import that should already exist, or add a new one.)

**b) Add import for `parseTrendParams`:**

```ts
import { parseTrendParams } from './parseTrendParams'
```

**c) Inside `NewPivotPage()`, after the existing `useAppStore` line, add:**

```ts
const [searchParams] = useSearchParams()
const trendInitial = useMemo(() => parseTrendParams(searchParams), [searchParams])
```

**d) Pass initial state to `<PivotTable>`. Find the `<PivotTable` JSX block and add the three optional props:**

```tsx
<PivotTable
  colDefsData={colDefsData}
  colDefsLoading={colDefsLoading}
  startDate={startDate}
  endDate={endDate}
  activeFilters={validActiveFilters as Record<string, string>}
  activeConnectionId={activeConnectionId}
  fetchRows={fetchRows}
  fetchFilterValues={fetchFilterValues}
  initialRowGroups={trendInitial?.initialRowGroups}
  initialValueCols={trendInitial?.initialValueCols}
  initialPivotFilters={trendInitial?.initialPivotFilters}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | head -30
```

Expected: no type errors.

- [ ] **Step 3: Run full test suite**

```bash
bun run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx
git commit -m "feat: NewPivotPage reads trend params and pre-seeds PivotTable"
```

---

## Task 6: Add "Run in Pivot Explorer" button to `TrendsPage`

**Files:**

- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

- [ ] **Step 1: Add imports**

In `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`, add to the existing imports:

```ts
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { buildPivotUrl } from './trendToPivot'
```

- [ ] **Step 2: Add `useNavigate` and the button handler inside `TrendsPage()`**

After the existing `const { dateRange, activeConnectionId, granularity } = useAppStore()` line, add:

```ts
const navigate = useNavigate()

function handleRunInPivot() {
  navigate(buildPivotUrl({ measure, breakdownDimension, localFilters }))
}
```

- [ ] **Step 3: Add the button below the chart block**

The chart block ends with the closing `</div>` after `<TrendChart ... />`. Find the `<CardContent>` section and add the button **after** the chart/state block but **before** `</CardContent>`:

```tsx
<CardContent className="pt-0">
  <div className="pb-4">
    <TrendFilters ... />
  </div>
  {isError ? (
    <QueryError ... />
  ) : isLoading ? (
    <ChartSkeleton ... />
  ) : trendData.length === 0 ? (
    <EmptyState ... />
  ) : (
    <div className="h-[300px] sm:h-[380px] lg:h-[450px]">
      <TrendChart ... />
    </div>
  )}
  {activeConnectionId && (
    <div className="flex justify-end pt-3">
      <Button variant="outline" size="sm" onClick={handleRunInPivot}>
        Run in Pivot Explorer
      </Button>
    </div>
  )}
</CardContent>
```

- [ ] **Step 4: Verify TypeScript compiles and lint passes**

```bash
bun run build 2>&1 | head -30
bun run lint 2>&1 | tail -10
```

Expected: no errors or warnings.

- [ ] **Step 5: Run full test suite**

```bash
bun run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/features/analytics/trends/TrendsPage.tsx
git commit -m "feat: add 'Run in Pivot Explorer' button to Trends page"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
bun run dev   # frontend on :5173
uv run serve  # backend on :8000
```

- [ ] **Step 2: Open Trends page and verify button appears**

Navigate to the Trends page. Confirm a "Run in Pivot Explorer" button appears in the bottom-right of the card.

- [ ] **Step 3: Set some state and click the button**

1. Pick a custom measure (e.g. `sum:revenue`)
2. Set a breakdown dimension (e.g. `country`)
3. Add a local filter
4. Click "Run in Pivot Explorer"

Expected: navigates to `/pivot?from_trend=1&measure=sum%3Arevenue&breakdown=country&filter_<field>=<value>`

- [ ] **Step 4: Verify Pivot Explorer pre-seeded**

In the Pivot Explorer, confirm:

- The ZoneBar "Values" zone shows the measure chip (e.g. `revenue`)
- The ZoneBar "Rows" zone shows the breakdown chip (e.g. `country`)
- The FilterBar shows the filter

- [ ] **Step 5: Verify clean navigation still works**

Navigate directly to `/pivot` (no params). Confirm Pivot Explorer loads with its default state (time dimension as row group, event_count + user_id as value cols).
