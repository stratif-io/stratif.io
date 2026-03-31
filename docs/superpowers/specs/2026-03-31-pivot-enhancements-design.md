# Pivot Page Enhancements — Design Spec

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Fix three UX problems on the pivot page: blank empty state, inconsistent expanded selectors, and an unclosable SQL viewer.

**Architecture:** Pure frontend changes — `ZoneBar`, `ValuePickerPopover`, `PivotTable`, and `NewPivotPage`. No backend changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand (global granularity store)

---

## Problem 1 · Default State

### Current behaviour

The page loads completely empty. The user sees an empty state message ("No data to display — use + Add in Rows and Values zones") with no guidance.

### New behaviour

On mount, when no row groups and no value columns are configured, pre-fill:

- **Row group:** the time dimension that corresponds to the current global granularity (same mapping as Trends: `hour → hour_bucket`, `day → date`, `week → week`, `month → month`, `quarter → quarter`, `year → year`)
- **Values:** `count_events` and `unique_users`

All three pre-filled chips are **freely removable** — no locking, no visual distinction. The granularity dimension chip label updates reactively when the global granularity changes **only if** the user hasn't removed or replaced the time row group. Specifically:

- Track whether the current row group matches the previous default time dimension
- If yes, swap it for the new time dimension on granularity change
- If the user has modified rows (removed or added something else), do not touch them

### Files affected

- `apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx` — initialise `rowGroups`, `valueCols` state from store granularity; add `useEffect` to update time dim on granularity change
- `apps/web/frontend/components/pivot-table/PivotTable.tsx` — pass granularity-derived initial state through to `ZoneBar` (if state is lifted there)

### Granularity → dimension mapping

```typescript
const GRANULARITY_TO_DIM: Record<Granularity, string> = {
  hour: 'hour_bucket',
  day: 'date',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
}
```

The `colId` values `date`, `week`, `month`, `quarter`, `year`, `hour_bucket` already exist as `LeafMeta` entries returned by `fetchPivotGridColDefs`. The default value `colId`s are `count_events` and `unique_users`.

---

## Problem 2 · Zone Bar & Expanded Selectors

### 2a — Zone bar layout

Replace the current three separate dashed-border `Zone` boxes with one unified segmented card.

**New `ZoneBar` layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  ROWS              │  COLUMNS           │  VALUES            │
│  [date ×] [+]      │  [country ×] [+]   │  [Events ×] [+]   │
└─────────────────────────────────────────────────────────────┘
```

- One `border border-border rounded-md` container, `bg-background`
- Three equal `flex-1` sections separated by `border-r border-border`
- Each section: `px-3 py-2`, label is `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1`, chips below in `flex flex-wrap gap-1`
- Chips (all zones): `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-foreground` — no colour per zone, uniform style
- `+` button: icon-only `Plus` icon, `variant="ghost" size="icon" h-6 w-6`, shown after chips

### 2b — Unified expanded popover for Values

Rewrite `ValuePickerPopover` so its first step (metric selection) matches `FilterSelect` tree mode exactly:

**Step 1 — metric picker (identical structure to `FilterSelect` tree mode):**

- `PopoverContent` width: `w-72`
- Search bar at top: `flex items-center gap-2 px-3 py-2 border-b` with `Search` icon, plain `<input>` with `autoFocus`, clear `X` button when search is non-empty
- Two-panel body `flex max-h-52`:
  - Left panel `w-32 shrink-0 bg-muted/40 overflow-y-auto border-r`: category buttons, active state `bg-primary/10 text-primary font-medium`
  - Right panel `flex-1 overflow-y-auto`: item rows `px-2.5 py-1.5 text-xs hover:bg-accent transition-colors`
- When search is active: collapse to single grouped list (same as `FilterSelect` search mode)

**Step 2 — aggregation picker (unchanged flow, updated style):**

- Header: `flex items-center gap-1 px-3 py-2 border-b` with back `ChevronLeft` button + metric name
- Section label: `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-1`
- Agg options: same `px-2.5 py-1.5 text-xs hover:bg-accent` rows as step 1 items

No changes to `FilterSelect.tsx`.

---

## Problem 3 · SQL Viewer Close Button

### Current behaviour

The pivot page renders a `DevCard` wrapping the pivot table. Clicking the SQL badge opens the expanded `SQLViewer` overlay via `expand()`. There is no way to close it short of pressing Escape.

### New behaviour

The SQL badge button (currently the only entry point to SQL via `expand()`) becomes a **toggle**: if the overlay is already open (`expanded === true`), clicking the badge collapses it instead of re-opening. This gives the user a consistent click-to-open / click-to-close affordance without adding new UI elements.

### Files affected

- `apps/web/frontend/components/dev/DevCard.tsx` — change the SQL badge `onClick` from `expand` to a toggle: `expanded ? collapse() : expand()`
- The existing `collapse()` function (called by Escape and the Collapse button in the overlay) already handles teardown; reuse it directly.

---

## Out of scope

- Drag-and-drop reordering of chips (existing behaviour, not changed)
- Persisting pivot configuration across page reloads
- Any backend changes

---

## Testing

- Navigate to `/pivot` with no prior configuration → time dim chip + Events + Users pre-filled
- Change global granularity → time dim chip updates (if user hasn't touched rows)
- Remove time dim chip, change granularity → rows stay empty (no re-injection)
- Click `+` in Rows → two-panel popover with search opens
- Click `+` in Values → identical two-panel popover opens; click a metric → agg step; click back → returns to metric list
- Open SQL viewer → click SQL badge again → overlay closes
- All existing DevCard tests pass
