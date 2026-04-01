# Trends Page Polish — Design Spec

**Goal:** Two improvements to the Trends page: (1) make `TrendMetricPicker` visually and functionally identical to `ValuePickerPopover`, and (2) remove the separate stat cards and move the numbers inline inside the chart card.

**Architecture:** Pure frontend changes. Both land in the `feat/trends-metric-picker` branch (PR #146), extending the work already there.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui

---

## Change 1 — TrendMetricPicker: match ValuePickerPopover

**File:** `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`

### What changes

**Add search bar** (top of popover, above the two-panel body):

```tsx
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
```

**Add `search` state** (`useState('')`), reset to `''` on popover close.

**Replace hardcoded Custom category with `groupDimensionsByCategory`:**

The left-panel category list is now built as follows:

- **Standard** category: fixed, always first, icon `BarChart2`, items = `standardMeasures`. Not passed through `groupDimensionsByCategory`.
- **Numeric categories**: `groupDimensionsByCategory(numericDimensions, CATEGORIES)` — same import and call as `ValuePickerPopover`. Only shown when `numericDimensions.length > 0`.

`groupDimensionsByCategory` is imported from `@/lib/utils/dimensionCategories`. `CATEGORIES` from `@/config/dimension-categories.json` cast as `DimensionCategoryConfig[]`.

**Add count badges** to left-panel category buttons:

```tsx
<span className="shrink-0 text-[10px] text-muted-foreground/50 ml-1">{cat.items.length}</span>
```

**Add search results mode** (when `search` is non-empty): show a flat grouped list instead of the two-panel body. Same pattern as `ValuePickerPopover`:

```tsx
{search ? (
  <div className="max-h-52 overflow-y-auto">
    {searchGrouped.length === 0 ? (
      <p className="px-3 py-4 text-xs text-muted-foreground text-center">No metrics match</p>
    ) : (
      searchGrouped.map((group) => (
        <div key={group.id}>
          <div className="text-[10px] font-semibold tracking-wide text-muted-foreground px-3 py-1 sticky top-0 bg-popover">
            {group.label}
          </div>
          {group.items.map((item) => (
            <button key={item.value} ... onClick={() => handleItemClick(item, group.isStandard)}>
              {item.label}
            </button>
          ))}
        </div>
      ))
    )}
  </div>
) : (
  /* existing two-panel body */
)}
```

`searchGrouped` is a derived value (useMemo) that filters all categories (Standard + numeric groups) by `item.label.toLowerCase().includes(search.toLowerCase())`, excluding empty groups.

### What does NOT change

- Props interface (`TrendMetricPickerProps`) — unchanged
- Chip appearance and label logic — unchanged
- Step 2 aggregation picker — unchanged
- `onChange` signature — unchanged

---

## Change 2 — Stats section: move inside chart card

**File:** `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`

### What changes

**Remove** the entire `<div className="grid grid-cols-2 gap-2 lg:grid-cols-4">` block (the 3 stat cards above the chart card).

**Add a stats row inside `CardHeader`**, as a second row below the existing controls row:

```tsx
{
  /* Stats row */
}
;<div className="flex items-center gap-3 pt-1">
  <div>
    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Total
    </span>
    <span className="ml-1.5 text-sm font-semibold">{totalEvents.toLocaleString()}</span>
  </div>
  <span className="text-muted-foreground/30">|</span>
  <div>
    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      {periodLabel} avg
    </span>
    <span className="ml-1.5 text-sm font-semibold">{averageValue.toLocaleString()}</span>
  </div>
  <span className="text-muted-foreground/30">|</span>
  <div>
    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      Peak
    </span>
    <span className="ml-1.5 text-sm font-semibold">{maxValue.toLocaleString()}</span>
  </div>
</div>
```

`periodLabel` is already computed from `GRANULARITY_PERIOD_LABELS[granularity]`.

### What does NOT change

- `totalEvents`, `averageValue`, `maxValue` computations in `useTrendData` — unchanged
- `periodLabel` computation — unchanged

---

## Files Affected

| File                                                                           | Change                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx` | Add search, `groupDimensionsByCategory`, counts, search-results mode |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`                   | Remove stat cards grid; add inline stats row in CardHeader           |

---

## Out of Scope

- Changes to `ValuePickerPopover` itself
- Changes to `useTrendData` stat computations
- Any backend changes
