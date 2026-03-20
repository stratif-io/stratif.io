# Trend Page: Bar Chart + Measure Selection

**Date:** 2026-03-20
**Status:** Approved

## Summary

Two additions to the Trends page chart:
1. **Bar chart type** — adds a "Bar" option to the Area / Line toggle (frontend only)
2. **Measure selection** — lets users choose what to plot on the Y axis: Event Count (default), Unique Users, or any numeric custom property with an aggregation function (Sum / Avg / Min / Max). Requires a small backend extension.

---

## Feature 1: Bar Chart

### Frontend

Add `'bar'` to the `chartType` union: `'area' | 'line' | 'bar'`

**Toolbar:** The current two-button toggle (Area / Line) becomes three buttons: Area / Line / Bar.

**TrendChart:** Add a bar chart branch. `<BarChart>` with `<Bar>` components:
- No breakdown (`seriesKeys` is null): single `<Bar dataKey={measureKey} fill="hsl(var(--primary))" />`. No `<Brush>`, no `<ReferenceLine>`.
- With breakdown: one `<Bar>` per `seriesKey`, each with `stackId="stack"` and a colour from `SERIES_COLORS`. No `<Brush>`, no `<ReferenceLine>`.

---

## Feature 2: Measure Selection

### Backend changes

#### `GET /api/pivot/options` — add `numeric_dimensions`

In `get_pivot_options`, iterate `custom_props` (each has `name`, `path`, `type`) and collect those where `type == 'number'`. The `value` in the response is the property `name` (not `path`), because `name` is what the SQL expressions use as column alias in queries.

```json
{
  "dimensions": [...],
  "measures": [...],
  "numeric_dimensions": [
    { "value": "total_amount", "label": "Total Amount" },
    { "value": "quantity",     "label": "Quantity" }
  ]
}
```

#### `GET /api/pivot` — support `agg:field` measure expressions

Extend `valid_measures` to also accept `sum:field`, `avg:field`, `min:field`, `max:field` where `field` is a valid numeric custom property name for the connection.

SQL generation in `get_measure_expr`:
- `count_events` → `COUNT(*)` (note: existing code already uses `COUNT(*)` here — keep as-is)
- `unique_users` → `COUNT(DISTINCT user_id)` (keep as-is)
- `sum:total_amount` → `SUM(total_amount) AS sum_total_amount`
- `avg:product_price` → `AVG(product_price) AS avg_product_price`
- `min:field` / `max:field` → `MIN(field) AS min_field` / `MAX(field) AS max_field`

The response row key is `{agg}_{field}` (the alias in the SQL SELECT). Derive it as `measure.replace(':', '_')`.

Validation: reject with an error if `field` is not in the connection's numeric custom property names.

### Frontend — types

Extend `PivotOptionsResponse` in `types/index.ts` (the existing index signature is compatible — just add the named optional property):
```ts
numeric_dimensions?: Array<{ value: string; label: string }>
```

### Frontend — state (`TrendsPage`)

Add `measure` state, defaulting to `'count_events'`:
```ts
const [measure, setMeasure] = useState<string>('count_events')
```

Reset `measure` to `'count_events'` when `activeConnectionId` changes (same `useEffect` that resets `breakdownDimension`).

### Frontend — Measure selector UI

A "Measure" `<Select>` in the toolbar, always visible. Options built from `pivotOptions`:

```
─── Standard ──────────────────
  Event Count         (count_events)
  Unique Users        (unique_users)
─── Numeric fields ────────────   (only when numeric_dimensions.length > 0)
  Sum of Total Amount (sum:total_amount)
  Avg of Total Amount (avg:total_amount)
  Min of Total Amount (min:total_amount)
  Max of Total Amount (max:total_amount)
  ...
```

Use `<SelectGroup>` + `<SelectLabel>` to separate the two groups. When a non-`count_events` measure is active, apply `border-primary text-primary` to the trigger (same pattern as the breakdown selector).

### Frontend — hook changes (`useTrendData`)

Add `measure: string` (default `'count_events'`) to `UseTrendDataOptions`.

**Pivot path trigger:**
```ts
const usePivot = !!breakdownDimension || measure !== 'count_events'
```

**No-breakdown, `count_events` path (unchanged):** Uses `fetchTrend`. The `trendData` rows are always normalized to `{ date, fullDate, count: d.count }`. `measureKey = 'count'`.

**No-breakdown, `unique_users` path:** Uses `fetchTrend`. Rows normalized to `{ date, fullDate, count: d.unique_users }`. `measureKey = 'count'` (same key — the value is mapped at read time, not stored under the measure name). This keeps metric computations (`totalEvents`, `averageValue`, `maxValue`) reading `d.count` in all non-pivot paths — no change needed there.

**Pivot path (breakdown OR non-standard measure):** Uses `fetchPivot` with `measures: [measure]`. Derive the response row key:
```ts
const measureRowKey = measure.includes(':') ? measure.replace(':', '_') : measure
// e.g. 'sum:total_amount' → 'sum_total_amount', 'count_events' → 'count_events'
```

**No-breakdown pivot path (measure != count_events, no breakdown dim):** Transform flat pivot rows to `{ date, fullDate, count: Number(row[measureRowKey] ?? 0) }`. The single-series chart still uses `dataKey="count"` via `measureKey = 'count'`. Metric computations unchanged.

**Breakdown pivot path:** Existing flat→wide transform, but use `measureRowKey` instead of `'count_events'` when reading the value from each row.

**Query keys:** Include `measure` in both query keys:
- Trend: `['trend', selectedEvent, granularity, startDate, endDate, activeFilters, activeConnectionId, measure]`
- Pivot: `['trend-breakdown', breakdownDimension, measure, selectedEvent, startDate, endDate, activeFilters, activeConnectionId]`

**Return value:** Add `measureKey: string` to `UseTrendDataReturn` — always `'count'` for the single-series path (both non-pivot and no-breakdown-pivot), derived from `seriesKeys` awareness otherwise.

### Frontend — TrendChart prop changes

Add `measureKey: string` prop (default `'count'`).

In all single-series chart modes (area, line, bar without breakdown), use `dataKey={measureKey}` instead of the hardcoded `"count"`.

---

## What Does Not Change

- Metric cards always reflect the selected measure's totals/averages
- Date range, event selector, granularity, global filters pass through unchanged
- The default path (fetchTrend, no breakdown, count_events) is completely unchanged in behaviour

---

## Files Touched

| File | Change |
|------|--------|
| `backend/api/pivot.py` | Add `numeric_dimensions` to options response; support `agg:field` measures in `/api/pivot` |
| `apps/web/frontend/types/index.ts` | Add optional `numeric_dimensions` to `PivotOptionsResponse` |
| `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts` | Add `measure` param + `measureKey` return; pivot trigger; measure row key derivation; updated query keys |
| `apps/web/frontend/features/analytics/trends/components/TrendChart.tsx` | Add `'bar'` chart type; `measureKey` prop; bar chart rendering |
| `apps/web/frontend/features/analytics/trends/TrendsPage.tsx` | Add `measure` state; Measure selector (with groups); reset on connection change; three-button chart type toggle |
