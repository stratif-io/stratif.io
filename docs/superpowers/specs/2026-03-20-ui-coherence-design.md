# UI Coherence — Design Spec
**Date:** 2026-03-20
**Status:** Approved

## Problem

The app has grown page-by-page with duplicated UI primitives. Fonts, button heights, dropdown heights, and scroll behaviour all vary across pages. Multiple separate Popover-based select components exist with incompatible sizing. One page uses vanilla `<button>` and hard-coded typography instead of the shared component library. Two table implementations exist alongside a capable generic `DataTable` that should be the standard.

## Goals

- Every dropdown/select trigger is `h-10`
- Every toggle button group uses `size="sm"` (`h-9`) with no height overrides
- Every filter popover list uses `max-h-60 overflow-y-auto` and `w-56`
- All pages use `TYPOGRAPHY` constants — no hard-coded Tailwind typography classes
- One shared `FilterSelect` component replaces custom Popover-based selects in `TrendFilters` and `DimensionTreeSelect` call sites
- `DataTable` is the standard table primitive — `EventsTable` and `SessionsPage` migrate to it

## Out of Scope

- `MetricCard` (isolated to dashboard, working correctly)
- `DashboardPage`, `ConnectionsPage`, `ConnectionDetailPage` (already consistent)
- `GlobalFilters` dimension picker (has specialised icon-per-field, arrow-key navigation, and inline clear button — standardise height/width only, do not replace with `FilterSelect`)
- Relocating `SessionsPage` from `pages/` to `features/` (file stays in `pages/`, only its internals are fixed)
- Layout changes, new features, visual redesign

---

## Standards

### Heights

| Element | Standard |
|---|---|
| Select / dropdown trigger | `h-10` |
| Toggle button group buttons | `size="sm"` (`h-9`), no `className` height override |
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

Single unified Popover-based select for use in filter rows and dimension pickers.

**Props:**
```typescript
interface FilterSelectProps {
  mode: 'single' | 'multi'
  options: { value: string; label: string; category?: string }[]
  isLoading?: boolean         // shows spinner/skeleton in list while options load
  value: string | string[] | null
  onChange: (value: string | string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string          // applied to the trigger button only
  size?: 'default' | 'sm'    // 'default' = h-10 (standard), 'sm' = h-7 (compact paired rows)
  searchable?: boolean
  tree?: boolean              // enables category grouping (accordion)
}
```

**Behaviour:**
- Trigger default: `h-10 w-full`; `size="sm"` produces `h-7 text-xs` for use in compact paired filter rows. Note: `FilterSelect size="sm"` is h-7 (compact data-entry row), distinct from `Button size="sm"` which is h-9 (toggle groups)
- Trigger highlights (`border-primary text-primary`) when value is set
- Popover content: `w-56`, list area `max-h-60 overflow-y-auto`
- `isLoading={true}`: renders a loading indicator inside the list area instead of options
- `searchable`: renders `<Input>` at top of popover, filters options client-side
- `tree`: groups options by `category` field; uses `dimension-categories.json` config (imported from `@/config/dimension-categories.json`) for group ordering and labels; opens to the active category's group on mount; any option whose `category` doesn't match a config entry falls into an "Other" group at the bottom
- `mode="multi"`: checkbox per item, trigger shows `"N values"` label when >1 selected, `"Any value"` when empty
- `mode="single"`: closes on selection

**Replaces:**
- `DimensionTreeSelect` → `FilterSelect` with `tree={true} mode="single"`
- `TrendFilters.ValueMultiSelect` → `FilterSelect` with `searchable={true} mode="multi" isLoading={isLoading}` where `isLoading` comes from the caller's TanStack Query hook (caller continues to own the query, passes `options` + `isLoading` as props)

**Does NOT replace:**
- `GlobalFilters` dimension picker — see Out of Scope

**Unit tests required** (`components/__tests__/FilterSelect.test.tsx`):
- Single mode closes popover on selection
- Multi mode shows `"N values"` count label when multiple items selected
- Tree mode opens to the group containing the active value
- Searchable mode filters options client-side (case-insensitive)
- `isLoading={true}` renders loading state instead of option list
- `disabled={true}` prevents opening the popover

### `DimensionTreeSelect` wrapper

`DimensionTreeSelect` becomes a thin wrapper around `FilterSelect` with `tree={true} mode="single"` so call sites outside `TrendFilters` don't require changes. The `size` prop is forwarded. Marked `@deprecated` internally.

### `DataTable` additions

**File:** `apps/web/frontend/components/data-table/DataTable.tsx` (existing)

The existing `DataTable` already has a `loading` prop (renders inline `Skeleton` rows) and an `emptyMessage` string prop (renders a plain text cell). The additions are:

- Replace inline `Skeleton` rows with `<TableSkeleton>` component when `loading={true}`
- Replace plain text empty cell with `<EmptyState>` component when `data.length === 0` and `!loading`
- Rename `loading` → `isLoading` for consistency (update all existing call sites)
- No other API changes

---

## Phase 2 — Page Sweep

### `GlobalFilters`

- Standardise trigger to `h-10` and popover list to `max-h-60 overflow-y-auto w-56`
- Do not replace internals with `FilterSelect` (icons, keyboard navigation, and clear affordance are kept)

### `TrendsPage` + `TrendFilters`

- Replace `DimensionTreeSelect` with `FilterSelect` (`tree={true} mode="single"`)
- Replace `ValueMultiSelect` with `FilterSelect` (`searchable={true} mode="multi" isLoading={isLoading}`) — caller (`TrendFilters`) owns the TanStack Query and passes `options` and `isLoading` as props
- The compact paired filter row (`DimensionTreeSelect` + `ValueMultiSelect` side by side) continues to use `size="sm"` on both `FilterSelect` instances to maintain the paired layout
- Remove `className="h-8"` from chart type toggle buttons (Area / Line / Bar)
- Delete the now-inlined `ValueMultiSelect` function from `TrendFilters.tsx`

### `RetentionPage`

- Remove `className="h-8"` from granularity toggle buttons (Daily / Weekly / Monthly)

### `PathsPage` + `FunnelDetailPage` + `PathsExplorerPage`

- Replace any custom inline filter triggers with `FilterSelect` where applicable
- Fix any remaining `h-8` button overrides
- Standardise any custom popover list heights to `max-h-60`

### `EventsPage` + `EventsTable`

- Refactor `EventsTable` internals to use `DataTable` (depends on Phase 1 `DataTable` additions being complete first)
- User timeline modal trigger and custom cell renderers remain in `EventsTable` as TanStack column definitions passed into `DataTable`

### `SessionsPage`

**Note:** file lives at `apps/web/frontend/pages/SessionsPage.tsx` (not under `features/`). It stays there — no relocation.

- Replace `text-3xl font-bold` / `text-muted-foreground` hard-coded classes with `TYPOGRAPHY` constants
- Replace vanilla `<button>` pagination controls with `<Button variant="outline" size="sm">`
- Migrate table to `DataTable` (depends on Phase 1 `DataTable` additions being complete first)
- Keep session duration formatting and row click handler in feature layer as column definitions

---

## Implementation Order

1. Build `FilterSelect` component + unit tests (`FilterSelect.test.tsx`)
2. Make `DimensionTreeSelect` a thin wrapper around `FilterSelect`
3. Update `DataTable`: swap inline skeletons/empty for `TableSkeleton`/`EmptyState`, rename `loading` → `isLoading`, update existing call sites
4. Sweep pages in order (each step depends on steps 1–3 being complete):
   - `GlobalFilters` (height/width only)
   - `TrendFilters` + `TrendsPage`
   - `RetentionPage`
   - `PathsPage` + `FunnelDetailPage` + `PathsExplorerPage`
   - `EventsTable` + `EventsPage`
   - `SessionsPage`
5. Delete `ValueMultiSelect` from `TrendFilters.tsx` (now unused)

## Testing

- `FilterSelect.test.tsx`: six unit tests listed in the component spec above (required before merging Phase 1)
- After each page in the sweep: run `npm run lint` and `npm run build`
- After full sweep: run `npm run test:run` to confirm no regressions
