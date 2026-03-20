# UI Coherence — Design Spec
**Date:** 2026-03-20
**Status:** Approved

## Problem

The app has grown page-by-page with duplicated UI primitives. Fonts, button heights, dropdown heights, and scroll behaviour all vary across pages. Three separate Popover-based select components exist with incompatible sizing. One page uses vanilla `<button>` and hard-coded typography instead of the shared component library. Two table implementations exist alongside a capable generic `DataTable` that should be the standard.

## Goals

- Every dropdown/select trigger is `h-10`
- Every toggle button group uses `size="sm"` (`h-9`) with no height overrides
- Every filter popover list uses `max-h-60 overflow-y-auto` and `w-56`
- All pages use `TYPOGRAPHY` constants — no hard-coded Tailwind typography classes
- One shared `FilterSelect` component replaces three custom Popover-based selects
- `DataTable` is the standard table primitive — `EventsTable` and `SessionsPage` migrate to it

## Out of Scope

- `MetricCard` (isolated to dashboard, working correctly)
- `DashboardPage`, `ConnectionsPage`, `ConnectionDetailPage` (already consistent)
- Layout changes, new features, visual redesign

---

## Standards

### Heights

| Element | Standard |
|---|---|
| Select / dropdown trigger | `h-10` |
| Toggle button group buttons | `size="sm"` (`h-9`), no override |
| Filter popover list | `max-h-60 overflow-y-auto` |
| Filter popover width | `w-56` |

### Typography

All pages must use constants from `apps/web/frontend/lib/constants.ts`:
- Page titles → `TYPOGRAPHY.pageLabel` or `TYPOGRAPHY.pageTitle`
- Section headings → `TYPOGRAPHY.sectionTitle` / `TYPOGRAPHY.sectionTitleSm`
- Muted descriptions → `TYPOGRAPHY.muted`
- No inline `text-3xl font-bold`, `text-muted-foreground`, etc.

### Buttons

- Use `<Button>` component always — no vanilla `<button>` with inline styles
- Toggle groups: `<Button variant="secondary" | "ghost" size="sm">` — no `className="h-8"` override
- Pagination / utility actions: `<Button variant="outline" size="sm">`

---

## Phase 1 — Shared Primitives

### `FilterSelect` component

**File:** `apps/web/frontend/components/FilterSelect.tsx`

Single unified Popover-based select replacing three existing implementations.

**Props:**
```typescript
interface FilterSelectProps {
  mode: 'single' | 'multi'
  options: { value: string; label: string; category?: string }[]
  value: string | string[] | null
  onChange: (value: string | string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  searchable?: boolean
  tree?: boolean          // enables category grouping (accordion)
}
```

**Behaviour:**
- Trigger: `h-10 w-full`, highlights (`border-primary text-primary`) when value is set
- Popover content: `w-56`, list area `max-h-60 overflow-y-auto`
- `searchable`: renders `<Input>` at top of popover, filters options client-side
- `tree`: groups options by `category`, renders collapsible accordion groups; opens to the active category on mount
- `mode="multi"`: checkbox per item, trigger shows count label when >1 selected
- `mode="single"`: closes on selection

**Replaces:**
- `DimensionTreeSelect` → `FilterSelect` with `tree={true} mode="single"`
- `GlobalFilters` dimension picker → `FilterSelect` with `searchable={true} mode="single"`
- `TrendFilters.ValueMultiSelect` → `FilterSelect` with `searchable={true} mode="multi"`

### `DimensionTreeSelect` wrapper

`DimensionTreeSelect` becomes a thin wrapper around `FilterSelect` so existing call sites outside the sweep don't break immediately. Marked as deprecated internally.

### `DataTable` additions

**File:** `apps/web/frontend/components/data-table/DataTable.tsx` (existing)

Minor additions only:
- Empty state: render `<EmptyState>` component when `data.length === 0`
- Loading state: render `<TableSkeleton>` when `isLoading` prop is true
- No API changes — all existing call sites remain valid

---

## Phase 2 — Page Sweep

### `SessionsPage`

- Replace `text-3xl font-bold` / `text-muted-foreground` hard-coded classes with `TYPOGRAPHY` constants
- Replace vanilla `<button>` pagination with `<Button variant="outline" size="sm">`
- Migrate table to `DataTable`; keep session duration formatting and row click handler in feature layer

### `TrendsPage` + `TrendFilters`

- Replace `DimensionTreeSelect` with `FilterSelect` (`tree={true} mode="single"`)
- Replace `ValueMultiSelect` with `FilterSelect` (`searchable={true} mode="multi"`)
- Remove `className="h-8"` from chart type toggle buttons (Area / Line / Bar)

### `RetentionPage`

- Remove `className="h-8"` from granularity toggle buttons (Daily / Weekly / Monthly)

### `EventsPage` + `EventsTable`

- Refactor `EventsTable` internals to use `DataTable`
- User timeline modal trigger and custom cell renderers remain in `EventsTable` as column definitions passed into `DataTable`

### `PathsPage` + `FunnelDetailPage`

- Replace any remaining custom inline filter triggers with `FilterSelect`
- Fix any remaining `h-8` button overrides

### `GlobalFilters`

- Replace custom dimension picker Popover with `FilterSelect` (`searchable={true} mode="single"`)

---

## Implementation Order

1. Build `FilterSelect` component with full props and tests
2. Make `DimensionTreeSelect` a wrapper around `FilterSelect`
3. Add `isLoading` + empty state to `DataTable`
4. Sweep pages: `GlobalFilters` → `TrendFilters` → `TrendsPage` → `RetentionPage` → `PathsPage` → `FunnelDetailPage` → `EventsTable` → `SessionsPage`
5. Delete the now-unused `ValueMultiSelect` inline component from `TrendFilters.tsx`

## Testing

- Each migrated component: verify existing behaviour is preserved (selection, search, tree expand/collapse, multi-select count label)
- Run `npm run lint` and `npm run build` after each phase
- Run `npm run test:run` after full sweep
