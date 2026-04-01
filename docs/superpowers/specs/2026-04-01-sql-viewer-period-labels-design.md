# SQL Viewer Period Labels — Design

**Date:** 2026-04-01
**Status:** Approved

## Problem

The SQLViewer DevCard tab labels use vague, imprecise text:

- `Number of Total Events this period (1)` / `(2)` — index numbers don't communicate which period a query belongs to
- `Total Events per day (1)` / `(2)` — granularity is hardcoded to "day" regardless of the active setting
- Tooltip: `Change vs. previous period` — no actual dates
- HeroMetricCard `prev. period: X` — no actual dates

The goal is to replace all of these with precise labels that include the actual date ranges and correct granularity.

## Approach

Option A: pass dates as props down from `MissionControlGrid`, which already has access to `dateRange` and reads `granularity` from the Zustand store. No store reads inside metric cards, no new abstractions.

## Changes

### 1. `formatPeriodRange` helper

New utility function, added to `apps/web/frontend/lib/format-metric.ts`:

```ts
formatPeriodRange(start?: string, end?: string): string | undefined
```

- Returns `"2025-01-01 – 2026-01-01"` (en-dash separator) when both dates are provided
- Returns `undefined` when either date is missing (all-time view)
- Callers fall back to generic text (`"this period"`, `"previous period"`) when `undefined`

---

### 2. `buildAllSql` — DevCard tab labels (`MissionControlGrid.tsx`)

**Signature change:** add `currentPeriodLabel: string`, `previousPeriodLabel: string`, `granularity: Granularity` parameters.

**Period label strings** (computed in `MissionControlGrid`, passed to `buildAllSql`):

- `currentPeriodLabel`: `"this period (2025-01-01 – 2026-01-01)"` or `"this period"` in all-time view
- `previousPeriodLabel`: `"previous period (2025-01-01 – 2025-12-31)"` or `"previous period"` in all-time view

**Convention for arrays:** index 0 = current period, index 1 = previous period. This matches how the API and trend hooks produce SQL arrays.

**Metric SQL labels** (was: `Number of ${label} this period (N)`):

- Index 0: `Number of Total Events — this period (2025-01-01 – 2026-01-01)`
- Index 1: `Number of Total Events — previous period (2025-01-01 – 2025-12-31)`
- Single query: `Number of Total Events — this period (2025-01-01 – 2026-01-01)`

**Trend SQL labels** (was: `${label} per day (N)`, hardcoded "day"):

- Index 0: `Total Events per month — this period (2025-01-01 – 2026-01-01)`
- Index 1: `Total Events per month — previous period (2025-01-01 – 2025-12-31)`
- Single query: `Total Events per month — this period (2025-01-01 – 2026-01-01)`

---

### 3. `MissionControlGridProps` — new `dateRange` prop

```ts
dateRange: DateRange
```

`MissionControlGrid` uses `dateRange` to compute `currentPeriodLabel` and `previousPeriodLabel` via `formatPeriodRange`. It reads `granularity` from `useAppStore`. Both are passed to `buildAllSql` and used to derive `changeLabel` / `prevPeriodLabel` for metric cards.

---

### 4. `MiniMetricCard` — change tooltip

The `changeLabel` prop is already defined (`changeLabel?: string`). Currently the grid never passes it, so the fallback `'Change vs. previous period'` is always shown.

Change: the grid always passes an explicit `changeLabel`:

- With dates: `"Change vs. 2025-01-01 – 2025-12-31"`
- All-time: `"Change vs. previous period"` (unchanged)

---

### 5. `HeroMetricCard` — change tooltip + `prev. period:` label

Same `changeLabel` treatment as `MiniMetricCard`.

New optional prop `prevPeriodLabel?: string`:

- With dates: renders as `prev. (2025-01-01 – 2025-12-31):`
- Without (all-time): renders as `prev. period:` (current behaviour)

---

## File Scope

| File                                                                  | Change                                                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `lib/format-metric.ts`                                                | Add `formatPeriodRange`                                                                              |
| `features/dashboard/components/MissionControlGrid.tsx`                | New `dateRange` prop; read `granularity` from store; compute labels; pass to cards and `buildAllSql` |
| `features/dashboard/components/HeroMetricCard.tsx`                    | New `prevPeriodLabel` prop; use passed `changeLabel`                                                 |
| `features/dashboard/components/MiniMetricCard.tsx`                    | Use passed `changeLabel`                                                                             |
| `features/dashboard/components/__tests__/MissionControlGrid.test.tsx` | Update tests for new prop + label output                                                             |
| `features/dashboard/components/__tests__/HeroMetricCard.test.tsx`     | Update tests for `prevPeriodLabel`                                                                   |

No backend changes required.

## All-time view (no date range)

When `dateRange.from` / `dateRange.to` are undefined, `formatPeriodRange` returns `undefined` and all labels fall back to their generic form:

- `Number of Total Events — this period`
- `Total Events per month — previous period`
- `Change vs. previous period`
- `prev. period: X`
