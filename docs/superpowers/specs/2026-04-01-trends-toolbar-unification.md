# Trends Toolbar Unification — Design Spec

**Goal:** Two improvements to the Trends page: (1) replace `TrendMetricPicker`'s custom popover body with the real `ValuePickerPopover` component (exact same UI as Pivot), and (2) unify all toolbar controls to the same 28px height using chip/inner-pill visual language.

**Architecture:** Pure frontend changes. All land on `feat/trends-metric-picker` (PR #146). No new components — extend existing ones with backward-compatible props.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui

---

## Change 1 — Reuse `ValuePickerPopover` in Trends

### Files

- Modify: `apps/web/frontend/components/pivot-table/types.ts`
- Modify: `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx`
- Modify: `apps/web/frontend/config/dimension-categories.json`
- Modify: `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`

### 1a — `LeafMeta` additions (`types.ts`)

Add two optional fields:

```typescript
export interface LeafMeta {
  colId: string
  label: string
  enableRowGroup: boolean
  enablePivot: boolean
  enableValue: boolean
  allowedAggFuncs?: string[]
  /** If set, clicking the item skips step 2 and immediately calls onSelect with this agg. */
  fixedAgg?: string
  /** Category id for groupDimensionsByCategory (overrides pattern matching). */
  category?: string
}
```

### 1b — `ValuePickerPopover` additions

Add `trigger?: React.ReactNode` prop (backward-compatible — existing callers keep the default `+ Add` button):

```tsx
interface ValuePickerPopoverProps {
  leafCols: LeafMeta[]
  onSelect: (colId: string, label: string, aggFunc: string) => void
  trigger?: React.ReactNode
}
```

**Trigger rendering** — replace the hardcoded `<Button>` with:

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

**`fixedAgg` handling** — in `handleDimSelect`, if the col has `fixedAgg` set, immediately call `onSelect` and close instead of advancing to step 2:

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

**`category` passthrough** — when mapping `eligible` to dimension options for `groupDimensionsByCategory`, pass the `category` field:

```tsx
eligible.map((c) => ({ value: c.colId, label: c.label, category: c.category }))
```

### 1c — `dimension-categories.json` — prepend "Metrics" category

Insert as the first entry:

```json
{
  "id": "metrics",
  "label": "Metrics",
  "icon": "BarChart2",
  "patterns": []
}
```

Items are assigned to this category via `category: 'metrics'` on `LeafMeta`, not by pattern matching. The empty `patterns` array means no item auto-matches it.

### 1d — `TrendMetricPicker` rewrite

Replace the existing custom popover body with a call to `ValuePickerPopover`. The props interface is unchanged.

**LeafMeta construction:**

```tsx
const leafCols: LeafMeta[] = useMemo(() => {
  const standard: LeafMeta[] = standardMeasures.map((m) => ({
    colId: m.value,
    label: m.label,
    enableValue: true,
    enableRowGroup: false,
    enablePivot: false,
    fixedAgg: 'none',
    category: 'metrics',
  }))
  const numeric: LeafMeta[] = numericDimensions.map((d) => ({
    colId: d.value,
    label: d.label,
    enableValue: true,
    enableRowGroup: false,
    enablePivot: false,
  }))
  return [...standard, ...numeric]
}, [standardMeasures, numericDimensions])
```

**`onSelect` handler:**

```tsx
function handleSelect(colId: string, label: string, aggFunc: string) {
  // aggFunc === 'none' means a standard measure (no aggregation needed)
  const agg = aggFunc === 'none' ? 'sum' : aggFunc
  onChange(colId, agg)
}
```

**Chip label** — derive from the current `measureField`:

```tsx
const chipLabel = useMemo(() => {
  const std = standardMeasures.find((m) => m.value === measureField)
  if (std) return std.label
  const num = numericDimensions.find((d) => d.value === measureField)
  if (num) return `${AGG_LABELS[aggregation] ?? aggregation} · ${num.label}`
  return measureField
}, [measureField, aggregation, standardMeasures, numericDimensions])
```

**Trigger chip JSX** (same chip style as current, h-7):

```tsx
const chip = (
  <button
    type="button"
    className="inline-flex items-center gap-1.5 bg-muted rounded-md px-2.5 h-7 text-xs font-medium hover:bg-muted/80 transition-colors"
  >
    <BarChart2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    <span>{chipLabel}</span>
    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
  </button>
)
```

**Full component** becomes:

```tsx
export function TrendMetricPicker({ measureField, aggregation, standardMeasures, numericDimensions, onChange }: TrendMetricPickerProps) {
  const leafCols = useMemo(/* ... */)
  const chipLabel = useMemo(/* ... */)

  function handleSelect(colId: string, _label: string, aggFunc: string) {
    onChange(colId, aggFunc === 'none' ? 'sum' : aggFunc)
  }

  return (
    <ValuePickerPopover
      leafCols={leafCols}
      onSelect={handleSelect}
      trigger={<chip button>}
    />
  )
}
```

### What does NOT change

- `TrendMetricPickerProps` interface — unchanged
- `onChange(field, agg)` signature — unchanged
- Standard/custom measure logic in `TrendsPage.tsx` — unchanged
- `ValuePickerPopover` existing callers (ZoneBar) — unchanged (no `trigger` prop = default `+ Add` button)

---

## Change 2 — Toolbar height unification (Option A: h-7, chip language)

**File:** `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

### Chart type toggle

Replace the current `border rounded-md p-1` + shadcn `Button` group with an inner-pill toggle:

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

### Breakdown FilterSelect

Add `size="sm"` to the `FilterSelect` call (already supported, renders at h-7):

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

Also update the clear button to match h-7:

```tsx
<button
  type="button"
  onClick={() => setBreakdownDimension(null)}
  className="h-7 min-w-[28px] px-1.5 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-xs"
  aria-label="Clear breakdown"
>
  ✕
</button>
```

### What does NOT change

- Stats strip — unchanged
- `TrendFilters` — unchanged
- Any data/hook logic — unchanged

---

## Files Affected

| File                                                                           | Change                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `apps/web/frontend/components/pivot-table/types.ts`                            | Add `fixedAgg?`, `category?` to `LeafMeta`                           |
| `apps/web/frontend/components/pivot-table/ValuePickerPopover.tsx`              | Add `trigger?` prop, `fixedAgg` skip, `category` passthrough         |
| `apps/web/frontend/config/dimension-categories.json`                           | Prepend "Metrics" category                                           |
| `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx` | Rewrite as thin adapter using `ValuePickerPopover`                   |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`                   | Replace chart toggle; add `size="sm"` to FilterSelect + clear button |

---

## Out of Scope

- Changes to `ZoneBar.tsx` or any other pivot component
- Changes to `useTrendData` or any backend
- Changes to `FilterSelect` itself (already has `size="sm"`)
