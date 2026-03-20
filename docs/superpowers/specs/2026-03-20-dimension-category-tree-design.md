# Dimension Category Tree

**Date:** 2026-03-20
**Status:** Approved

## Overview

Add category grouping to all dimension selectors across the analytics UI. Dimensions are auto-assigned to categories via a frontend JSON regex config file. Each selector becomes a collapsible tree (grouped by category, sorted A→Z within each group) with the current selection's category auto-expanded on open.

## Categories

Seven categories defined with emojis, evaluated top-to-bottom (first match wins):

| ID | Label | Key patterns |
|---|---|---|
| `time` | 🕐 Time | `^ts_`, `^(date\|week\|hour\|month\|quarter\|year)$`, `_(at\|date\|time\|ts)$` |
| `event` | 📣 Event | `^event_`, `^day_of_week$` |
| `user` | 👤 User | `^user_`, `_(user\|account\|customer\|tenant)$` |
| `geography` | 🌍 Geography | `(country\|city\|region\|state\|geo\|locale\|timezone)` |
| `device` | 💻 Device & Platform | `(device\|browser\|os\|platform\|screen\|viewport)` |
| `marketing` | 📢 Marketing | `^utm_`, `(referrer\|campaign\|channel\|source\|medium)` |
| `other` | ⚙️ Other | `.*` (catch-all) |

Patterns match against the dimension field name (`value`), case-insensitive.

## Types

Add to `apps/web/frontend/types/index.ts`:

```ts
export interface DimensionOption {
  value: string
  label: string
}

export interface DimensionCategoryConfig {
  id: string
  label: string       // includes emoji, e.g. "🕐 Time"
  patterns: string[]  // raw regex strings, compiled once at module load
}

export interface DimensionGroup {
  category: DimensionCategoryConfig
  dimensions: DimensionOption[]
}
```

Also update `PivotOptionsResponse` to use `DimensionOption[]` instead of the current inline `Array<{ value: string; label: string }>`.

## Architecture

**Approach:** Frontend-only. The backend returns flat dimension arrays unchanged. Grouping is a pure UI concern handled in the frontend.

### New Files

**`apps/web/frontend/config/dimension-categories.json`**
The regex config array. Each entry: `{ id, label, patterns[] }`. Ordered — first match wins.

**`apps/web/frontend/lib/utils/dimensionCategories.ts`**

> Note: `lib/utils/` is a new subdirectory. The existing `lib/utils.ts` flat file remains — it is not migrated.

Pure utility:
```ts
// RegExp objects compiled once at module load from the imported JSON config
groupDimensionsByCategory(
  dimensions: DimensionOption[],
  categories: DimensionCategoryConfig[]
): DimensionGroup[]
```
- Returns only non-empty groups
- Dimensions sorted A→Z by label within each group
- Groups ordered as defined in config (Time first)
- Patterns compiled to `RegExp` at module load (not per-call) to avoid repeated compilation

**`apps/web/frontend/lib/utils/dimensionCategories.test.ts`**
Unit tests covering: correct category assignment, first-match-wins, catch-all fallback, A→Z sort, empty group exclusion, empty input array returns empty array.

**`apps/web/frontend/components/DimensionTreeSelect.tsx`**
Shared select component. Built on shadcn/ui `Command` (cmdk) inside a `Popover` — this gives keyboard navigation and screen-reader accessibility for free, and matches the shadcn pattern used for comboboxes elsewhere in the project.

Import by direct path (`@/components/DimensionTreeSelect`) — no barrel file needed.

The `Command` search input is **omitted** (`shouldFilter={false}`) — the tree's collapsible category UX is the navigation mechanism. Categories with few items don't benefit from search.

The Popover trigger is a full-width button showing the current selection's label (or `placeholder` text if `value` is null), with a chevron icon on the right — matching the existing combobox pattern in the project. Width is inherited from the trigger (no fixed width).

Props:
```ts
interface DimensionTreeSelectProps {
  value: string | null
  onChange: (value: string) => void
  dimensions: DimensionOption[]
  placeholder?: string
  disabled?: boolean
}
```

Behavior:
- Groups dimensions via `groupDimensionsByCategory`
- On open: all categories collapsed except the one containing the current `value`. When `value` is `null`, the first non-empty category (Time) is expanded by default.
- Click category header → toggle expand/collapse
- Click dimension item → call `onChange`, close popover
- Dimensions sorted A→Z within each group
- Empty categories hidden

### Modified Files

| File | Change |
|---|---|
| `types/index.ts` | Add `DimensionOption`, `DimensionCategoryConfig`, `DimensionGroup`; update `PivotOptionsResponse` |
| `features/analytics/trends/TrendsPage.tsx` | Replace **breakdown dimension** dropdown with `DimensionTreeSelect`. The measure field select (count, unique users, numeric fields) is **not** in scope — it is a separate semantic concept and stays as-is. |
| `features/analytics/trends/components/TrendFilters.tsx` | Replace dimension picker in each filter row with `DimensionTreeSelect` |
| `features/analytics/pivot/NewPivotPage.tsx` | Replace row group + pivot column dimension pickers with `DimensionTreeSelect` |
| `features/connections/components/FilterConfigTab.tsx` | See section below |

### FilterConfigTab — Read-Only Grouped Display

`FilterConfigTab` manages which fields are enabled as global filters. Its available fields list comes from `schema.custom_properties` plus hardcoded candidates (`user_id_field`, `timestamp_field`, `event_name_field`) — **not** from the `PivotOptionsResponse` dimensions array.

For this tab, the available fields are displayed as a read-only grouped list (not a select). Implementation:
- Convert the candidates list to `DimensionOption[]` using their existing label strings
- Call `groupDimensionsByCategory` to group them
- Render each category as a collapsible section header with dimension items inside (toggle checkboxes, as today)

`DimensionTreeSelect` is **not** used here. The grouping/tree UI is rendered inline within `FilterConfigTab` using the same `groupDimensionsByCategory` utility.

## Data Flow

```
dimension-categories.json (static import)
  ↓ RegExp compiled once at module load
groupDimensionsByCategory(dimensions, config) → DimensionGroup[]
  ↓
DimensionTreeSelect renders Command-based collapsible tree
  ↓ auto-expands category of current value (or Time if null)
  ↓ dims sorted A→Z within category
onChange(value) → parent state (unchanged from today)
```

## Testing

- **Unit tests** (`dimensionCategories.test.ts`): pure function, no DOM needed. Covers all grouping/sorting/edge-case logic.
- **Integration**: existing page-level tests continue to work — `DimensionTreeSelect` exposes the same value/onChange contract as current selects.
- No backend changes, no new API calls.
