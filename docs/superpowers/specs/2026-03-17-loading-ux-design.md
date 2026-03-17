# Loading UX Improvement Design

**Date:** 2026-03-17
**Status:** Approved

## Problem

The frontend shows a jarring loading experience on initial page load:
1. Skeletons flash briefly even for fast loads (< 200ms), looking like a glitch
2. The skeleton → content swap is abrupt with no transition

## Approach

Three complementary techniques applied together:

- **C — Skip skeletons on dashboard, animate content in:** Dashboard components render their full layout immediately (stable structure), with dimmed placeholder values. When data arrives, values animate in (count-up for metrics, fade for charts/lists).
- **A — Deferred skeleton + fade-in for other pages:** Non-dashboard pages (Trends, Retention, Paths, PathsExplorer, Events, Sessions, Connections) keep their skeletons but only show them after a 200ms delay. Fast loads never show a skeleton. The skeleton → content swap uses a CSS fade-in.
- **B — Stale-while-revalidate on all hooks:** Add `staleTime: 5 * 60 * 1000` (5 minutes) to all TanStack Query hooks. Revisiting a page shows cached data instantly with a background refetch — no skeleton at all.

## Components

### `useDeferredLoading(isLoading, delay?)` hook

**File:** `src/hooks/useDeferredLoading.ts`

```ts
export function useDeferredLoading(isLoading: boolean, delay = 200): boolean
```

Returns `false` for the first `delay` ms even if `isLoading` is true. Once the delay passes, it mirrors `isLoading` exactly.

Implementation notes:
- Uses `useEffect` with a `setTimeout` internally. Must cancel the timer in the cleanup function to avoid calling setState on an unmounted component.
- **Only wraps `isLoading`, never `isFetching`.** On stale-while-revalidate revisits, `isLoading` is `false` (cached data is returned immediately) so no skeleton ever shows. This is intentional. Background refetches (`isFetching: true`) have no visual indicator — consistent with the stale-while-revalidate philosophy.
- The `EventsPage` currently passes `isLoading || isFetching` to loading props in some places; only the `isLoading` portion should be wrapped with `useDeferredLoading`.

### Dashboard components (Approach C)

**`MetricCard`** — Remove `MetricCardSkeleton`. Replace the `loading ? <MetricCardSkeleton /> : <content>` branch with a single layout that is always rendered, dimmed when loading:

- Render the card at `opacity-50` when `loading`, `opacity-100` otherwise (CSS transition).
- Show `—` as the value placeholder when `loading`.
- **Count-up interaction:** The existing `useCountUp` hook animates from 0 to `numericValue`. Since `useDashboardMetrics` initializes `totalEvents`, `uniqueUsers`, `totalSessions` all to `0`, the count-up will fire `0→0` immediately on mount and then `0→realValue` when data arrives. To prevent the double-animation, pass `numericValue` to `useCountUp` only when `!loading` — pass `0` with `animate: false` (or equivalent) while loading, then switch to the real value once data is available. The count-up should only fire once, when loading transitions from true to false.

**`ActivityChart`** — Remove `<Skeleton className="h-[300px]" />`. When `loading`:
- Render a plain grey rectangle placeholder (`h-[300px] bg-muted rounded-md opacity-30`) instead of the Recharts component. This avoids the "broken empty axes" look that `<LineChartComponent data={[]} />` produces (visible axis chrome, tick marks).
- When `loading` flips to false, swap to the real chart wrapped in a `motion.div` that fades from `opacity-0` to `opacity-100` over 300ms (matching the existing `duration-300` used elsewhere in the dashboard).

**`TopEvents`** — Remove the skeleton rows. The component has three branches: `loading`, `events.length === 0` (empty state), and the list. Keep the empty-state branch unchanged. Replace the `loading` branch:
- Show 5 placeholder rows at a fixed height. Placeholder rows must be visually distinct from real content: use `bg-muted/40` background with no rank number or event name text (just a dimmed bar shape). This distinguishes them from the empty state message.
- When data arrives and `events.length > 0`, render items with framer-motion staggered fade-slide-in (opacity 0→1, y 8→0, 200ms duration, 40ms stagger between items). framer-motion is already in the stack.
- When data arrives and `events.length === 0`, render the existing empty state as-is (no animation needed).

### Non-dashboard pages (Approach A)

Pages: `TrendsPage`, `RetentionPage`, `PathsPage`, `PathsExplorerPage`, `EventsPage`, `SessionsPage`, `ConnectionsPage`, `ConnectionDetailPage`.

For each page:
1. Import `useDeferredLoading` and replace the skeleton gate:
   ```ts
   // Before
   if (isLoading) return <ChartSkeleton />
   // After
   const showSkeleton = useDeferredLoading(isLoading)
   if (showSkeleton) return <ChartSkeleton />
   ```
2. Wrap the content return in a `motion.div` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` at **200ms duration** (intentionally shorter than the 300ms used on individual MetricCards, since this is a page-level fade not a card entrance).

### All data hooks (Approach B)

Add `staleTime: 5 * 60 * 1000` to every `useQuery` call across all feature hooks:

- `useDashboardMetrics` — 4 queries (trend, topEvents, conversion, sessionsSummary)
- `useTrendData`
- `useRetentionData`
- `usePathsData` / `usePathExplorer`
- `useConnectionsData` — `useConnections` and `useConnection` (covers both `ConnectionsPage` and `ConnectionDetailPage`)
- **`EventsPage`** — contains two inline `useQuery` calls (not in a `hooks/` file). Add `staleTime` directly to these inline queries without extracting them into a separate hook (keep the change minimal).
- Sessions hooks

## Data Flow

No data flow changes. All hooks continue to return `isLoading`, `isError`, `error`. The change is purely in how the UI responds to the loading state.

## Error Handling

No changes to error handling. `QueryError` continues to render on `isError`. Error states are unaffected by the deferred loading or stale-time changes.

## Animation Consistency

- Dashboard content fades: 300ms (matches existing `motion-safe:duration-300` on MetricCard)
- Page-level content fades (non-dashboard): 200ms (page swap is faster than card entrance)
- TopEvents stagger: 200ms per item, 40ms delay between items

## Out of Scope

- Progress indicators for slow queries (separate concern)
- Changes to the `PageLoader` Suspense fallback
- Funnel / Pivot pages (less frequently visited, lower priority)
- Extracting `EventsPage` inline queries into a dedicated hook file
