# stratifio-pivot — Design Spec

**Date:** 2026-03-17
**Status:** Approved by user

---

## Overview

`stratifio-pivot` is a standalone open source project (separate GitHub repo) that provides two composable, AG Grid-free React table components:

1. **`<EventsTable>`** — a sortable, filterable, server-paginated data table for event streams
2. **`<PivotTable>`** — a pivot/aggregation explorer with row group / pivot column / value column zones and server-side data fetching

The project replaces `ag-grid-enterprise` (which shows a "for trial use only" watermark without a paid license) with components built on **TanStack Table** (MIT) + **TanStack Virtual** (MIT) + **Tailwind CSS v4**.

It is a **reference implementation / copy-paste project** — not published to npm. Users clone the repo or copy the `src/components/` folder into their own project.

---

## Goals

- Replace AG Grid Enterprise in `stratifio-oss` with zero enterprise/viral license dependencies
- Styled with Tailwind CSS v4 + CSS variables (light/dark mode via `.dark` on `<html>`)
- Composable: each building block (`<FilterBar>`, `<Pagination>`, `<ColumnPanel>`, `<PivotToolbar>`, `<ZoneBar>`) is independently usable
- Includes a live demo app with mock data for both components

---

## Non-Goals

- npm publishing / versioning
- Headless / unstyled variant
- Supporting databases or backends directly (components are pure UI)
- Replicating AG Grid's client-side pivot engine (pivot computation stays server-side via the existing API)
- `showSubtotals` toggle (present in current `NewPivotPage` but not used enough to justify added complexity — explicitly out of scope)

---

## Project Location

```
/Users/carlo/my_work/stratifio/stratifio-pivot/
```

Sits alongside `stratifio-oss` and `stratifio-saas` in the same workspace.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 |
| Build tool | Vite 6 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Table logic | `@tanstack/react-table` v8 |
| Virtualization | `@tanstack/react-virtual` v3 (EventsTable rows only) |
| Icons | `lucide-react` |
| Date formatting | `date-fns` |
| UI primitives | shadcn/ui-style components (Button, Badge, Spinner) — inline, no external dep |

TanStack Virtual is used for row virtualization in `<EventsTable>` when the visible page has many rows. It is **not** used in `<PivotTable>` where result sets are small by nature of aggregation.

---

## Project Structure

```
stratifio-pivot/
├── README.md                       # Setup steps only (npm install, npm run dev)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx                    # Demo app entry
    ├── index.css                   # Tailwind + CSS variables (light/dark)
    ├── lib/
    │   └── utils.ts                # cn() helper
    ├── demo/
    │   ├── EventsDemo.tsx          # Live demo: EventsTable with mock data
    │   └── PivotDemo.tsx           # Live demo: PivotTable with mock data
    └── components/
        ├── ui/                     # Shared primitives (Button, Badge, Spinner)
        ├── shared/
        │   ├── FilterBar.tsx       # Active filter chips with × clear buttons
        │   └── Pagination.tsx      # First/prev/next/last + "X–Y of N" label
        ├── events-table/
        │   ├── EventsTable.tsx     # Main composed component
        │   ├── ColumnPanel.tsx     # Show/hide columns, localStorage persisted
        │   └── types.ts
        └── pivot-table/
            ├── PivotTable.tsx      # Main composed component
            ├── PivotToolbar.tsx    # Reset, CSV export, add filter/measure buttons
            ├── ZoneBar.tsx         # Row groups / pivot cols / value cols zones
            └── types.ts
```

The README covers setup steps only. The demo app (`npm run dev`) is the behavioral documentation — running it shows all interactions.

---

## Component Design

### Shared Components

**`<FilterBar filters={[{label, value, onClear}]} />`**
Renders a row of pill badges with × buttons. Used by both EventsTable and PivotTable. No state — purely controlled.

**`<Pagination page totalPages from to total onPageChange />`**
Renders first/prev/next/last buttons and a "X–Y of N events" label. Purely controlled, no internal state.

---

### EventsTable

The current `EventsTable.tsx` in `stratifio-oss` already has a props-based interface. The new component is a **direct drop-in replacement with identical props** — migration in `stratifio-oss` is a single import line change, no logic changes.

**Props** (identical to current AG Grid component):

```ts
interface EventsTableProps {
  data: RawEvent[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  isFetching?: boolean          // used for subtle loading indicator (skeleton/opacity) while data refreshes
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (field: string, order: 'asc' | 'desc') => void
  filterFields: FilterField[]
  customProperties: CustomProperty[]
  filterOptions: Record<string, string[]>
  allEventNames: string[]
  columnFilters: Record<string, string>
  onColumnFilterChange: (field: string, value: string) => void
  onColumnFilterClear: (field: string) => void
  eventNameFilter: string
  onEventNameFilterChange: (v: string) => void
  userIdFilter: string
  onUserIdFilterChange: (v: string) => void
  onPageChange: (page: number) => void
  onUserClick: (userId: string) => void
  connectionId?: string | null
}
```

**Internals:**
- TanStack Table manages column definitions, visibility state, and sort state
- Row virtualization via TanStack Virtual (renders only visible rows)
- Column visibility persisted to `localStorage` under key `of_events_colstate_v2_${connectionId}`
- Filtering is fully server-side — component calls filter callbacks; parent owns all filter state
- `<ColumnPanel>` (show/hide) rendered as a slide-in panel triggered by a columns button in the table header
- Text filter on `user_id` (debounced input), dropdown filter on `event_name` (multi-select from `allEventNames`), click-to-filter on dim columns
- Cell click actions: `user_id` → `onUserClick`, `event_name` → `onEventNameFilterChange`, dim col → `onColumnFilterChange`
- `isFetching` renders a subtle loading overlay (reduced opacity on rows + spinner in header) without hiding the table

---

### PivotTable

The current `NewPivotPage` in `stratifio-oss` is a **zero-prop page component** that reads all state from Zustand and runs its own TanStack Query fetches. The new `<PivotTable>` is a **prop-driven composable component** — this is a deliberate design improvement.

**Migration impact:** `NewPivotPage.tsx` in `stratifio-oss` must be updated to:
1. Continue making its own TanStack Query calls (`fetchPivotGridColDefs`, `fetchFilterConfig`)
2. Handle `filterConfig` validation (stripping invalid `activeFilters` for the current connection) — this logic stays in the page component, not inside `<PivotTable>`
3. Pass the resulting data down as props to `<PivotTable>`

This is a small refactor of the page component (~30 lines moved), not a logic change. All API calls and Zustand reads remain in `NewPivotPage`.

**Props:**

```ts
interface PivotTableProps {
  // Column metadata from API (fetchPivotGridColDefs response)
  colDefsData: PivotColDefsResponse | undefined
  colDefsLoading: boolean
  // Date range + pre-validated global filters (caller strips invalid fields via filterConfig)
  startDate?: string
  endDate?: string
  activeFilters: Record<string, string>
  activeConnectionId?: string | null
  // Fetch callbacks — component drives data fetching via these
  fetchRows: (params: PivotRowsRequest) => Promise<PivotRowsResponse>
  fetchFilterValues: (field: string) => Promise<string[]>
}
```

**Internals:**
- Row groups, pivot columns, and value columns managed as local state arrays (`ZoneCol[]`)
- `<ZoneBar>` renders three labeled drop zones (Rows / Columns / Values). Available columns are shown as draggable pills above the zones; users drag them into a zone. Implemented with the HTML drag-and-drop API (no extra dependency)
- **Agg function picker:** value column pills in the Values zone render a small badge button showing the current agg func (e.g., `Σ`, `n`, `avg`). Clicking it cycles through the allowed agg funcs for that column (`sum → count → avg → min → max → countDistinct → sum`). This matches the current behavior driven by `aggFuncOverridesRef` in `NewPivotPage`
- Pivot-local dimension filters managed as local state (`FilterEntry[]`). `<FilterBar>` renders them; "Add Filter" in toolbar opens a field + value picker
- On any zone or filter change, component re-fetches rows via `fetchRows` prop
- TanStack Table renders the resulting flat rows with dynamic column defs built from the API response
- CSV export: serialize `table.getRowModel().rows` → CSV string → download blob
- `<PivotToolbar>` renders: Reset button, Download CSV button, Add Filter button, Add Measure button

---

## Theming

`src/index.css` defines CSS variables with identical names to `stratifio-oss/src/index.css`:

```css
:root {
  --background: ...; --foreground: ...;
  --primary: ...; --muted: ...; --border: ...;
  /* same variable names as stratifio-oss */
}
.dark { /* dark overrides */ }
```

Components use Tailwind utility classes referencing these variables (`bg-background`, `text-foreground`, `border-border`). Dark mode toggled by adding `dark` class to `<html>`.

---

## Demo App

`src/demo/EventsDemo.tsx` — renders `<EventsTable>` with 200 rows of mock event data. Includes mock filter fields, custom properties, and simulated pagination (client-side slicing). Demonstrates all interactive features: sort, filter chips, column show/hide, user click, isFetching overlay.

`src/demo/PivotDemo.tsx` — renders `<PivotTable>` with mock column defs and a mock `fetchRows` function returning pre-defined aggregated rows. Demonstrates zone drag-and-drop, agg function cycling, filter addition, CSV export.

---

## Migration Path (stratifio-oss)

Once `stratifio-pivot` is built:

**EventsTable (import-line only):**
1. Copy `stratifio-pivot/src/components/events-table/` → `stratifio-oss/frontend/features/events/components/`
2. Copy `stratifio-pivot/src/components/shared/` → `stratifio-oss/frontend/components/shared/`
3. Update import in the parent component — props are identical, no other changes

**PivotTable (small page-component refactor):**
1. Copy `stratifio-pivot/src/components/pivot-table/` → `stratifio-oss/frontend/features/analytics/pivot/components/`
2. Copy `stratifio-pivot/src/components/shared/` → `stratifio-oss/frontend/components/shared/` (if not already done)
3. Refactor `NewPivotPage.tsx`: keep all TanStack Query calls and Zustand reads in the page component; pass `colDefsData`, `colDefsLoading`, `startDate`, `endDate`, `activeFilters` (validated), `activeConnectionId`, `fetchRows`, `fetchFilterValues` as props to `<PivotTable>`
4. The `filterConfig` validation logic (~10 lines) stays in `NewPivotPage.tsx`

**Cleanup (both):**
5. Delete `stratifio-oss/frontend/lib/ag-grid-theme.ts`
6. Remove `ag-grid-community`, `ag-grid-react`, `ag-grid-enterprise` from `package.json`

No backend changes required.

---

## Success Criteria

- [ ] `<EventsTable>` renders all events data with sort, filter, pagination, column show/hide — no AG Grid watermark
- [ ] `<PivotTable>` renders pivot data with zone controls, agg function cycling, filters, CSV export — no AG Grid watermark
- [ ] Light/dark mode works on both components
- [ ] Demo app runs with `npm run dev` out of the box with zero configuration
- [ ] `stratifio-oss` EventsTable swap requires only an import line change
- [ ] `stratifio-oss` PivotTable swap requires only the described page-component refactor (~30 lines)
- [ ] Zero `ag-grid-*` dependencies in `stratifio-pivot/package.json`
