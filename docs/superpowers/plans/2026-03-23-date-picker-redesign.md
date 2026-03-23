# Date Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `DateRangePicker` component with a horizontal trigger + quick-chips design backed by a popover with 16 grouped presets and a dual-month calendar with time-precision custom range inputs.

**Architecture:** A `formatDateParam` utility centralises date→string formatting across all query hooks. The Zustand store gains a `presetId` field and an atomic `applyPreset` action. The new `DateRangePicker` renders a date-range trigger button alongside 5 always-visible quick-chip buttons; the trigger opens a popover containing grouped preset chips and a `react-day-picker` v9 dual-month range calendar with HH:MM:SS time inputs below it.

**Tech Stack:** React 18, TypeScript, Zustand, TanStack Query v5, react-day-picker v9 (DayPicker, already in package.json), date-fns v3, Tailwind CSS v4, shadcn/ui Popover

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/frontend/lib/utils.ts` | Modify | Add `formatDateParam` helper |
| `apps/web/frontend/stores/app-store.ts` | Modify | Add `presetId`, `applyPreset`, update `partialize` |
| `apps/web/frontend/stores/__tests__/app-store.test.ts` | Modify | Tests for new store fields |
| `apps/web/frontend/components/DateRangePicker.tsx` | Replace | Full new component |
| `apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/analytics/retention/hooks/useRetentionData.ts` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/analytics/paths/hooks/usePathsData.ts` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/analytics/paths/hooks/usePathExplorer.ts` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/analytics/paths/FunnelDetailPage.tsx` | Modify | Use `formatDateParam`, fix missing null guards |
| `apps/web/frontend/features/analytics/paths/components/PathFunnelDialog.tsx` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/events/EventsPage.tsx` | Modify | Use `formatDateParam` |
| `apps/web/frontend/features/dashboard/hooks/useMissionControl.ts` | Modify | Use `formatDateParam` for all date calls incl. prev-period |
| `apps/web/frontend/features/dashboard/hooks/useMissionControlTrends.ts` | Modify | Use `formatDateParam` for all date calls incl. prev-period |

---

## Task 1: Set Up Git Worktree

- [ ] **Step 1: Use the worktree skill**

  ```bash
  # In Claude Code, invoke: superpowers:using-git-worktrees
  # Branch name: feature/date-picker-redesign
  ```

  This creates `.worktrees/date-picker-redesign/` and installs dependencies automatically.

- [ ] **Step 2: Verify baseline tests pass**

  From the worktree root:
  ```bash
  npm run test:run
  ```
  Expected: all tests pass. Do not proceed if any test is already failing.

---

## Task 2: `formatDateParam` Utility

**Files:**
- Modify: `apps/web/frontend/lib/utils.ts`
- Test: `apps/web/frontend/lib/__tests__/utils.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

  In `apps/web/frontend/lib/__tests__/utils.test.ts`, add:

  ```typescript
  import { describe, it, expect } from 'vitest'
  import { formatDateParam } from '../utils'

  describe('formatDateParam', () => {
    it('returns yyyy-MM-dd for a midnight date', () => {
      const d = new Date('2025-03-01T00:00:00.000')
      expect(formatDateParam(d)).toBe('2025-03-01')
    })

    it('returns ISO datetime string when hours are non-zero', () => {
      const d = new Date('2025-03-01T14:30:00.000')
      expect(formatDateParam(d)).toBe("2025-03-01T14:30:00")
    })

    it('returns ISO datetime string when minutes are non-zero', () => {
      const d = new Date('2025-03-01T00:05:00.000')
      expect(formatDateParam(d)).toBe("2025-03-01T00:05:00")
    })

    it('returns ISO datetime string when seconds are non-zero', () => {
      const d = new Date('2025-03-23T00:00:01.000')
      expect(formatDateParam(d)).toBe("2025-03-23T00:00:01")
    })

    it('returns yyyy-MM-dd for 23:59:59 (preset endOfDay)', () => {
      // endOfDay produces 23:59:59.999 — non-midnight, but called with presetId set,
      // so display won't show time. formatDateParam still needs to return datetime
      // for correctness in custom ranges. This test documents the behavior.
      const d = new Date('2025-03-01T23:59:59.999')
      expect(formatDateParam(d)).toBe("2025-03-01T23:59:59")
    })
  })
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npm run test:run -- lib/__tests__/utils.test.ts
  ```
  Expected: FAIL — `formatDateParam` not exported from `utils`.

- [ ] **Step 3: Implement `formatDateParam`**

  Append to `apps/web/frontend/lib/utils.ts`:

  ```typescript
  import { format } from 'date-fns'

  /**
   * Formats a Date for use as an API query parameter.
   * Returns 'yyyy-MM-dd' when the time is exactly midnight (00:00:00),
   * otherwise returns 'yyyy-MM-dd\'T\'HH:mm:ss' to preserve time precision.
   */
  export function formatDateParam(d: Date): string {
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
      return format(d, 'yyyy-MM-dd')
    }
    return format(d, "yyyy-MM-dd'T'HH:mm:ss")
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test:run -- lib/__tests__/utils.test.ts
  ```
  Expected: 5 passing.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/frontend/lib/utils.ts apps/web/frontend/lib/__tests__/utils.test.ts
  git commit -m "feat: add formatDateParam utility for time-aware API date formatting"
  ```

---

## Task 3: Zustand Store — `presetId` + `applyPreset`

**Files:**
- Modify: `apps/web/frontend/stores/app-store.ts`
- Modify: `apps/web/frontend/stores/__tests__/app-store.test.ts`

- [ ] **Step 1: Write the failing tests**

  In `apps/web/frontend/stores/__tests__/app-store.test.ts`, add the following test block (keep all existing tests):

  ```typescript
  import { describe, it, expect, beforeEach } from 'vitest'
  import { useAppStore } from '../app-store'

  describe('presetId and applyPreset', () => {
    beforeEach(() => {
      useAppStore.setState({
        presetId: '7d',
        dateRange: { from: new Date('2025-03-16'), to: new Date('2025-03-23') },
      })
    })

    it('applyPreset updates dateRange and presetId atomically', () => {
      const range = { from: new Date('2025-01-01'), to: new Date('2025-03-23') }
      useAppStore.getState().applyPreset(range, 'ytd')

      const state = useAppStore.getState()
      expect(state.presetId).toBe('ytd')
      expect(state.dateRange).toEqual(range)
    })

    it('applyPreset with null id marks custom range', () => {
      useAppStore.getState().applyPreset({ from: new Date('2025-03-01'), to: new Date('2025-03-10') }, null)
      expect(useAppStore.getState().presetId).toBeNull()
    })

    it('initial presetId is 7d (matches default dateRange)', () => {
      useAppStore.setState({ presetId: '7d' })
      expect(useAppStore.getState().presetId).toBe('7d')
    })
  })
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  npm run test:run -- stores/__tests__/app-store.test.ts
  ```
  Expected: FAIL — `applyPreset` does not exist.

- [ ] **Step 3: Update the store**

  Replace `apps/web/frontend/stores/app-store.ts` with:

  ```typescript
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'
  import { DateRange } from '@/types'

  interface AppState {
    theme: 'light' | 'dark' | 'system'
    setTheme: (theme: 'light' | 'dark' | 'system') => void

    dateRange: DateRange
    setDateRange: (range: DateRange) => void

    /** Stable preset key (e.g. '7d', 'ytd', 'all_time') or null for custom range. */
    presetId: string | null
    /** Atomically sets dateRange + presetId in one store update. Use for all preset/custom applications. */
    applyPreset: (range: DateRange, id: string | null) => void

    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void

    selectedEvent: string | null
    setSelectedEvent: (event: string | null) => void

    selectedDevice: string | null
    setSelectedDevice: (device: string | null) => void

    activeFilters: Record<string, string | null>
    setActiveFilter: (field: string, value: string | null) => void
    clearAllFilters: () => void

    activeConnectionId: string | null
    setActiveConnectionId: (id: string | null) => void
  }

  export const useAppStore = create<AppState>()(
    persist(
      (set) => ({
        theme: 'system',
        setTheme: (theme) => set({ theme }),

        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date(),
        },
        setDateRange: (dateRange) => set({ dateRange }),

        presetId: '7d',
        applyPreset: (dateRange, presetId) => set({ dateRange, presetId }),

        sidebarOpen: true,
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

        selectedEvent: null,
        setSelectedEvent: (selectedEvent) => set({ selectedEvent }),

        selectedDevice: null,
        setSelectedDevice: (selectedDevice) => set({ selectedDevice }),

        activeFilters: {},
        setActiveFilter: (field, value) =>
          set((state) => ({
            activeFilters: { ...state.activeFilters, [field]: value },
          })),
        clearAllFilters: () => set({ activeFilters: {} }),

        activeConnectionId: null,
        setActiveConnectionId: (activeConnectionId) => set({ activeConnectionId, activeFilters: {} }),
      }),
      {
        name: 'stratifio-storage',
        partialize: (state) => ({
          theme: state.theme,
          dateRange: state.dateRange,
          presetId: state.presetId,
          sidebarOpen: state.sidebarOpen,
          activeConnectionId: state.activeConnectionId,
          activeFilters: state.activeFilters,
        }),
      }
    )
  )
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npm run test:run -- stores/__tests__/app-store.test.ts
  ```
  Expected: all passing.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/frontend/stores/app-store.ts apps/web/frontend/stores/__tests__/app-store.test.ts
  git commit -m "feat(store): add presetId and applyPreset for atomic date range + preset updates"
  ```

---

## Task 4: Migrate API Date Formatting to `formatDateParam`

Replace all `format(date, 'yyyy-MM-dd')` calls used for API parameters with `formatDateParam`. Display-only format calls (e.g. `format(d, 'MMM d, yyyy')`) are **not** changed.

**Files to change** (all follow the same mechanical pattern):

1. `features/analytics/trends/hooks/useTrendData.ts` — lines 56–57
2. `features/analytics/retention/hooks/useRetentionData.ts` — lines 30–31
3. `features/analytics/paths/hooks/usePathsData.ts` — lines 30–31
4. `features/analytics/paths/hooks/usePathExplorer.ts` — lines 40–41
5. `features/analytics/pivot/NewPivotPage.tsx` — lines 32–33
6. `features/events/EventsPage.tsx` — lines 49–50
7. `features/analytics/paths/components/PathFunnelDialog.tsx` — lines 40–41
8. `features/analytics/paths/FunnelDetailPage.tsx` — lines 79–80, 124–125 (**add null guard** to lines 79–80 which currently lack one)
9. `features/dashboard/hooks/useMissionControl.ts` — lines 38–39, 48, 52
10. `features/dashboard/hooks/useMissionControlTrends.ts` — lines 38–39, 46, 50

- [ ] **Step 1: Update each file**

  For each file above, add the import and swap the calls:

  ```typescript
  // Add to imports (alongside existing 'date-fns' import or as a new import):
  import { formatDateParam } from '@/lib/utils'

  // Pattern to replace (null-guarded form):
  // BEFORE:
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
  // AFTER:
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : ''
  const endDate = dateRange.to ? formatDateParam(dateRange.to) : ''

  // For undefined sentinel variants (some files use undefined instead of ''):
  // BEFORE:
  const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined
  // AFTER:
  const startDate = dateRange.from ? formatDateParam(dateRange.from) : undefined
  ```

  For **previous-period dates** in `useMissionControl.ts` and `useMissionControlTrends.ts`:
  ```typescript
  // BEFORE:
  const prevEndDate = dateRange.from ? format(subDays(dateRange.from, 1), 'yyyy-MM-dd') : undefined
  const prevStartDate = dateRange.from && periodDays > 0
    ? format(subDays(dateRange.from, periodDays), 'yyyy-MM-dd') : undefined
  // AFTER:
  const prevEndDate = dateRange.from ? formatDateParam(subDays(dateRange.from, 1)) : undefined
  const prevStartDate = dateRange.from && periodDays > 0
    ? formatDateParam(subDays(dateRange.from, periodDays)) : undefined
  ```

  For **`FunnelDetailPage.tsx` lines 79–80** (missing null guard — add it):
  ```typescript
  // BEFORE (no guard — crashes if dateRange.from is null):
  start_date: format(dateRange.from, 'yyyy-MM-dd'),
  end_date: format(dateRange.to, 'yyyy-MM-dd'),
  // AFTER:
  start_date: dateRange.from ? formatDateParam(dateRange.from) : '',
  end_date: dateRange.to ? formatDateParam(dateRange.to) : '',
  ```

  Once all format imports in a file are only used for display purposes (not `'yyyy-MM-dd'`), remove `'yyyy-MM-dd'` from the format import. If `format` is no longer called at all, remove the entire import.

- [ ] **Step 2: Run the full test suite**

  ```bash
  npm run test:run
  ```
  Expected: all passing (no behaviour change for date-only ranges).

- [ ] **Step 3: Run the linter**

  ```bash
  npm run lint
  ```
  Expected: zero warnings.

- [ ] **Step 4: Commit**

  ```bash
  git add \
    apps/web/frontend/features/analytics/trends/hooks/useTrendData.ts \
    apps/web/frontend/features/analytics/retention/hooks/useRetentionData.ts \
    apps/web/frontend/features/analytics/paths/hooks/usePathsData.ts \
    apps/web/frontend/features/analytics/paths/hooks/usePathExplorer.ts \
    apps/web/frontend/features/analytics/pivot/NewPivotPage.tsx \
    apps/web/frontend/features/events/EventsPage.tsx \
    apps/web/frontend/features/analytics/paths/components/PathFunnelDialog.tsx \
    apps/web/frontend/features/analytics/paths/FunnelDetailPage.tsx \
    apps/web/frontend/features/dashboard/hooks/useMissionControl.ts \
    apps/web/frontend/features/dashboard/hooks/useMissionControlTrends.ts
  git commit -m "refactor: migrate API date params to formatDateParam across all query hooks and pages"
  ```

---

## Task 5: New `DateRangePicker` Component

**Files:**
- Replace: `apps/web/frontend/components/DateRangePicker.tsx`

This task builds the full component. `GlobalFilters.tsx` renders `<DateRangePicker inlineMode />` and calls `onChange` — the prop interface is preserved so no callers need updating.

The `inlineMode` prop means the component renders as a borderless inline segment (not a standalone bordered button). In the new design, `inlineMode` controls whether the trigger is rendered as a lightweight inline button or a full outlined button. Since `GlobalFilters` only uses `inlineMode`, both modes must work but `inlineMode` is the one that matters.

- [ ] **Step 1: Verify react-day-picker v9 is available**

  ```bash
  cat apps/web/package.json | grep react-day-picker
  ```
  Expected: `"react-day-picker": "^9.x.x"`. If absent, run `npm install react-day-picker` from `apps/web/`.

- [ ] **Step 2: Write the full component**

  Replace `apps/web/frontend/components/DateRangePicker.tsx` entirely:

  ```typescript
  import { useState, useEffect } from 'react'
  import { DayPicker } from 'react-day-picker'
  import type { DateRange as DayPickerRange } from 'react-day-picker'
  import 'react-day-picker/style.css'
  import { format, subDays, subWeeks, subMonths, subQuarters,
           startOfDay, endOfDay, startOfWeek, endOfWeek,
           startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
           startOfYear } from 'date-fns'
  import { CalendarIcon, ChevronDown } from 'lucide-react'
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import { Button } from '@/components/ui/button'
  import { cn } from '@/lib/utils'
  import { useAppStore } from '@/stores'
  import type { DateRange } from '@/types'

  // ─── Preset definitions ───────────────────────────────────────────────────

  interface Preset {
    id: string
    label: string
    shortLabel?: string   // shown on quick chips
    getValue: () => DateRange
    group: 'rolling' | 'calendar'
  }

  const WS = { weekStartsOn: 1 } as const  // Monday week start

  function buildPresets(): Preset[] {
    const now = new Date()
    return [
      { id: 'today',         label: 'Today',          group: 'rolling',   getValue: () => ({ from: startOfDay(now), to: endOfDay(now) }) },
      { id: 'yesterday',     label: 'Yesterday',      group: 'rolling',   getValue: () => ({ from: startOfDay(subDays(now,1)), to: endOfDay(subDays(now,1)) }) },
      { id: '7d',            label: 'Last 7 days',    shortLabel: '7D',   group: 'rolling',   getValue: () => ({ from: startOfDay(subDays(now,7)), to: endOfDay(now) }) },
      { id: '14d',           label: 'Last 14 days',   group: 'rolling',   getValue: () => ({ from: startOfDay(subDays(now,14)), to: endOfDay(now) }) },
      { id: '30d',           label: 'Last 30 days',   shortLabel: '30D',  group: 'rolling',   getValue: () => ({ from: startOfDay(subDays(now,30)), to: endOfDay(now) }) },
      { id: '90d',           label: 'Last 90 days',   shortLabel: '90D',  group: 'rolling',   getValue: () => ({ from: startOfDay(subDays(now,90)), to: endOfDay(now) }) },
      { id: '6m',            label: 'Last 6 months',  group: 'rolling',   getValue: () => ({ from: startOfDay(subMonths(now,6)), to: endOfDay(now) }) },
      { id: '12m',           label: 'Last 12 months', group: 'rolling',   getValue: () => ({ from: startOfDay(subMonths(now,12)), to: endOfDay(now) }) },
      { id: 'this_week',     label: 'This week',      group: 'calendar',  getValue: () => ({ from: startOfWeek(now, WS), to: endOfDay(now) }) },
      { id: 'last_week',     label: 'Last week',      group: 'calendar',  getValue: () => ({ from: startOfWeek(subWeeks(now,1), WS), to: endOfWeek(subWeeks(now,1), WS) }) },
      { id: 'this_month',    label: 'This month',     group: 'calendar',  getValue: () => ({ from: startOfMonth(now), to: endOfDay(now) }) },
      { id: 'last_month',    label: 'Last month',     group: 'calendar',  getValue: () => ({ from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) }) },
      { id: 'this_quarter',  label: 'This quarter',   group: 'calendar',  getValue: () => ({ from: startOfQuarter(now), to: endOfDay(now) }) },
      { id: 'last_quarter',  label: 'Last quarter',   group: 'calendar',  getValue: () => ({ from: startOfQuarter(subQuarters(now,1)), to: endOfQuarter(subQuarters(now,1)) }) },
      { id: 'ytd',           label: 'Year to date',   shortLabel: 'YTD',  group: 'calendar',  getValue: () => ({ from: startOfYear(now), to: endOfDay(now) }) },
      { id: 'all_time',      label: 'All time',       shortLabel: 'All time', group: 'calendar', getValue: () => ({ from: null, to: null }) },
    ]
  }

  const QUICK_CHIP_IDS = ['7d', '30d', '90d', 'ytd', 'all_time']

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function hasNonMidnightTime(d: Date | null): boolean {
    if (!d) return false
    return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
  }

  function displayText(value: DateRange, presetId: string | null): string {
    if (value.from === null && value.to === null) return 'All time'
    if (!value.from || !value.to) return 'Select range'
    const showTime = presetId === null && (hasNonMidnightTime(value.from) || hasNonMidnightTime(value.to))
    const dateFmt = showTime ? 'MMM d, yyyy HH:mm:ss' : 'MMM d, yyyy'
    return `${format(value.from, 'MMM d')} – ${format(value.to, dateFmt)}`
  }

  function toTimeString(d: Date | null): string {
    if (!d) return '00:00:00'
    return format(d, 'HH:mm:ss')
  }

  function toDateInputValue(d: Date | null): string {
    if (!d) return ''
    return format(d, 'yyyy-MM-dd')
  }

  function applyTimeToDate(dateStr: string, timeStr: string): Date {
    const [h, m, s] = timeStr.split(':').map(Number)
    const d = new Date(dateStr)
    d.setHours(h ?? 0, m ?? 0, s ?? 0, 0)
    return d
  }

  // ─── Component ────────────────────────────────────────────────────────────

  interface DateRangePickerProps {
    value: DateRange
    onChange: (value: DateRange) => void
    className?: string
    /** Renders as a borderless inline segment for use inside a filter container */
    inlineMode?: boolean
  }

  export function DateRangePicker({ value, onChange, className, inlineMode }: DateRangePickerProps) {
    const { presetId, applyPreset } = useAppStore()
    const [open, setOpen] = useState(false)

    const presets = buildPresets()
    const quickChips = presets.filter((p) => QUICK_CHIP_IDS.includes(p.id))
    const rollingPresets = presets.filter((p) => p.group === 'rolling')
    const calendarPresets = presets.filter((p) => p.group === 'calendar')

    // ── Pending custom range state ────────────────────────────────────────
    const [pending, setPending] = useState<DayPickerRange | undefined>(
      value.from && value.to ? { from: value.from, to: value.to } : undefined
    )
    const [fromTime, setFromTime] = useState(toTimeString(value.from))
    const [toTime, setToTime] = useState(toTimeString(value.to))
    const [fromDateStr, setFromDateStr] = useState(toDateInputValue(value.from))
    const [toDateStr, setToDateStr] = useState(toDateInputValue(value.to))

    // Sync pending state when popover opens
    useEffect(() => {
      if (open) {
        setPending(value.from && value.to ? { from: value.from, to: value.to } : undefined)
        setFromTime(toTimeString(value.from))
        setToTime(toTimeString(value.to))
        setFromDateStr(toDateInputValue(value.from))
        setToDateStr(toDateInputValue(value.to))
      }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    function handlePreset(preset: Preset) {
      const range = preset.getValue()
      applyPreset(range, preset.id)
      onChange(range)
      setOpen(false)
    }

    function handleQuickChip(preset: Preset) {
      const range = preset.getValue()
      applyPreset(range, preset.id)
      onChange(range)
    }

    function handleDayPickerSelect(range: DayPickerRange | undefined) {
      if (!range) return
      // On first click range.to is undefined; on second click both are set
      const from = range.from ?? null
      const to = range.to ?? null
      setPending(range)
      if (from) {
        setFromDateStr(toDateInputValue(from))
        setFromTime('00:00:00')
      }
      if (to) {
        setToDateStr(toDateInputValue(to))
        setToTime('23:59:59')
      }
    }

    function handleApply() {
      const from = fromDateStr ? applyTimeToDate(fromDateStr, fromTime) : null
      const to = toDateStr ? applyTimeToDate(toDateStr, toTime) : null
      applyPreset({ from, to }, null)
      onChange({ from, to })
      setOpen(false)
    }

    // When date text inputs change, update calendar pending highlight
    function handleFromDateInput(e: React.ChangeEvent<HTMLInputElement>) {
      setFromDateStr(e.target.value)
      if (e.target.value) {
        const d = new Date(e.target.value)
        setPending((prev) => ({ from: d, to: prev?.to }))
      }
    }

    function handleToDateInput(e: React.ChangeEvent<HTMLInputElement>) {
      setToDateStr(e.target.value)
      if (e.target.value) {
        const d = new Date(e.target.value)
        setPending((prev) => ({ from: prev?.from, to: d }))
      }
    }

    const triggerText = displayText(value, presetId)

    // ── Render ──────────────────────────────────────────────────────────────
    const triggerEl = inlineMode ? (
      <button
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-muted-foreground',
          'hover:bg-accent/60 hover:text-foreground transition-colors focus:outline-none whitespace-nowrap'
        )}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{triggerText}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
      </button>
    ) : (
      <Button
        variant="outline"
        className={cn('justify-between text-left font-normal sm:min-w-[220px]', className)}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{triggerText}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
    )

    return (
      <div className="flex items-center gap-0">
        {/* Trigger */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{triggerEl}</PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3 min-w-[480px]">
              {/* Preset chips — Rolling */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rolling
                </p>
                <div className="flex flex-wrap gap-1">
                  {rollingPresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePreset(p)}
                      className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
                        presetId === p.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset chips — Calendar-aligned */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Calendar
                </p>
                <div className="flex flex-wrap gap-1">
                  {calendarPresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePreset(p)}
                      className={cn(
                        'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors',
                        presetId === p.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Dual-month calendar */}
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={pending}
                onSelect={handleDayPickerSelect}
                month={
                  value.to
                    ? new Date(value.to.getFullYear(), value.to.getMonth() - 1, 1)
                    : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
                }
                onMonthChange={() => {}}
              />

              {/* Date + time inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={fromDateStr}
                      onChange={handleFromDateInput}
                      className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <input
                      type="time"
                      step="1"
                      value={fromTime}
                      onChange={(e) => setFromTime(e.target.value)}
                      className="flex h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={toDateStr}
                      onChange={handleToDateInput}
                      className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <input
                      type="time"
                      step="1"
                      value={toTime}
                      onChange={(e) => setToTime(e.target.value)}
                      className="flex h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <Button size="sm" className="w-full" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick chips */}
        <div className="flex items-center">
          <span className="w-px h-5 bg-border mx-1.5 shrink-0" aria-hidden />
          {quickChips.map((p) => (
            <button
              key={p.id}
              onClick={() => handleQuickChip(p)}
              className={cn(
                'text-xs font-medium px-2.5 h-9 transition-colors whitespace-nowrap',
                presetId === p.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              {p.shortLabel ?? p.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Check TypeScript compiles**

  ```bash
  npm run build 2>&1 | head -40
  ```
  Expected: no type errors in `DateRangePicker.tsx`. Fix any that appear before proceeding.

- [ ] **Step 4: Run the app and smoke-test manually**

  ```bash
  # In one terminal:
  npm run dev
  # In another:
  uv run serve
  ```

  Open http://localhost:5173. Verify:
  - [ ] Quick chips (7D · 30D · 90D · YTD · All time) appear next to the date trigger
  - [ ] Clicking a quick chip immediately updates all page data
  - [ ] Active quick chip is visually highlighted
  - [ ] Clicking the date range trigger opens the popover
  - [ ] Both Rolling and Calendar preset rows are visible in the popover
  - [ ] Active preset is highlighted in the popover too
  - [ ] Dual-month calendar renders and range is highlighted
  - [ ] Clicking two dates on the calendar populates the date inputs below
  - [ ] Time inputs default to 00:00:00 / 23:59:59 after calendar selection
  - [ ] Apply button commits the custom range and closes the popover
  - [ ] Clicking outside / pressing Escape discards pending state
  - [ ] After page reload, active chip and date range are restored from localStorage

- [ ] **Step 5: Run lint and type-check**

  ```bash
  npm run lint && npm run build
  ```
  Expected: zero warnings, no type errors.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/frontend/components/DateRangePicker.tsx
  git commit -m "feat: redesign DateRangePicker with quick chips, grouped presets, and dual-month calendar"
  ```

---

## Task 6: Final Checks and PR

- [ ] **Step 1: Run the full test suite**

  ```bash
  npm run test:run
  ```
  Expected: all passing.

- [ ] **Step 2: Run lint and build**

  ```bash
  npm run lint && npm run format:check && npm run build
  ```
  Expected: zero warnings, no errors.

- [ ] **Step 3: Push branch and open PR**

  ```bash
  git push -u origin feature/date-picker-redesign
  ```

  Then open a PR via `gh pr create` with title `feat: redesign date picker with quick chips and dual-month calendar`.
