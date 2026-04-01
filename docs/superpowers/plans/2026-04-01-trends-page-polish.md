# Trends Page Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `TrendMetricPicker` to full parity with `ValuePickerPopover` (search, `groupDimensionsByCategory`, count badges) and move the stat cards inside the chart card as an inline strip.

**Architecture:** Two independent changes to two files in the `feat/trends-metric-picker` worktree. Task 1 rewrites `TrendMetricPicker.tsx` in place (same props interface, no callers change). Task 2 edits `TrendsPage.tsx` JSX only.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest

---

## File Map

| File                                                                                          | Action                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`                | Rewrite — add search, `groupDimensionsByCategory`, `CategoryIcon`, count badges |
| `apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx` | Update — replace "Custom" label checks; add search tests                        |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`                                  | Edit — remove stat cards grid; add inline stats row inside `CardHeader`         |

---

## Task 1: Rewrite TrendMetricPicker with search + dynamic categories

**Files:**

- Modify: `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`
- Modify: `apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx`

### Background

The current picker has two hardcoded categories ("Standard" / "Custom") and no search. The goal is to match `ValuePickerPopover` exactly:

- **Search bar** at the top of the popover (same markup as `ValuePickerPopover`)
- **`groupDimensionsByCategory`** for numeric dimensions (imported from `@/lib/utils/dimensionCategories`)
- **`CategoryIcon`** in left-panel category buttons (imported from `@/lib/utils/categoryIcon`)
- **Count badges** on category buttons
- **Search results mode**: flat grouped list when `search` is non-empty

Standard measures remain a fixed first category with id `'__standard__'` and `BarChart2` icon — they are never passed through `groupDimensionsByCategory`.

The props interface (`TrendMetricPickerProps`) and chip appearance are **unchanged**.

### What `groupDimensionsByCategory` returns

```ts
// From apps/web/frontend/lib/utils/dimensionCategories.ts
groupDimensionsByCategory(dimensions: DimensionOption[], categories: DimensionCategoryConfig[]): DimensionGroup[]

// DimensionGroup = { category: DimensionCategoryConfig; dimensions: DimensionOption[] }
// DimensionCategoryConfig = { id: string; label: string; icon: string; patterns: string[] }
```

`CATEGORIES` is imported from `@/config/dimension-categories.json` cast as `DimensionCategoryConfig[]`.
`CategoryIcon` takes `name: string` (the icon name string from the config) and `className`.

### Full replacement for TrendMetricPicker.tsx

- [ ] **Step 1: Write the updated tests**

Replace the entire content of `apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TrendMetricPicker } from '../TrendMetricPicker'

const standardMeasures = [
  { value: 'count_events', label: 'Event Count' },
  { value: 'unique_users', label: 'Unique Users' },
]

const numericDimensions = [{ value: 'revenue', label: 'Revenue' }]

describe('TrendMetricPicker', () => {
  it('renders chip with standard measure label', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Event Count')).toBeInTheDocument()
  })

  it('renders chip with custom measure label including aggregation', () => {
    render(
      <TrendMetricPicker
        measureField="revenue"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Revenue (Sum)')).toBeInTheDocument()
  })

  it('renders search input when popover opens', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.getByPlaceholderText('Search metrics…')).toBeInTheDocument()
  })

  it('filters metrics when searching', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'unique' },
    })
    expect(screen.getByText('Unique Users')).toBeInTheDocument()
    expect(screen.queryByText('Event Count')).not.toBeInTheDocument()
  })

  it('shows "No metrics match" when search has no results', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'zzznomatch' },
    })
    expect(screen.getByText('No metrics match')).toBeInTheDocument()
  })

  it('calls onChange immediately when standard measure clicked via search', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    fireEvent.change(screen.getByPlaceholderText('Search metrics…'), {
      target: { value: 'unique' },
    })
    fireEvent.click(screen.getByText('Unique Users'))
    expect(onChange).toHaveBeenCalledWith('unique_users', 'sum')
  })

  it('calls onChange immediately when standard measure clicked in two-panel mode', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={onChange}
      />
    )
    // Open popover, then click an item in the right panel (Standard is active by default)
    fireEvent.click(screen.getByText('Event Count'))
    // "Event Count" and "Unique Users" now appear in the right panel
    const buttons = screen.getAllByText('Unique Users')
    fireEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalledWith('unique_users', 'sum')
  })

  it('shows only Standard category when numericDimensions is empty', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={[]}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    expect(screen.getByText('Standard')).toBeInTheDocument()
    // Only one category button in left panel
    const leftPanelButtons = screen
      .getAllByRole('button')
      .filter((b) => ['Standard'].includes(b.textContent?.trim().replace(/\d+$/, '').trim() ?? ''))
    expect(leftPanelButtons).toHaveLength(1)
  })

  it('shows additional categories from dimension-categories.json when numericDimensions provided', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    // Standard is always there
    expect(screen.getByText('Standard')).toBeInTheDocument()
    // At least one more category from groupDimensionsByCategory
    const categoryRegion = document.querySelector('.bg-muted\\/40')
    expect(categoryRegion?.querySelectorAll('button').length).toBeGreaterThan(1)
  })

  it('opens step 2 aggregation picker when custom metric clicked', () => {
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    // Navigate to the numeric category (click a non-Standard left panel button)
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    const catButtons = leftPanel.querySelectorAll('button')
    // Click the second category (first numeric group)
    fireEvent.click(catButtons[1])
    // Click Revenue in the right panel
    fireEvent.click(screen.getByText('Revenue'))
    // Step 2: aggregation picker
    expect(screen.getByText('Sum')).toBeInTheDocument()
    expect(screen.getByText('Avg')).toBeInTheDocument()
  })

  it('calls onChange with field and agg when aggregation selected for custom metric', () => {
    const onChange = vi.fn()
    render(
      <TrendMetricPicker
        measureField="count_events"
        aggregation="sum"
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByText('Event Count'))
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    fireEvent.click(leftPanel.querySelectorAll('button')[1])
    fireEvent.click(screen.getByText('Revenue'))
    fireEvent.click(screen.getByText('Avg'))
    expect(onChange).toHaveBeenCalledWith('revenue', 'avg')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss
bun run test:run apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx
```

Expected: several FAIL — `getByPlaceholderText('Search metrics…')` and search-related tests not found yet.

- [ ] **Step 3: Rewrite TrendMetricPicker.tsx**

Replace the entire content of `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react'
import { BarChart2, ChevronDown, ChevronLeft, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { groupDimensionsByCategory } from '@/lib/utils/dimensionCategories'
import { CategoryIcon } from '@/lib/utils/categoryIcon'
import categoriesConfig from '@/config/dimension-categories.json'
import type { DimensionOption, DimensionCategoryConfig } from '@/types'

const CATEGORIES = categoriesConfig as DimensionCategoryConfig[]

const STANDARD_ID = '__standard__'

const AGG_LABELS: Record<string, string> = {
  sum: 'Sum',
  avg: 'Avg',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  countDistinct: 'Distinct',
}

const AGG_OPTIONS = ['sum', 'avg', 'min', 'max', 'count', 'countDistinct']

export interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[]
  numericDimensions: DimensionOption[]
  onChange: (field: string, agg: string) => void
}

type CategoryEntry = {
  id: string
  label: string
  iconEl: React.ReactNode
  items: DimensionOption[]
  isStandard: boolean
}

export function TrendMetricPicker({
  measureField,
  aggregation,
  standardMeasures,
  numericDimensions,
  onChange,
}: TrendMetricPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>(STANDARD_ID)
  const [selectedCustom, setSelectedCustom] = useState<DimensionOption | null>(null)
  const [search, setSearch] = useState('')

  // Close the popover when key props change so callers can reset UI state
  useEffect(() => {
    setOpen(false)
    setSelectedCustom(null)
    setActiveCategory(STANDARD_ID)
  }, [measureField, numericDimensions.length])

  const numericGroups = useMemo(
    () =>
      numericDimensions.length > 0 ? groupDimensionsByCategory(numericDimensions, CATEGORIES) : [],
    [numericDimensions]
  )

  const allCategories = useMemo<CategoryEntry[]>(
    () => [
      {
        id: STANDARD_ID,
        label: 'Standard',
        iconEl: <BarChart2 className="h-3 w-3 shrink-0" />,
        items: standardMeasures,
        isStandard: true,
      },
      ...numericGroups.map((g) => ({
        id: g.category.id,
        label: g.category.label,
        iconEl: <CategoryIcon name={g.category.icon} className="h-3 w-3 shrink-0" />,
        items: g.dimensions,
        isStandard: false,
      })),
    ],
    [standardMeasures, numericGroups]
  )

  const searchGrouped = useMemo(() => {
    if (!search) return []
    return allCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [allCategories, search])

  const standardMatch = standardMeasures.find((m) => m.value === measureField)
  const chipLabel = standardMatch
    ? standardMatch.label
    : (() => {
        const dim = numericDimensions.find((d) => d.value === measureField) ?? {
          label: measureField,
        }
        return `${dim.label} (${AGG_LABELS[aggregation] ?? aggregation})`
      })()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setActiveCategory(STANDARD_ID)
      setSelectedCustom(null)
      setSearch('')
    } else {
      setSearch('')
    }
  }

  function handleItemClick(item: DimensionOption, isStandard: boolean) {
    if (isStandard) {
      onChange(item.value, aggregation)
      setOpen(false)
    } else {
      setSelectedCustom(item)
    }
  }

  function handleAggSelect(agg: string) {
    if (!selectedCustom) return
    onChange(selectedCustom.value, agg)
    setOpen(false)
  }

  const activeEntry = allCategories.find((c) => c.id === activeCategory)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 border border-transparent px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-border transition-colors"
        >
          <BarChart2 className="h-3 w-3 text-muted-foreground" />
          {chipLabel}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {selectedCustom === null ? (
          <>
            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                placeholder="Search metrics…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                style={{ boxShadow: 'none' }}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {search ? (
              /* Search results: flat grouped list */
              <div className="max-h-52 overflow-y-auto">
                {searchGrouped.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No metrics match
                  </p>
                ) : (
                  searchGrouped.map((group) => (
                    <div key={group.id}>
                      <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1 sticky top-0 bg-popover">
                        {group.label}
                      </div>
                      {group.items.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                          onClick={() => handleItemClick(item, group.isStandard)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Two-panel mode */
              <div className="flex max-h-52">
                {/* Left panel: categories */}
                <div className="w-32 shrink-0 bg-muted/40 overflow-y-auto border-r">
                  {allCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs focus-visible:outline-none',
                        cat.id === activeCategory
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/60'
                      )}
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      {cat.iconEl}
                      <span className="truncate flex-1">{cat.label}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/50 ml-1">
                        {cat.items.length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Right panel: items */}
                <div className="flex-1 overflow-y-auto">
                  {activeEntry?.items.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                      onClick={() => handleItemClick(item, activeEntry.isStandard)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Step 2: aggregation picker */
          <>
            <div className="flex items-center gap-1 px-3 py-2 border-b">
              <button
                type="button"
                aria-label="Back"
                className="h-6 w-6 p-0 inline-flex items-center justify-center rounded hover:bg-muted"
                onClick={() => setSelectedCustom(null)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium">{selectedCustom.label}</span>
            </div>
            <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1">
              AGGREGATION
            </div>
            {AGG_OPTIONS.map((agg) => (
              <button
                key={agg}
                type="button"
                className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                onClick={() => handleAggSelect(agg)}
              >
                {AGG_LABELS[agg] ?? agg}
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: TypeScript check**

```bash
bun run build 2>&1 | grep "error TS" | head -20
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feat/trends-metric-picker
git add apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx \
        apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx
git commit -m "feat(trends): add search + dynamic categories to TrendMetricPicker"
```

---

## Task 2: Move stat cards inside the chart card

**Files:**

- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

### Background

Remove the three separate border cards above the chart and replace them with a compact inline stats strip inside `CardHeader`, below the existing controls row. `totalEvents`, `averageValue`, `maxValue`, and `periodLabel` are all already computed — this is a pure JSX change.

- [ ] **Step 1: Apply the changes to TrendsPage.tsx**

**Remove** the entire grid block (find it by its className `"grid grid-cols-2 gap-2 lg:grid-cols-4"`):

```tsx
// DELETE this entire block:
<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
  {[
    {
      label: 'Total Events',
      value: totalEvents.toLocaleString(),
      span: 'col-span-2 lg:col-span-2',
    },
    { label: `${periodLabel} Average`, value: averageValue.toLocaleString(), span: 'col-span-1' },
    { label: `${periodLabel} Peak`, value: maxValue.toLocaleString(), span: 'col-span-1' },
  ].map(({ label, value, span }) => (
    <div
      key={label}
      className={`relative overflow-hidden rounded-xl border bg-card shadow-sm p-3 ${span}`}
    >
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold tracking-tight leading-none">{value}</p>
    </div>
  ))}
</div>
```

**Add** a stats row inside `CardHeader`, immediately after the closing `</div>` of the existing controls row (`{/* Right group */}` div). The full updated `CardHeader` should look like:

```tsx
<CardHeader className="pb-3">
  <div className="flex items-center justify-between gap-2 flex-wrap">
    {/* Left group: what you're measuring */}
    <div className="flex flex-wrap gap-2 items-center">
      <TrendMetricPicker
        measureField={measureField}
        aggregation={aggregation}
        standardMeasures={standardMeasures}
        numericDimensions={numericDimensions}
        onChange={(field, agg) => {
          setMeasureField(field)
          setAggregation(agg as typeof aggregation)
        }}
      />
    </div>

    {/* Right group: how it's displayed */}
    <div className="flex flex-wrap gap-2 items-center">
      {/* Chart type toggle */}
      <div className="flex items-center border rounded-md p-1">
        <Button
          variant={chartType === 'area' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setChartType('area')}
        >
          Area
        </Button>
        <Button
          variant={chartType === 'line' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setChartType('line')}
        >
          Line
        </Button>
        <Button
          variant={chartType === 'bar' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setChartType('bar')}
        >
          Bar
        </Button>
      </div>

      {/* Breakdown selector */}
      {dimensions.length > 0 && (
        <div className="w-[min(180px,45vw)] flex gap-1">
          <div className="flex-1">
            <FilterSelect
              mode="single"
              tree={true}
              options={dimensions}
              value={breakdownDimension}
              onChange={(val) => setBreakdownDimension(val as string)}
              placeholder="Break down by…"
            />
          </div>
          {breakdownDimension && (
            <button
              type="button"
              onClick={() => setBreakdownDimension(null)}
              className="h-9 min-w-[44px] px-2 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
              aria-label="Clear breakdown"
              title="Clear breakdown"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  </div>

  {/* Inline stats strip */}
  <div className="flex items-center gap-3 pt-1">
    <div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Total
      </span>
      <span className="ml-1.5 text-sm font-semibold">{totalEvents.toLocaleString()}</span>
    </div>
    <span className="text-muted-foreground/30 select-none">|</span>
    <div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {periodLabel} avg
      </span>
      <span className="ml-1.5 text-sm font-semibold">{averageValue.toLocaleString()}</span>
    </div>
    <span className="text-muted-foreground/30 select-none">|</span>
    <div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Peak
      </span>
      <span className="ml-1.5 text-sm font-semibold">{maxValue.toLocaleString()}</span>
    </div>
  </div>
</CardHeader>
```

- [ ] **Step 2: TypeScript + full test run**

```bash
bun run build 2>&1 | grep "error TS" | head -20
bun run test:run
```

Expected: zero TS errors, all 402+ tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/feat/trends-metric-picker
git add apps/web/frontend/features/analytics/trends/TrendsPage.tsx
git commit -m "feat(trends): move stat cards inline inside chart card"
```

---

## Self-Review

**Spec coverage:**

- ✅ Search bar — Task 1 (step 3, search bar JSX + `search` state)
- ✅ `groupDimensionsByCategory` for numeric dims — Task 1 (step 3, `numericGroups` useMemo)
- ✅ `CategoryIcon` in left-panel buttons — Task 1 (step 3, `iconEl` in `allCategories`)
- ✅ Count badges — Task 1 (step 3, `cat.items.length` span)
- ✅ Search results mode (flat grouped list) — Task 1 (step 3, `searchGrouped` + conditional render)
- ✅ Props unchanged — Task 1 (interface identical to existing)
- ✅ Chip label unchanged — Task 1 (same `chipLabel` logic)
- ✅ Step 2 aggregation picker unchanged — Task 1 (same AGG_OPTIONS + handleAggSelect)
- ✅ Remove stat cards grid — Task 2 (step 1)
- ✅ Inline stats row in CardHeader — Task 2 (step 1)
- ✅ `periodLabel` used in stats — Task 2 (step 1, `{periodLabel} avg`)

**Placeholder scan:** None found.

**Type consistency:**

- `TrendMetricPickerProps` is identical in both tasks — no callers change.
- `CategoryEntry.iconEl: React.ReactNode` — used only internally, consistent throughout Task 1.
- `handleItemClick(item: DimensionOption, isStandard: boolean)` — called in three places in Task 1 (two-panel right panel, search results, aggregation step). All pass `activeEntry.isStandard` or `group.isStandard` correctly.
