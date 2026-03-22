# Mission Control — Frontend Redesign Spec

**Date:** 2026-03-22

## Goal

Replace the current `DashboardPage` metric cards + chart layout with a WoW-quality Mission Control view: a hero KPI card on the left with a large area chart, and a categorized 2-column mini-grid of 7 supporting cards on the right. Every card shows the period-over-period % change and a real sparkline. Clicking any supporting card promotes it to the hero slot.

---

## Design Decisions (approved)

- **Card style:** Metric + Sparkline — value, % change vs previous period, mini sparkline inline
- **Layout:** Hero card (left column, wider) + categorized 2-column mini-grid (right column)
- **Categories in right column:**
  - **Volume** — Unique Users, Sessions
  - **Engagement** — Avg Session Duration, Events/Session
  - **Acquisition** — New Users, Returning Users
  - **Stickiness** — DAU/MAU (spans full width of the 2-col grid, it's a ratio not a count)
- **Default hero:** Total Events
- **Promote-to-hero:** clicking any supporting card promotes it; the previous hero swaps to the corresponding position in the grid
- **Sparkline data:** real data for all 8 metrics — 8 parallel `fetchMissionControlTrend` queries at page load; TanStack Query caches and deduplicates automatically

---

## Metrics Reference

| Metric key | Label | Category | Format |
|---|---|---|---|
| `total_events` | Total Events | (hero default) | `1.24M` |
| `unique_users` | Unique Users | Volume | `48.2K` |
| `total_sessions` | Sessions | Volume | `89.7K` |
| `avg_session_duration_sec` | Avg Session | Engagement | `2m 22s` |
| `avg_events_per_session` | Events / Session | Engagement | `13.8` |
| `new_users` | New Users | Acquisition | `12.4K` |
| `returning_users` | Returning Users | Acquisition | `35.8K` |
| `dau_mau_ratio` | DAU / MAU | Stickiness | `34.0%` |

**% change computation** (frontend, from `data.current.*` and `data.previous.*`):
```
pct = ((current - previous) / previous) * 100
```
Return `null` if `previous === 0` (display `—` instead of a %).

---

## Component Architecture

### New files

| File | Purpose |
|---|---|
| `features/dashboard/components/HeroMetricCard.tsx` | Large left card: big number, % badge, area chart |
| `features/dashboard/components/MiniMetricCard.tsx` | Small right-column card: label, number, % change, sparkline |
| `features/dashboard/components/MissionControlGrid.tsx` | Two-column layout: hero + categorized mini-grid |
| `features/dashboard/hooks/useMissionControlTrends.ts` | 8 parallel trend queries; returns `{ trends, trendsLoading }` |

### Modified files

| File | Change |
|---|---|
| `features/dashboard/DashboardPage.tsx` | Replace metric cards + ActivityChart with `<MissionControlGrid>` |
| `features/dashboard/hooks/useMissionControl.ts` | Remove `trendMetric` param (trends moved to `useMissionControlTrends`); keep aggregate query only |

### Removed files

| File | Why |
|---|---|
| `features/dashboard/components/ActivityChart.tsx` | Replaced by `HeroMetricCard`'s inline chart |
| `features/dashboard/components/MetricCard.tsx` | Replaced by `HeroMetricCard` and `MiniMetricCard` |

> Before deleting, verify nothing outside `DashboardPage.tsx` imports `ActivityChart` or `MetricCard`. If other pages import them, move instead of delete.

---

## Component Specs

### `useMissionControlTrends`

Fires all 8 trend queries in parallel. Returns a map from metric key to `{ values: number[], loading: boolean }`.

```typescript
// Signature
export function useMissionControlTrends(opts: {
  dateRange: DateRange
}): {
  trends: Record<string, { values: number[]; loading: boolean }>
}
```

Implementation: 8 unconditional `useQuery` calls (Rules of Hooks). Each reads `activeFilters` and `activeConnectionId` from `useAppStore()` internally, and derives `startDate`/`endDate` from `dateRange.from`/`dateRange.to` using `format(date, 'yyyy-MM-dd')` — exactly as `useMissionControl` does. Full query key shape (must match existing trend queries for cache coherence):

```typescript
queryKey: ['missionControlTrend', metric, startDate, endDate, activeFilters, activeConnectionId]
```

Each query is `enabled: !!activeConnectionId && !!startDate && !!endDate`. The `values` array is `.data.data.map(d => d.value)` — a plain `number[]` for `SparklineChart`.

---

### `MiniMetricCard`

```typescript
interface MiniMetricCardProps {
  label: string
  value: string           // formatted string (e.g. "48.2K", "2m 22s", "34.0%")
  pctChange: number | null  // null → show "—"
  sparklineValues: number[]
  color: string           // CSS color string for sparkline stroke
  isHero?: boolean        // true → highlight border (selected state)
  onClick?: () => void
  loading?: boolean
}
```

**Visual spec:**
- Border: `border border-border rounded-xl` normally; when `isHero`: `border-2 border-primary`
- Padding: `p-3`
- Label: `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`
- Value: `text-lg font-bold tracking-tight` (or `text-base` if label is long)
- % change: small badge — green (`text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40`) for positive, red for negative, gray for null
- Sparkline: `SparklineChart` with `width={60} height={24} showArea={false} strokeWidth={1.5}`, color from prop
- Hover: `cursor-pointer hover:border-primary/50 transition-colors`
- Loading: skeleton via `animate-pulse` on value and sparkline areas

**DAU/MAU special case:** spans 2 columns (`col-span-2`) in the mini-grid, wider sparkline (`width={100}`).

---

### `HeroMetricCard`

```typescript
interface HeroMetricCardProps {
  label: string
  value: string
  pctChange: number | null
  previousValue: string    // formatted, shown as "prev: 1.10M"
  sparklineValues: number[]
  color: string
  loading?: boolean
}
```

**Visual spec:**
- Full height of the right column, `flex flex-col`
- Background: subtle tint matching `color` at low opacity (`bg-[color]/5`), `border border-[color]/30 rounded-2xl`
- Label: same style as `MiniMetricCard` but in accent color
- Value: `text-4xl font-extrabold tracking-tight`
- % change: larger badge — same semantic colors, `text-sm font-bold`
- Previous value: `text-xs text-muted-foreground mt-1` — "prev: {previousValue}"
- Chart: Recharts `AreaChart` (reuse `area-chart.tsx` pattern), fills remaining vertical space, no axes/grid, just the area shape with a subtle gradient. Color uses the same `color` prop.
- Loading: full card skeleton

---

### `MissionControlGrid`

```typescript
interface MissionControlGridProps {
  data: MissionControlResponse | undefined
  trends: Record<string, { values: number[]; loading: boolean }>
  isLoading: boolean
}
```

Orchestrates the two-column layout. Owns the `heroMetric` state (defaults to `'total_events'`).

```typescript
// State
const [heroMetric, setHeroMetric] = useState<string>('total_events')
```

**Layout:** `grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4`

**Right column structure:**
```
<div class="flex flex-col gap-4">
  <CategorySection label="Volume">      {/* Unique Users, Sessions */}
  <CategorySection label="Engagement">  {/* Avg Session, Events/Session */}
  <CategorySection label="Acquisition">{/* New Users, Returning */}
  <CategorySection label="Stickiness"> {/* DAU/MAU (col-span-2) */}
</div>
```

`CategorySection`: renders a label (`text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5`) and a `grid grid-cols-2 gap-2` containing the mini cards.

When a mini card is clicked:
1. `setHeroMetric(clickedMetric)` — hero swaps immediately (data already cached)
2. The clicked card gets `isHero={true}` styling

---

## Sparkline Colors

Each metric has a consistent color derived from `CHART_COLORS.series`:

| Metric | Color index |
|---|---|
| `total_events` | 0 (`--chart-1`) |
| `unique_users` | 1 (`--chart-2`) |
| `total_sessions` | 2 (`--chart-3`) |
| `avg_session_duration_sec` | 3 (`--chart-4`) |
| `avg_events_per_session` | 4 (`--chart-5`) |
| `new_users` | 1 (`--chart-2`) |
| `returning_users` | 0 (`--chart-1`) |
| `dau_mau_ratio` | 4 (`--chart-5`) |

---

## Value Formatting

All formatting happens in a shared utility `formatMetricValue(metric: string, value: number): string`:

```typescript
// in apps/web/frontend/lib/format-metric.ts
export function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'avg_session_duration_sec':
      return formatDuration(value)           // "2m 22s"
    case 'dau_mau_ratio':
      return `${(value * 100).toFixed(1)}%`  // "34.0%" (one decimal place always shown)
    case 'avg_events_per_session':
      return value.toFixed(1)               // "13.8"
    default:
      return formatCompactNumber(value)      // "1.24M", "48.2K"
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`
  return n.toLocaleString()
}
```

---

## DashboardPage Changes

- Remove `trendMetric: 'total_events'` param from `useMissionControl` call
- Add `useMissionControlTrends({ dateRange })`
- Replace the metric cards + chart JSX with `<MissionControlGrid data={data} trends={trends} ... />`
- Keep `TopEvents` section below the grid (unchanged)
- Keep `DashboardFirstRun` and connection-not-found handling (unchanged)

---

## useMissionControl Changes

- Remove the `trendMetric` option and the trend `useQuery` block entirely
- Return type simplifies: drop `trendData` and `trendLoading` fields
- Keep aggregate query and top events query unchanged

---

## File Changes Summary

| File | Action |
|---|---|
| `features/dashboard/hooks/useMissionControlTrends.ts` | Create |
| `features/dashboard/components/HeroMetricCard.tsx` | Create |
| `features/dashboard/components/MiniMetricCard.tsx` | Create |
| `features/dashboard/components/MissionControlGrid.tsx` | Create |
| `apps/web/frontend/lib/format-metric.ts` | Create |
| `features/dashboard/DashboardPage.tsx` | Modify |
| `features/dashboard/hooks/useMissionControl.ts` | Modify (remove trend query) |
| `features/dashboard/components/ActivityChart.tsx` | Delete (verify no other imports first) |
| `features/dashboard/components/MetricCard.tsx` | Delete (verify no other imports first) |

---

## Out of Scope

- Dark-mode-specific color overrides (Tailwind's `dark:` variants handle this automatically via CSS custom properties)
- Mobile layout (responsive grid collapses `lg:grid-cols-[1.5fr_1fr]` to single column automatically)
- Animated chart transitions on hero swap (could be a follow-up)
- TopEvents redesign
