# Trend Page: Stacked Chart by Dimension

**Date:** 2026-03-20
**Status:** Approved

## Summary

Add a "Break down by" dimension selector to the Trends page chart toolbar. When a dimension is selected, the chart stacks event counts by that dimension's values (e.g. mobile / desktop / tablet). Uses the existing `fetchPivot` API — no backend changes needed, but `fetchPivot` needs a `connection_id` param added.

## Data Layer

### Prerequisite: add `connection_id` to `fetchPivot`

`fetchPivot` in `lib/api/queries.ts` currently does not accept or forward `connection_id`. Add it to the params object and append it to the `URLSearchParams`, consistent with all other fetch functions.

### Hook: extend `useTrendData`

Add optional param `breakdownDimension: string | null` to `UseTrendDataOptions`.

**When `breakdownDimension` is set:**

Call:
```ts
fetchPivot({
  row_dimensions: ['date', breakdownDimension],
  measures: ['event_count'],
  start_date,
  end_date,
  event_filter: selectedEvent || undefined,
  filters: activeFilters,
  connection_id: activeConnectionId ?? undefined,
})
```

The pivot endpoint returns flat rows like:
```json
{ "date": "2024-01-01", "device_type": "mobile", "event_count": 120 }
```

Transform to wide-format records grouped by date:
1. Group rows by `date` value
2. For each date group, build: `{ date: formatted, fullDate: raw, [dimensionValue]: count, ... }`
   - `date` = formatted label (same `toLocaleDateString` as trend path)
   - `fullDate` = raw ISO date string
   - Each unique value of `breakdownDimension` becomes a numeric key
3. Derive `seriesKeys: string[]` — sorted unique values of the breakdown dimension across all rows
4. Cap at 8 series: keep the top 8 by total count, merge the rest into an `"(other)"` key
5. TanStack Query key: `['trend-breakdown', breakdownDimension, selectedEvent, startDate, endDate, activeFilters, activeConnectionId]`

**Metrics in stacked mode:**
- `totalEvents` — sum of all counts across all rows
- `averageValue` — `totalEvents / number_of_date_buckets` (rounded)
- `maxValue` — max of the **per-date stacked total** (sum of all series for one date), not the max of any single series

**When `breakdownDimension` is null:**
- Use existing `fetchTrend` call unchanged — zero regression

**Granularity note:** `fetchPivot` does not support a granularity param — breakdown mode always produces daily buckets. The granularity selector remains visible but is disabled (grayed out) when a breakdown dimension is active; a tooltip explains "Granularity is not available in breakdown mode."

### Return shape additions

```ts
seriesKeys: string[] | null   // dimension values when stacked, null otherwise
```

## UI: TrendsPage

1. Fetch filter config: `useQuery({ queryKey: ['filter-config', activeConnectionId], queryFn: () => fetchFilterConfig(activeConnectionId!), enabled: !!activeConnectionId })`
2. Add state: `const [breakdownDimension, setBreakdownDimension] = useState<string | null>(null)`
3. Reset `breakdownDimension` to `null` when `activeConnectionId` changes
4. Disable the granularity `<Select>` when `breakdownDimension` is not null; add a `title` attribute explaining why
5. Add "Break down by" `<Select>` to chart toolbar, after the granularity selector:
   - Only rendered when `filterConfig?.filter_fields.length > 0`
   - Options: `"none"` → "None", then one per `FilterField` (value = `field`, label = `label`)
   - Highlighted (e.g. non-ghost border or label colour change) when a breakdown is active
6. Pass `seriesKeys` from hook to `TrendChart`

## UI: TrendChart

### Prop changes

```ts
interface TrendChartProps {
  data: Array<Record<string, unknown>>  // widened from TrendDataItem[]
  chartType: 'area' | 'line'
  averageValue: number
  eventName: string
  seriesKeys: string[] | null           // new — null = single-series mode
}
```

**When `seriesKeys` is null (existing behaviour, no change):**
- Render single `<Area>` / `<Line>` with `dataKey="count"`, gradient id `"colorCount"`, reference line, and `<Brush>` — exactly as today

**When `seriesKeys` is provided (stacked mode):**
- Render one `<Area>` / `<Line>` per key using `SERIES_COLORS` (cycling)
- Each `<Area>` uses `stackId="stack"` and its own `<linearGradient>` with id `colorKey-${index}`
- Hide the `<ReferenceLine>` (average line is not meaningful per-series)
- Hide the `<Brush>` to avoid Recharts stacked-area brush rendering artefacts
- `<Legend>` is always shown

### Colour palette

```ts
const SERIES_COLORS = [
  'hsl(262, 83%, 70%)',  // violet
  'hsl(199, 89%, 60%)',  // sky
  'hsl(142, 71%, 55%)',  // green
  'hsl(32, 95%, 65%)',   // amber
  'hsl(346, 84%, 65%)',  // rose
  'hsl(221, 83%, 65%)',  // blue
  'hsl(0, 72%, 65%)',    // red
  'hsl(174, 72%, 50%)',  // teal
]
```

## What Does Not Change

- Metric cards (Total Events, Daily Average, Daily Peak) — values are recalculated from stacked totals
- Event selector, date range, global filters — passed through unchanged
- Existing trend query path when no breakdown is selected

## Files Touched

| File | Change |
|------|--------|
| `lib/api/queries.ts` | Add `connection_id` param to `fetchPivot` |
| `features/analytics/trends/hooks/useTrendData.ts` | Add `breakdownDimension` param, pivot query branch, `seriesKeys` return, updated metrics |
| `features/analytics/trends/components/TrendChart.tsx` | Widen `data` prop type, accept `seriesKeys`, render stacked series |
| `features/analytics/trends/TrendsPage.tsx` | Add filter config query, breakdown state, "Break down by" select, disable granularity when active |
