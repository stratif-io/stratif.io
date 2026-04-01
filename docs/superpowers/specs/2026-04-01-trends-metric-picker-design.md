# Trends Metric Picker — Design Spec

**Goal:** Remove the event selector from the Trends page and replace the flat measure/aggregation selects with a two-panel metric picker chip, matching the ValuePickerPopover style used in Pivot.

**Architecture:** Pure frontend change. New `TrendMetricPicker` component renders an inline chip that opens a two-panel popover. `TrendsPage` drops `selectedEvent` state and the event selector entirely. `useTrendData` drops the `selectedEvent` param.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query v5

---

## What Changes

### 1. Remove the event selector

The `<Select>` that filters by event name is removed from `TrendsPage`. The chart always shows all events (i.e. `event_filter: undefined` is always sent to the API). This also removes:

- `selectedEvent` state
- `events` / `eventsLoading` return values from `useTrendData`
- The `fetchEvents` query inside `useTrendData`

### 2. Replace measure + aggregation selects with `TrendMetricPicker`

**New file:** `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx`

A chip + two-panel popover. Identical visual design to `ValuePickerPopover`:

- `w-72 p-0` popover
- Search bar: `flex items-center gap-2 px-3 py-2 border-b`, `Search` icon, plain `<input>` with `autoFocus`, clear `X` button when non-empty
- Two-panel body `flex max-h-52`:
  - Left `w-32 shrink-0 bg-muted/40 overflow-y-auto border-r`: category buttons with icon + label + count
  - Right `flex-1 overflow-y-auto`: item rows `px-2.5 py-1.5 text-xs hover:bg-accent`
- When search active: flat grouped list
- Step 2 (custom fields only): back `ChevronLeft` + metric name header, aggregation options same row style

**Categories:**

- **Standard** (icon: `BarChart2`) — always present, items from `standardMeasures` (`pivotOptions.measures`): `count_events` → "Event Count", `unique_users` → "Unique Users"
- **Custom** (icon: `Sigma`) — only shown when `numericDimensions.length > 0`, items from `pivotOptions.numeric_dimensions`

**Props:**

```typescript
interface TrendMetricPickerProps {
  measureField: string
  aggregation: string
  standardMeasures: DimensionOption[] // from pivotOptions.measures
  numericDimensions: DimensionOption[] // from pivotOptions.numeric_dimensions
  onChange: (field: string, agg: string) => void
}
```

**Chip label:** show `measure.label` for standard, `${dim.label} (${agg})` for custom.

**Standard metrics** apply immediately on click (no step 2). Custom metrics open step 2 for aggregation selection. Aggregation options: `sum`, `avg`, `min`, `max`, `count`, `countDistinct` — labels match existing `AGG_LABELS` map.

### 3. TrendsPage changes

- Remove `selectedEvent` state
- Remove event selector JSX
- Remove `events` / `eventsLoading` from `useTrendData` destructure
- Replace the two `<Select>` components (measure + aggregation) with `<TrendMetricPicker>`

### 4. useTrendData changes

- Remove `selectedEvent` from `UseTrendDataOptions`
- Remove `events` / `eventsLoading` from `UseTrendDataReturn`
- Remove the `fetchEvents` query
- Always pass `event_filter: undefined` to `fetchPivot`

---

## Files Affected

| File                                                                           | Change                                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `apps/web/frontend/features/analytics/trends/components/TrendMetricPicker.tsx` | **Create** — chip + two-panel picker                                                 |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx`                   | Remove event selector; add `TrendMetricPicker`                                       |
| `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts`            | Remove `selectedEvent` param + `events`/`eventsLoading` return + `fetchEvents` query |

---

## Out of Scope

- Multiple metrics on one chart
- Event filtering (removed entirely)
- Any backend changes
