# Trends Toolbar Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TrendMetricPicker's custom popover with the real ValuePickerPopover, and unify all toolbar controls (metric chip, chart type toggle, breakdown select) to h-7 with chip/inner-pill visual language.

**Architecture:** All changes are in the frontend. `ValuePickerPopover` gets two backward-compatible props (`trigger?`, `fixedAgg` on LeafMeta). `TrendMetricPicker` becomes a thin adapter that converts DimensionOption arrays to LeafMeta and delegates to ValuePickerPopover. TrendsPage toolbar controls are restyled to h-7.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest + React Testing Library

---

## File Map

| File                                                                                          | Role                                                                        |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/web/frontend/components/pivot-table/types.ts`                                           | Add `fixedAgg?` and `category?` to `LeafMeta`                               |
| `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx`                             | Add `trigger?` prop; handle `fixedAgg` skip; pass `category` through        |
| `apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx`              | Add tests for `trigger?` and `fixedAgg`                                     |
| `apps/web/frontend/config/dimension-categories.json`                                          | Prepend "Metrics" category (no patterns; items opt in via `category` field) |
| `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`                | Rewrite as thin adapter using ValuePickerPopover                            |
| `apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx` | Update tests to match new behaviour (Metrics label, agg label format)       |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`                                  | Replace chart type toggle; add `size="sm"` to FilterSelect + clear button   |

---

## Task 1: Add "Metrics" category to dimension-categories.json

**Files:**

- Modify: `apps/web/frontend/config/dimension-categories.json`

No test needed — the category just needs to exist so `groupDimensionsByCategory` can look it up by id. It has no patterns so nothing auto-matches it; items opt in via the `category` field on `DimensionOption`.

- [ ] **Step 1: Prepend the "Metrics" entry**

Open `apps/web/frontend/config/dimension-categories.json` and add the entry as the first item in the array:

```json
[
  {
    "id": "metrics",
    "label": "Metrics",
    "icon": "BarChart2",
    "patterns": []
  },
  {
    "id": "time",
    ...existing entries unchanged...
  }
]
```

Full updated file:

```json
[
  {
    "id": "metrics",
    "label": "Metrics",
    "icon": "BarChart2",
    "patterns": []
  },
  {
    "id": "time",
    "label": "Time",
    "icon": "Timer",
    "patterns": [
      "^ts_",
      "^timestamp$",
      "^(date|week|hour|month|quarter|year)$",
      "_(at|date|time|ts)$"
    ]
  },
  {
    "id": "event",
    "label": "Event",
    "icon": "Activity",
    "patterns": ["^event_", "^day_of_week$"]
  },
  {
    "id": "user",
    "label": "User",
    "icon": "CircleUserRound",
    "patterns": [
      "^user_",
      "_(user|account|customer|tenant)$",
      "^(email|first_name|last_name|phone|date_of_birth)$",
      "_(email|first_name|last_name|phone)$",
      "\\.(email|first_name|last_name|phone|date_of_birth)$"
    ]
  },
  {
    "id": "geography",
    "label": "Geography",
    "icon": "Globe2",
    "patterns": ["(country|city|region|state|geo|locale|timezone)"]
  },
  {
    "id": "device",
    "label": "Device",
    "icon": "Laptop",
    "patterns": ["(device|browser|os|platform|screen|viewport)"]
  },
  {
    "id": "marketing",
    "label": "Marketing",
    "icon": "Target",
    "patterns": ["^utm_", "(referrer|campaign|channel|source|medium)"]
  },
  {
    "id": "other",
    "label": "Other",
    "icon": "MoreHorizontal",
    "patterns": [".*"]
  }
]
```

- [ ] **Step 2: Verify `CategoryIcon` handles "BarChart2"**

Open `apps/web/frontend/lib/utils/categoryIcon.tsx` and confirm it has a case for `"BarChart2"` (it maps icon name strings from dimension-categories.json to Lucide components). If missing, add:

```tsx
case 'BarChart2': return <BarChart2 className={className} />
```

Also add the import at the top if needed:

```tsx
import { BarChart2, ... } from 'lucide-react'
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/config/dimension-categories.json apps/web/frontend/lib/utils/categoryIcon.tsx
git commit -m "feat: add Metrics category to dimension-categories config"
```

---

## Task 2: Extend LeafMeta and ValuePickerPopover

**Files:**

- Modify: `apps/web/frontend/components/pivot-table/types.ts`
- Modify: `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx`
- Modify: `apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx`

- [ ] **Step 1: Write failing tests for the two new behaviours**

Open `apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx` and add these tests at the bottom of the `describe` block (before the closing `})`):

```tsx
it('renders custom trigger instead of default Add button', () => {
  render(
    <ValuePickerPopover
      leafCols={leafCols}
      onSelect={vi.fn()}
      trigger={<button>Open picker</button>}
    />
  )
  expect(screen.getByRole('button', { name: /open picker/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
})

it('fixedAgg: calls onSelect immediately without step 2', async () => {
  const onSelect = vi.fn()
  const colsWithFixed: LeafMeta[] = [
    {
      colId: 'event_count',
      label: 'Event Count',
      enableValue: true,
      enableRowGroup: false,
      enablePivot: false,
      fixedAgg: 'none',
      category: 'metrics',
    },
  ]
  render(
    <ValuePickerPopover
      leafCols={colsWithFixed}
      onSelect={onSelect}
      trigger={<button>Open picker</button>}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: /open picker/i }))
  fireEvent.click(await screen.findByRole('button', { name: 'Event Count' }))
  expect(onSelect).toHaveBeenCalledWith('event_count', 'Event Count', 'none')
  // popover closes — step 2 never shown
  expect(screen.queryByText(/aggregation/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && bun run test:run -- ValuePickerPopover
```

Expected: 2 new tests fail (`renders custom trigger` and `fixedAgg`).

- [ ] **Step 3: Add `fixedAgg?` and `category?` to `LeafMeta`**

Open `apps/web/frontend/components/pivot-table/types.ts` and update `LeafMeta`:

```typescript
export interface LeafMeta {
  colId: string
  label: string
  enableRowGroup: boolean
  enablePivot: boolean
  enableValue: boolean
  allowedAggFuncs?: string[]
  /** If set, clicking this item skips the aggregation step and calls onSelect immediately. */
  fixedAgg?: string
  /** Category id override for groupDimensionsByCategory (bypasses pattern matching). */
  category?: string
}
```

- [ ] **Step 4: Update `ValuePickerPopover` — add `trigger?` prop, `fixedAgg` skip, `category` passthrough**

Open `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx`.

**4a — Update props interface** (add `trigger?`):

```tsx
interface ValuePickerPopoverProps {
  leafCols: LeafMeta[]
  onSelect: (colId: string, label: string, aggFunc: string) => void
  trigger?: React.ReactNode
}
```

**4b — Update function signature** to destructure `trigger`:

```tsx
export function ValuePickerPopover({ leafCols, onSelect, trigger }: ValuePickerPopoverProps) {
```

**4c — Update `PopoverTrigger`** (replace the hardcoded `<Button>` block):

```tsx
<PopoverTrigger asChild>
  {trigger ?? (
    <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-muted-foreground">
      <Plus className="h-3 w-3" />
      Add
    </Button>
  )}
</PopoverTrigger>
```

**4d — Update `handleDimSelect`** to skip step 2 when `fixedAgg` is set:

```tsx
function handleDimSelect(col: LeafMeta) {
  if (col.fixedAgg !== undefined) {
    onSelect(col.colId, col.label, col.fixedAgg)
    setOpen(false)
    return
  }
  setSelectedCol(col)
}
```

**4e — Pass `category` through when building dimension options** for `groupDimensionsByCategory`. Find the `eligible.map(...)` call:

```tsx
const groups = groupDimensionsByCategory(
  eligible.map((c) => ({ value: c.colId, label: c.label, category: c.category })),
  CATEGORIES
)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && bun run test:run -- ValuePickerPopover
```

Expected: all tests pass (including the 2 new ones).

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/components/pivot-table/types.ts \
        apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx \
        apps/web/frontend/components/pivot-table/__tests__/ValuePickerPopover.test.tsx
git commit -m "feat: extend LeafMeta and ValuePickerPopover with trigger, fixedAgg, category"
```

---

## Task 3: Rewrite TrendMetricPicker as thin adapter

**Files:**

- Modify: `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`
- Modify: `apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx`

Context on the chip label format: standard measures show the measure label directly (`"Event Count"`). Custom (numeric) measures show `"Revenue (Sum)"` — the metric name with the short agg label in parentheses.

Context on agg labels in step 2: `ValuePickerPopover` uses `AGG_LABELS` = `{ sum: 'Σ Sum', count: 'n Count', avg: 'avg Avg', min: 'min Min', max: 'max Max', countDistinct: '# Distinct' }`.

- [ ] **Step 1: Update TrendMetricPicker tests to match new behaviour**

The existing tests use `'Standard'` as the category label (now `'Metrics'`) and `'Sum'`/`'Avg'` as agg labels (now `'Σ Sum'`/`'avg Avg'` from ValuePickerPopover). Replace the full file at `apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx`:

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
    const searchResults = document.querySelector('.max-h-52')
    expect(searchResults?.textContent).not.toContain('Event Count')
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
    fireEvent.click(screen.getByText('Event Count'))
    const buttons = screen.getAllByText('Unique Users')
    fireEvent.click(buttons[0])
    expect(onChange).toHaveBeenCalledWith('unique_users', 'sum')
  })

  it('shows Metrics category in left panel', () => {
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
    expect(screen.getByText('Metrics')).toBeInTheDocument()
  })

  it('shows additional categories when numericDimensions provided', () => {
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
    expect(screen.getByText('Metrics')).toBeInTheDocument()
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
    const leftPanel = document.querySelector('.bg-muted\\/40')!
    const catButtons = leftPanel.querySelectorAll('button')
    // Click the second category (first non-Metrics category)
    fireEvent.click(catButtons[1])
    fireEvent.click(screen.getByText('Revenue'))
    // ValuePickerPopover shows "Σ Sum", "avg Avg" etc.
    expect(screen.getByText('Σ Sum')).toBeInTheDocument()
    expect(screen.getByText('avg Avg')).toBeInTheDocument()
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
    fireEvent.click(screen.getByText('avg Avg'))
    expect(onChange).toHaveBeenCalledWith('revenue', 'avg')
  })
})
```

- [ ] **Step 2: Run tests to see which ones fail (expected)**

```bash
cd apps/web && bun run test:run -- TrendMetricPicker
```

Expected: many failures because the component hasn't been rewritten yet.

- [ ] **Step 3: Rewrite TrendMetricPicker**

Replace the entire contents of `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`:

```tsx
import { useMemo } from 'react'
import { BarChart2, ChevronDown } from 'lucide-react'
import { ValuePickerPopover } from '@/components/pivot-table/ValuePickerPopover'
import type { LeafMeta } from '@/components/pivot-table/types'
import type { DimensionOption } from '@/types'

const CHIP_AGG_LABELS: Record<string, string> = {
  sum: 'Sum',
  count: 'Count',
  avg: 'Avg',
  min: 'Min',
  max: 'Max',
  countDistinct: 'Distinct',
  count_distinct: 'Distinct',
}

export interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[]
  numericDimensions: DimensionOption[]
  onChange: (field: string, agg: string) => void
}

export function TrendMetricPicker({
  measureField,
  aggregation,
  standardMeasures,
  numericDimensions,
  onChange,
}: TrendMetricPickerProps) {
  const leafCols: LeafMeta[] = useMemo(
    () => [
      ...standardMeasures.map(
        (m): LeafMeta => ({
          colId: m.value,
          label: m.label,
          enableValue: true,
          enableRowGroup: false,
          enablePivot: false,
          fixedAgg: 'none',
          category: 'metrics',
        })
      ),
      ...numericDimensions.map(
        (d): LeafMeta => ({
          colId: d.value,
          label: d.label,
          enableValue: true,
          enableRowGroup: false,
          enablePivot: false,
        })
      ),
    ],
    [standardMeasures, numericDimensions]
  )

  const chipLabel = useMemo(() => {
    const std = standardMeasures.find((m) => m.value === measureField)
    if (std) return std.label
    const num = numericDimensions.find((d) => d.value === measureField)
    if (num) return `${num.label} (${CHIP_AGG_LABELS[aggregation] ?? aggregation})`
    return measureField
  }, [measureField, aggregation, standardMeasures, numericDimensions])

  function handleSelect(_colId: string, _label: string, aggFunc: string) {
    // aggFunc === 'none' means a standard measure; pass 'sum' as placeholder (ignored downstream)
    onChange(_colId, aggFunc === 'none' ? 'sum' : aggFunc)
  }

  const trigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 bg-muted rounded-md px-2.5 h-7 text-xs font-medium hover:bg-muted/80 transition-colors"
    >
      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span>{chipLabel}</span>
      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
    </button>
  )

  return <ValuePickerPopover leafCols={leafCols} onSelect={handleSelect} trigger={trigger} />
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && bun run test:run -- TrendMetricPicker
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd apps/web && bun run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx \
        apps/web/frontend/features/analytics/trends/components/__tests__/TrendMetricPicker.test.tsx
git commit -m "feat: rewrite TrendMetricPicker as thin adapter over ValuePickerPopover"
```

---

## Task 4: Unify toolbar controls to h-7 in TrendsPage

**Files:**

- Modify: `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

No new test file needed — this is a visual/style change. Verify by running the full test suite and doing a manual visual check.

- [ ] **Step 1: Replace chart type toggle**

In `TrendsPage.tsx`, find the chart type toggle block (the `<div className="flex items-center border rounded-md p-1">` with three `<Button>` elements) and replace it entirely:

```tsx
{
  /* Chart type toggle — h-7 inner-pill */
}
;<div className="flex items-center bg-muted rounded-md p-0.5 h-7 gap-0.5">
  {(['area', 'line', 'bar'] as const).map((type) => (
    <button
      key={type}
      type="button"
      onClick={() => setChartType(type)}
      className={cn(
        'px-2.5 text-xs rounded capitalize transition-colors',
        chartType === type
          ? 'bg-background shadow-sm font-medium text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </button>
  ))}
</div>
```

Also add `cn` to imports if not already imported — it comes from `@/lib/utils`:

```tsx
import { cn } from '@/lib/utils'
```

Remove the unused `Button` import if it's no longer used anywhere in the file after this change.

- [ ] **Step 2: Update FilterSelect to h-7 and fix clear button**

Find the `<FilterSelect` call in the breakdown section and add `size="sm"`:

```tsx
<FilterSelect
  size="sm"
  mode="single"
  tree={true}
  options={dimensions}
  value={breakdownDimension}
  onChange={(val) => setBreakdownDimension(val as string)}
  placeholder="Break down by…"
/>
```

Find the clear button (the `✕` button) and update its height class from `h-9` to `h-7`:

```tsx
<button
  type="button"
  onClick={() => setBreakdownDimension(null)}
  className="h-7 min-w-[28px] px-1.5 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
  aria-label="Clear breakdown"
  title="Clear breakdown"
>
  ✕
</button>
```

- [ ] **Step 3: Run full test suite**

```bash
cd apps/web && bun run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Type-check and lint**

```bash
cd apps/web && bun run build
```

Expected: no TypeScript errors, no lint warnings.

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/analytics/trends/TrendsPage.tsx
git commit -m "feat: unify trends toolbar controls to h-7 chip/inner-pill style"
```
