# Pivot Table Refactor — Spec

**Date:** 2026-03-21

## Goal

Replace the drag-and-drop zone bar in the pivot table with a popover-based dimension picker. Rows and Columns get a categorized tree popover. Values gets a two-step popover (pick dimension → pick aggregation).

## Component Architecture

```
ZoneBar.tsx                    (layout shell — three zone strips + chips)
├── DimensionPickerPopover.tsx (Rows / Columns — categorized tree, multi-select)
└── ValuePickerPopover.tsx     (Values — step 1: dimension tree, step 2: agg method)
```

`ZoneBar` owns no picker state. It renders the three zone strips, the active chips, and "+ Add" buttons, and passes open/close handlers to the pickers.

`PivotTable.tsx` continues to own `rowGroups`, `pivotCols`, `valueCols` state and passes setters to `ZoneBar` — interface is unchanged except drag-related handler props are removed.

## Interaction Design

### Rows & Columns zones

- Each zone renders its chips followed by a "+ Add" button
- Clicking "+ Add" opens `DimensionPickerPopover` anchored below the button
- Dimensions are grouped by category using the existing `groupDimensionsByCategory` utility
- Only `enableRowGroup` columns shown in Rows; only `enablePivot` columns shown in Columns
- Dimensions already present in any zone are disabled (greyed out) in the picker
- Clicking a dimension adds it and closes the popover
- Chips show `Label ×` — click × to remove

### Values zone

- Clicking "+ Add" opens `ValuePickerPopover`
- Step 1: categorized dimension tree (only `enableValue` columns)
- Step 2: list of allowed agg methods for the selected dimension (`allowedAggFuncs`, or the default cycle: sum, count, avg, min, max, countDistinct)
- Selecting an agg adds the chip and closes the popover
- The same dimension can be added multiple times with different aggs — each is a distinct chip
- Chips show `Label · Σ ×` using existing `AGG_LABELS` shorthand
- Clicking the agg badge on an existing chip reopens a mini agg picker to change it

### Both popovers

- Use Radix `Popover` (already in shadcn/ui) — closes on outside click automatically
- No search box in v1

## Files Changed

| File | Change |
|---|---|
| `components/pivot-table/ZoneBar.tsx` | Rewrite — remove all drag logic, render zone strips with chips and "+ Add" buttons |
| `components/pivot-table/DimensionPickerPopover.tsx` | New — categorized tree popover for Rows and Columns |
| `components/pivot-table/ValuePickerPopover.tsx` | New — two-step popover for Values |
| `components/pivot-table/PivotTable.tsx` | Minor — remove drag-related props/handlers passed to ZoneBar |
| `features/design-system/components/sections/DataSection.tsx` | Update PivotTable fixture to match new API |
| `components/pivot-table/types.ts` | No change |
| `features/analytics/pivot/NewPivotPage.tsx` | No change |

## Logic Migration

- `buildLeafMeta` helper moves from `PivotTable.tsx` into a shared export in `types.ts`, imported by both picker components
- `groupDimensionsByCategory` call moves from `ZoneBar.tsx` into `DimensionPickerPopover.tsx`
- `AGG_LABELS` and agg cycle constants move from `ZoneBar.tsx` into `ValuePickerPopover.tsx`

## Out of Scope

- Search / filter within the picker
- Reordering chips
- Backend changes
