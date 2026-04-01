# Trend → Pivot Explorer handoff

**Date:** 2026-04-01

## Summary

Add a "Run in Pivot Explorer" button to the Trend page that navigates to `/pivot` and pre-seeds the Pivot Explorer with the current trend state (measure, breakdown dimension, and local filters).

## UI

A right-aligned ghost button is placed below the chart area inside `CardContent`, after the chart/loading/empty state block:

```
[ chart area ]
                          ⇥ Run in Pivot Explorer
```

The button is only rendered when there is data to carry over (i.e. `activeConnectionId` is set). It uses the existing `Button` component with `variant="outline"` and `size="sm"`.

## State mapping

| Trend state          | Pivot state                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `breakdownDimension` | `initialRowGroups` — replaces the default time dim when set              |
| `measure`            | `initialValueCols` — single value column derived from the measure string |
| `localFilters`       | `initialPivotFilters` — one `FilterEntry` per active filter key/value    |

If `breakdownDimension` is null, `initialRowGroups` is omitted and the Pivot's default time-dimension seeding runs as normal.

### Measure → `ZoneCol` mapping

| Trend measure                        | `ZoneCol`                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `count_events`                       | `{ colId: 'event_count', label: 'Events', aggFunc: 'sum' }`               |
| `unique_users`                       | `{ colId: 'user_id', label: 'Users', aggFunc: 'count_distinct' }`         |
| `<agg>:<field>` (e.g. `sum:revenue`) | `{ colId: field, label: label from pivotOptions or field, aggFunc: agg }` |

### Filter mapping

`localFilters: Record<string, string[]>` → `FilterEntry[]`

Each key that has at least one value maps to a `FilterEntry`. Only the first value per key is used (Pivot filters are single-value). The `fieldLabel` is derived from the `dimensions` list available in `pivotOptions`; falls back to the field key.

## Navigation

State is passed via URL search params so the handoff is bookmarkable and survives a page reload:

```
/pivot?from_trend=1&measure=sum%3Arevenue&breakdown=country&filter_platform=web&filter_device=mobile
```

Encoding rules:

- `from_trend=1` — sentinel so `NewPivotPage` knows to read the params
- `measure=<value>` — the raw `measure` string from `TrendsPage`
- `breakdown=<colId>` — omitted when `breakdownDimension` is null
- `filter_<field>=<value>` — one param per active filter key (first value only)

## Changes required

### 1. `TrendsPage`

- Import `useNavigate` from `react-router-dom`
- Add a helper `buildPivotUrl()` that encodes current state into search params
- Render the ghost button below the chart block (outside the `isError` / `isLoading` / empty-state conditionals — always visible when connected)

### 2. `NewPivotPage`

- Import `useSearchParams` from `react-router-dom`
- On mount, if `from_trend=1` is present, parse params into `initialRowGroups`, `initialValueCols`, `initialPivotFilters`
- Pass these as props to `PivotTable`
- The measure label for custom fields uses the `colId` as the label (e.g. `revenue`). The Pivot's own column metadata will display the correct header label once loaded.

### 3. `PivotTableProps` (types.ts)

Add three optional props:

```ts
initialRowGroups?: ZoneCol[]
initialValueCols?: ZoneCol[]
initialPivotFilters?: FilterEntry[]
```

### 4. `PivotTable`

- Accept and destructure the three new optional props
- Change the default-seeding `useEffect` guard:
  ```ts
  if (rowGroups.length > 0 || valueCols.length > 0) return
  ```
  becomes:
  ```ts
  if (rowGroups.length > 0 || valueCols.length > 0 || initialValueCols?.length) return
  ```
- Initialise state with the provided values:
  ```ts
  const [rowGroups, setRowGroups] = useState<ZoneCol[]>(initialRowGroups ?? DEFAULT_ROW_GROUPS)
  const [valueCols, setValueCols] = useState<ZoneCol[]>(initialValueCols ?? DEFAULT_VALUE_COLS)
  const [pivotFilters, setPivotFilters] = useState<FilterEntry[]>(initialPivotFilters ?? [])
  ```

## Testing

- Unit tests for `buildPivotUrl()` — verify correct encoding for all measure types, with/without breakdown, with/without filters
- Unit tests for the param-parsing logic in `NewPivotPage` — verify correct `ZoneCol` / `FilterEntry` construction for all measure types
- Unit test for `PivotTable` — verify that when `initialValueCols` is provided, the default-seeding effect is skipped
