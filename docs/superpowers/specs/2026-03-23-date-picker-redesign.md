# Date Picker Redesign

**Date:** 2026-03-23
**Status:** Approved

## Overview

Replace the existing `DateRangePicker` component with a new horizontal design that keeps the most-used presets always visible as quick chips, while putting the full preset list and a dual-month calendar inside a popover for custom range selection with time precision.

## Trigger + Quick Chips

The date picker lives in `GlobalFilters` as a single horizontal row (the existing `inlineMode` render path — no layout change to `GlobalFilters.tsx` needed):

```
📅 Mar 1 – Mar 23, 2025  ▾  |  7D  30D  90D  YTD  All time
```

- **Date range trigger** — a button showing the current range as text. Clicking opens the full popover.
- **Vertical separator** — visual divider between trigger and chips.
- **5 quick chips** — 7D · 30D · 90D · YTD · All time. Clicking applies the preset immediately with no popover.
- **Active state** — determined by `presetId` in the Zustand store (see Data Model). The quick chips read `presetId` directly — no fuzzy date comparison.
- **Display text** — shows time component (` HH:MM:SS`) only when `presetId === null` (i.e. a custom range) AND `from` or `to` has a non-zero time part (`hours | minutes | seconds !== 0`). Preset selections never show time in the trigger regardless of the time values they produce.

## Full Popover

Opened by clicking the date range trigger. Contains two sections:

### Section 1 — All 16 Presets

Two rows of chips, grouped by type:

| Group | Presets |
|---|---|
| Rolling | Today · Yesterday · 7D · 14D · 30D · 90D · 6M · 12M |
| Calendar-aligned | This wk · Last wk · This mo · Last mo · This Q · Last Q · YTD · All time |

Clicking any preset calls the combined `applyPreset(range, id)` store action and closes the popover immediately.

### Section 2 — Custom Range

A dual-month calendar for visual range selection. Uses `DayPicker` from `react-day-picker` directly (not the `calendar.tsx` shadcn wrapper, which has v8 class key assumptions incompatible with the v9 API in `package.json`).

- Two months displayed side by side. On open, shows the month containing `to` on the right and the previous month on the left. Navigable with ‹ › arrows (both months advance together).
- **Selection interaction:**
  - First click sets `pendingFrom`; a hover preview highlights the range as the cursor moves.
  - Second click sets `pendingTo`. If the second click is before `pendingFrom`, the two are swapped automatically (earlier = from, later = to).
  - Clicking the same date twice produces a single-day range (`from == to`, both at the default times below).
  - The calendar operates on local pending state (`pendingFrom`, `pendingTo`); nothing is committed to the store until Apply is pressed.
- Below the calendar, two datetime inputs with full time precision:
  ```
  From  [Mar 1, 2025]  [14:30:00]   →   To  [Mar 23, 2025]  [16:45:00]
  ```
- Time format: HH:MM:SS (24-hour). Default times when a date is first picked on the calendar: `from` defaults to `00:00:00`, `to` defaults to `23:59:59`. Changing dates after editing time inputs preserves the edited times.
- Typing a date directly into the date portion of a text input updates the calendar highlight and scrolls the calendar to show that month.
- **Apply** button calls `applyPreset({ from: pendingFrom, to: pendingTo }, null)` and closes the popover.
- Clicking outside the popover or pressing Escape discards pending state (no store change).
- There is no explicit Cancel button — outside-click / Escape is the abandon gesture.

## Data Model

The `DateRange` type is unchanged: `{ from: Date | null, to: Date | null }`.

The Zustand store gains one field and a combined action:

```ts
presetId: string | null        // stable preset key or null for custom range
applyPreset: (range: DateRange, id: string | null) => void
```

`applyPreset` updates both `dateRange` and `presetId` in a single `set()` call — no transient inconsistency. The existing `setDateRange` action remains for backward compatibility but should not be used for preset application.

`presetId` is added to the `partialize` list so it is persisted to localStorage alongside `dateRange`.

**Null guard:** `from` and `to` are `null` only for "All time". The guard pattern `from ? formatDateParam(from) : undefined` already exists throughout query hooks — no new pattern required.

**`formatDateParam` helper:** Added to `apps/web/frontend/lib/utils.ts`:
```ts
// Returns 'yyyy-MM-dd' for midnight times, 'yyyy-MM-dd\'T\'HH:mm:ss' when time is non-zero
export function formatDateParam(d: Date): string
```

This helper replaces all `format(date, 'yyyy-MM-dd')` call sites throughout the codebase, including in `.tsx` page components, not just hooks. Previous-period derived dates in `useMissionControl` and `useMissionControlTrends` also use this helper.

## Preset Definitions

All 16 presets, their stable `presetId` keys, and `DateRange` values. Week start = **Monday** (`{ weekStartsOn: 1 }` passed to all `date-fns` week helpers). Rolling presets use `startOfDay` for `from` so no wall-clock time leaks into the range. All `date-fns` helpers — no new dependencies.

| Label | presetId | from | to |
|---|---|---|---|
| Today | `today` | startOfDay(now) | endOfDay(now) |
| Yesterday | `yesterday` | startOfDay(subDays(now,1)) | endOfDay(subDays(now,1)) |
| Last 7 days | `7d` | startOfDay(subDays(now,7)) | endOfDay(now) |
| Last 14 days | `14d` | startOfDay(subDays(now,14)) | endOfDay(now) |
| Last 30 days | `30d` | startOfDay(subDays(now,30)) | endOfDay(now) |
| Last 90 days | `90d` | startOfDay(subDays(now,90)) | endOfDay(now) |
| Last 6 months | `6m` | startOfDay(subMonths(now,6)) | endOfDay(now) |
| Last 12 months | `12m` | startOfDay(subMonths(now,12)) | endOfDay(now) |
| This week | `this_week` | startOfWeek(now,{weekStartsOn:1}) | endOfDay(now) |
| Last week | `last_week` | startOfWeek(subWeeks(now,1),{weekStartsOn:1}) | endOfWeek(subWeeks(now,1),{weekStartsOn:1}) |
| This month | `this_month` | startOfMonth(now) | endOfDay(now) |
| Last month | `last_month` | startOfMonth(subMonths(now,1)) | endOfMonth(subMonths(now,1)) |
| This quarter | `this_quarter` | startOfQuarter(now) | endOfDay(now) |
| Last quarter | `last_quarter` | startOfQuarter(subQuarters(now,1)) | endOfQuarter(subQuarters(now,1)) |
| Year to date | `ytd` | startOfYear(now) | endOfDay(now) |
| All time | `all_time` | null | null |

All `endOfDay` calls produce `23:59:59.999`. The display-text rule is keyed on `presetId === null`, so these times never appear in the trigger for preset selections.

## Files Changed

| File | Change |
|---|---|
| `apps/web/frontend/components/DateRangePicker.tsx` | Full replacement |
| `apps/web/frontend/stores/app-store.ts` | Add `presetId`, `applyPreset`, update `partialize` |
| `apps/web/frontend/lib/utils.ts` | Add `formatDateParam` helper |
| All query hooks (`features/*/hooks/use*Data.ts`) | Replace `format(date, 'yyyy-MM-dd')` with `formatDateParam` |
| Page components with direct `format(date, 'yyyy-MM-dd')` calls | Same replacement (includes `FunnelDetailPage.tsx`, `NewPivotPage.tsx`, `PathFunnelDialog.tsx`, `EventsPage.tsx`) |
| `useMissionControl.ts`, `useMissionControlTrends.ts` | Replace previous-period derived `format()` calls with `formatDateParam` |
| `apps/web/frontend/stores/__tests__/app-store.test.ts` | Add tests for `presetId`, `applyPreset`, `partialize` |

`GlobalFilters.tsx` requires no changes.

## Out of Scope

- Backend changes to support sub-day queries (separate concern — `formatDateParam` sends the right format but backend may ignore sub-day precision)
- Keyboard shortcut (⌘K) to open picker
- Timezone selection
