# Loading UX Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate skeleton flash on fast loads and make skeleton→content transitions smooth, using three complementary techniques: deferred skeletons, stale-while-revalidate caching, and layout-stable dashboard components.

**Architecture:** (A) A `useDeferredLoading` hook delays skeleton display by 200ms so sub-200ms loads never flash. (B) `staleTime: 5min` on all queries shows cached data instantly on revisit. (C) Dashboard components render stable layouts immediately and animate values in when data arrives.

**Tech Stack:** React 18, TanStack Query v5, framer-motion, Tailwind CSS v4, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-17-loading-ux-design.md`

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Create | `frontend/hooks/useDeferredLoading.ts` | New deferred loading hook |
| Modify | `frontend/hooks/index.ts` | Export new hook |
| Modify | `frontend/features/dashboard/components/MetricCard.tsx` | Remove skeleton, dim card while loading, fix count-up |
| Modify | `frontend/features/dashboard/components/ActivityChart.tsx` | Replace skeleton with dimmed placeholder, fade chart in |
| Modify | `frontend/features/dashboard/components/TopEvents.tsx` | Replace skeleton rows with dimmed placeholders, stagger animate items |
| Modify | `frontend/features/dashboard/hooks/useDashboardMetrics.ts` | Add staleTime to 4 queries |
| Modify | `frontend/features/analytics/trends/hooks/useTrendData.ts` | Add staleTime to queries |
| Modify | `frontend/features/analytics/retention/hooks/useRetentionData.ts` | Add staleTime |
| Modify | `frontend/features/analytics/paths/hooks/usePathsData.ts` | Add staleTime |
| Modify | `frontend/features/analytics/paths/hooks/usePathExplorer.ts` | Add staleTime |
| Modify | `frontend/features/connections/hooks/useConnectionsData.ts` | Add staleTime |
| Modify | `frontend/features/analytics/trends/TrendsPage.tsx` | Deferred skeleton + fade-in content |
| Modify | `frontend/features/analytics/retention/RetentionPage.tsx` | Deferred skeleton + fade-in content |
| Modify | `frontend/features/analytics/paths/PathsPage.tsx` | Deferred skeleton + fade-in content |
| Modify | `frontend/features/analytics/paths/PathsExplorerPage.tsx` | Deferred skeleton + fade-in content |
| Modify | `frontend/features/events/EventsPage.tsx` | Deferred skeleton + staleTime on inline queries |
| Modify | `frontend/features/connections/ConnectionsPage.tsx` (via ConnectionList) | Deferred skeleton |
| Modify | `frontend/features/connections/ConnectionDetailPage.tsx` | Deferred skeleton |
| Modify | `frontend/pages/SessionsPage.tsx` | Deferred skeleton + staleTime on inline query |

---

## Chunk 1: useDeferredLoading hook + staleTime on all hooks

### Task 1: Create `useDeferredLoading` hook

**Files:**
- Create: `frontend/hooks/useDeferredLoading.ts`
- Modify: `frontend/hooks/index.ts`

- [ ] **Step 1: Write the hook**

```ts
// frontend/hooks/useDeferredLoading.ts
import { useEffect, useState } from 'react'

/**
 * Returns false for the first `delay` ms even when isLoading is true.
 * Prevents skeleton flash on fast loads (< delay ms).
 *
 * Only pass `isLoading` here — never `isFetching`. Background refetches
 * during stale-while-revalidate intentionally have no visual indicator.
 */
export function useDeferredLoading(isLoading: boolean, delay = 200): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setShow(false)
      return
    }
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [isLoading, delay])

  return show
}
```

- [ ] **Step 2: Export from hooks index**

In `frontend/hooks/index.ts`, add:
```ts
export { useDeferredLoading } from './useDeferredLoading'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/carlo/my_work/openflow/openflow-oss && npm run build 2>&1 | head -30
```
Expected: no errors related to `useDeferredLoading`.

- [ ] **Step 4: Commit**

```bash
git add frontend/hooks/useDeferredLoading.ts frontend/hooks/index.ts
git commit -m "feat: add useDeferredLoading hook to prevent skeleton flash"
```

---

### Task 2: Add `staleTime` to `useDashboardMetrics`

**Files:**
- Modify: `frontend/features/dashboard/hooks/useDashboardMetrics.ts`

The file has 4 `useQuery` calls. Add `staleTime: 5 * 60 * 1000` to each one.

- [ ] **Step 1: Add staleTime to all 4 queries**

In `useDashboardMetrics.ts`, each `useQuery` block already has an `enabled: !!activeConnectionId` option. Add `staleTime` alongside it. Example for the trend query (apply the same pattern to topEvents, conversion, sessionsSummary):

```ts
const { data: currentTrend, isLoading: currentLoading, isError, error } = useQuery({
  queryKey: ['trend', startDate, endDate, activeFilters, activeConnectionId],
  queryFn: () => fetchTrend({ ... }),
  enabled: !!activeConnectionId,
  staleTime: 5 * 60 * 1000,
})
```

Apply identically to the `topEventsData`, `conversion`, and `sessionsSummary` queries.

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/features/dashboard/hooks/useDashboardMetrics.ts
git commit -m "perf: add staleTime to dashboard queries for instant revisits"
```

---

### Task 3: Add `staleTime` to analytics and connection hooks

**Files:**
- Modify: `frontend/features/analytics/trends/hooks/useTrendData.ts`
- Modify: `frontend/features/analytics/retention/hooks/useRetentionData.ts`
- Modify: `frontend/features/analytics/paths/hooks/usePathsData.ts`
- Modify: `frontend/features/analytics/paths/hooks/usePathExplorer.ts`
- Modify: `frontend/features/connections/hooks/useConnectionsData.ts`

For each file, find all `useQuery` calls and add `staleTime: 5 * 60 * 1000` as an option. These files may have 1–3 queries each. The pattern is the same in all cases — no logic changes, just add the option.

- [ ] **Step 1: Add staleTime to each hook file**

Open each file, find every `useQuery({...})` call, add:
```ts
staleTime: 5 * 60 * 1000,
```
as a sibling to `queryKey` and `queryFn`.

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add \
  frontend/features/analytics/trends/hooks/useTrendData.ts \
  frontend/features/analytics/retention/hooks/useRetentionData.ts \
  frontend/features/analytics/paths/hooks/usePathsData.ts \
  frontend/features/analytics/paths/hooks/usePathExplorer.ts \
  frontend/features/connections/hooks/useConnectionsData.ts
git commit -m "perf: add staleTime to analytics and connection hooks"
```

---

### Task 4: Add `staleTime` to inline queries in `EventsPage` and `SessionsPage`

**Files:**
- Modify: `frontend/features/events/EventsPage.tsx` (2 inline `useQuery` calls at lines ~47 and ~62)
- Modify: `frontend/pages/SessionsPage.tsx` (1 inline `useQuery` call at line ~26)

These pages use `useQuery` directly in the component rather than in a dedicated hook file. Add `staleTime: 5 * 60 * 1000` to each.

- [ ] **Step 1: Add staleTime to EventsPage inline queries**

In `EventsPage.tsx`, find the two `useQuery` calls and add `staleTime: 5 * 60 * 1000` to each. Do not extract them into a hook — just add the option in place.

- [ ] **Step 2: Add staleTime to SessionsPage inline query**

In `SessionsPage.tsx`, find the `useQuery` call at line ~26 and add `staleTime: 5 * 60 * 1000`.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/features/events/EventsPage.tsx frontend/pages/SessionsPage.tsx
git commit -m "perf: add staleTime to inline queries in EventsPage and SessionsPage"
```

---

## Chunk 2: Dashboard component animations (Approach C)

### Task 5: Refactor `MetricCard` — remove skeleton, dim while loading

**Files:**
- Modify: `frontend/features/dashboard/components/MetricCard.tsx`

**Current behavior:** When `loading` is true, renders `<MetricCardSkeleton />` instead of content.

**New behavior:**
- Card is always rendered (no branch for skeleton).
- Card body dims to `opacity-50` when `loading`, fades to `opacity-100` when done.
- Value shows `—` while loading; shows animated count-up once loading is false.
- The `useCountUp` hook is called with `0` while loading so it does not animate during load. When `loading` flips to false, `numericValue` is passed in and the count-up animates once from 0 to the real value.

- [ ] **Step 1: Update MetricCard**

Replace the entire file content with:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { TYPOGRAPHY } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: string
  numericValue?: number
  change: number
  changeType: 'positive' | 'negative' | 'neutral'
  description: string
  subtitle?: string
  loading?: boolean
  tooltip?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  numericValue,
  change,
  changeType,
  description,
  subtitle,
  loading,
  tooltip,
  className,
}: MetricCardProps) {
  // Only pass numericValue to count-up when not loading.
  // This ensures the animation fires exactly once: when data arrives.
  const animatedValue = useCountUp(loading ? 0 : (numericValue ?? 0), {
    duration: 1000,
    decimals: 0,
  })

  const displayValue = loading
    ? '—'
    : numericValue !== undefined
      ? animatedValue.toLocaleString()
      : value

  return (
    <Card
      hover="lift"
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-300',
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'space-y-1 transition-opacity duration-300',
            loading ? 'opacity-50' : 'opacity-100',
          )}
        >
          <div className={TYPOGRAPHY.metricLg}>{displayValue}</div>
          <div className="flex items-center gap-2">
            {!loading && (changeType !== 'neutral' || change !== 0) && (
              <Badge
                variant={
                  changeType === 'positive'
                    ? 'default'
                    : changeType === 'negative'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-xs font-semibold"
              >
                <span aria-hidden="true">
                  {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '−'}
                </span>
                <span className="sr-only">
                  {changeType === 'positive'
                    ? 'increased by'
                    : changeType === 'negative'
                      ? 'decreased by'
                      : 'no change'}
                </span>{' '}
                {Math.abs(change)}%
              </Badge>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {!loading && subtitle && (
            <p className="text-xs text-muted-foreground/70 tabular-nums">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

Key changes:
- `MetricCardSkeleton` import removed (no longer used here).
- `useCountUp` receives `0` when `loading` — no premature animation.
- Content always rendered; `opacity-50` / `opacity-100` with `transition-opacity duration-300` for smooth dim/reveal.
- Badge and subtitle hidden while loading to keep the dimmed state clean.
- `displayValue` returns `'—'` while loading.

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | head -30
```
Expected: clean. The `MetricCardSkeleton` is still exported from `loading-state.tsx` — do not remove it (may be used elsewhere).

- [ ] **Step 3: Commit**

```bash
git add frontend/features/dashboard/components/MetricCard.tsx
git commit -m "feat: MetricCard dims while loading instead of showing skeleton"
```

---

### Task 6: Refactor `ActivityChart` — dimmed placeholder + fade-in chart

**Files:**
- Modify: `frontend/features/dashboard/components/ActivityChart.tsx`

**New behavior:** While `loading`, show a dimmed grey rectangle the same height as the chart. When `loading` flips to false, the chart fades in via framer-motion.

- [ ] **Step 1: Update ActivityChart**

```tsx
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChartComponent } from '@/components/charts'

export interface ActivityChartProps {
  data: Array<{ day: string; events: number; users: number }>
  loading?: boolean
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Activity Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] rounded-md bg-muted opacity-30" />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <LineChartComponent
              data={data}
              lines={[
                { dataKey: 'events', name: 'Events', color: 'hsl(var(--primary))' },
                { dataKey: 'users', name: 'Users', color: 'hsl(var(--chart-2))' },
              ]}
              xAxisKey="day"
              height={300}
            />
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/features/dashboard/components/ActivityChart.tsx
git commit -m "feat: ActivityChart uses dimmed placeholder and fades chart in on load"
```

---

### Task 7: Refactor `TopEvents` — dimmed placeholders + staggered fade-in

**Files:**
- Modify: `frontend/features/dashboard/components/TopEvents.tsx`

**New behavior:**
- While `loading`: show 5 dimmed `bg-muted/40` bars (no text, no rank numbers — visually distinct from the empty state message).
- When data arrives and `events.length > 0`: items fade-slide in with staggered framer-motion animation (opacity 0→1, y 8→0, 200ms duration, 40ms stagger).
- When `events.length === 0`: existing empty state message unchanged.

- [ ] **Step 1: Update TopEvents**

```tsx
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface TopEvent {
  name: string
  count: number
}

export interface TopEventsProps {
  events: TopEvent[]
  loading?: boolean
}

export function TopEvents({ events, loading }: TopEventsProps) {
  const max = events[0]?.count ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Events</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted/40" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No events in the selected period.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try expanding the date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs tabular-nums text-muted-foreground w-4 shrink-0">
                      {idx + 1}
                    </span>
                    <p className="font-medium text-sm truncate">{event.name}</p>
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {event.count.toLocaleString()}
                  </p>
                </div>
                <div className="h-1 bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/50 transition-[width] duration-500"
                    style={{ width: `${(event.count / max) * 100}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/features/dashboard/components/TopEvents.tsx
git commit -m "feat: TopEvents uses dimmed placeholders and staggered fade-in"
```

---

## Chunk 3: Deferred skeleton + fade-in on non-dashboard pages (Approach A)

For each page below, the pattern is identical:
1. Import `useDeferredLoading` from `@/hooks`.
2. Replace `isLoading` (or equivalent) skeleton gate with `useDeferredLoading(isLoading)`.
3. Wrap the main content `return` in a `motion.div` with `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}`.

**Important:** Only wrap `isLoading`, never `isFetching`. If a page uses `isLoading || isFetching` as a loading gate, split them: use `useDeferredLoading(isLoading)` for the skeleton gate, and leave `isFetching` handling unchanged (EventsPage currently uses it to dim the table — leave that as-is).

---

### Task 8: `TrendsPage`

**Files:**
- Modify: `frontend/features/analytics/trends/TrendsPage.tsx`

- [ ] **Step 1: Find the isLoading skeleton gate**

Open the file. Look for a pattern like:
```tsx
if (isLoading) return <ChartSkeleton />
// or
{isLoading ? <ChartSkeleton /> : <TrendChart />}
```

- [ ] **Step 2: Apply the pattern**

Add at the top of the component function:
```tsx
import { useDeferredLoading } from '@/hooks'
// ...
const showSkeleton = useDeferredLoading(isLoading)
```

Replace the skeleton gate condition `isLoading` with `showSkeleton`.

Wrap the main content return:
```tsx
return (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
    {/* existing content */}
  </motion.div>
)
```

Add `import { motion } from 'framer-motion'` if not already present.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/features/analytics/trends/TrendsPage.tsx
git commit -m "feat: TrendsPage defers skeleton and fades content in"
```

---

### Task 9: `RetentionPage`

**Files:**
- Modify: `frontend/features/analytics/retention/RetentionPage.tsx`

`useRetentionData` returns `isLoading`. The page renders a `<TableSkeleton />` when `isLoading` is true.

- [ ] **Step 1: Add useDeferredLoading and replace isLoading gate**

```tsx
import { useDeferredLoading } from '@/hooks'
import { motion } from 'framer-motion'
// ...
const showSkeleton = useDeferredLoading(isLoading)
if (showSkeleton) return <TableSkeleton />
```

- [ ] **Step 2: Wrap content return in motion.div**

```tsx
return (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
    {/* existing content */}
  </motion.div>
)
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/features/analytics/retention/RetentionPage.tsx
git commit -m "feat: RetentionPage defers skeleton and fades content in"
```

---

### Task 10: `PathsPage` and `PathsExplorerPage`

**Files:**
- Modify: `frontend/features/analytics/paths/PathsPage.tsx`
- Modify: `frontend/features/analytics/paths/PathsExplorerPage.tsx`

These pages use `isLoading || eventsLoading` as their gate (shows a `LoadingState` spinner, not a skeleton). Apply `useDeferredLoading` to the combined boolean:

```tsx
import { useDeferredLoading } from '@/hooks'
import { motion } from 'framer-motion'
// ...
const showLoading = useDeferredLoading(isLoading || eventsLoading)
if (showLoading) return <LoadingState message="Analyzing paths…" />
```

Then wrap the content return in `motion.div` as usual:
```tsx
return (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
    {/* existing content */}
  </motion.div>
)
```

Check the variable names in each file before applying — `PathsPage` uses `isLoading` and `eventsLoading` from `usePathsData`; `PathsExplorerPage` uses `isLoading` and `eventsLoading` from `usePathExplorer`. Confirm the names by reading the file before editing.

- [ ] **Step 1: Update PathsPage** — add `useDeferredLoading(isLoading || eventsLoading)`, wrap content in motion.div
- [ ] **Step 2: Update PathsExplorerPage** — same pattern, confirm variable names first
- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | head -20
```
Expected: clean.
- [ ] **Step 4: Commit**

```bash
git add \
  frontend/features/analytics/paths/PathsPage.tsx \
  frontend/features/analytics/paths/PathsExplorerPage.tsx
git commit -m "feat: Paths pages defer loading state and fade content in"
```

---

### Task 11: `EventsPage`

**Files:**
- Modify: `frontend/features/events/EventsPage.tsx`

EventsPage is more complex — it passes `loading={isLoading || isFetching}` to the `EventsTable` component. The `isFetching` portion dims the table during background refetch — keep that behaviour. Only the initial skeleton/spinner gate (if any) gets deferred.

- [ ] **Step 1: Inspect EventsPage loading gates**

Open `frontend/features/events/EventsPage.tsx`. Identify:
- Any early return on `isLoading` (full-page skeleton/spinner) — apply `useDeferredLoading(isLoading)`.
- The `loading={isLoading || isFetching}` prop passed to `EventsTable` — leave this unchanged.

- [ ] **Step 2: Apply useDeferredLoading to isLoading gate only**

```tsx
import { useDeferredLoading } from '@/hooks'
// ...
const showSkeleton = useDeferredLoading(isLoading)
```

Replace any `if (isLoading)` early return with `if (showSkeleton)`.

Wrap the main content return in a `motion.div` fade-in (duration 0.2).

- [ ] **Step 3: Build check** — `npm run build 2>&1 | head -20`
- [ ] **Step 4: Commit**

```bash
git add frontend/features/events/EventsPage.tsx
git commit -m "feat: EventsPage defers skeleton and fades content in"
```

---

### Task 12: `SessionsPage`, `ConnectionsPage`, `ConnectionDetailPage`

**Files:**
- Modify: `frontend/pages/SessionsPage.tsx`
- Modify: `frontend/features/connections/ConnectionsPage.tsx` (or `ConnectionList.tsx` — whichever renders the loading state)
- Modify: `frontend/features/connections/ConnectionDetailPage.tsx`

Apply the same pattern for each: `useDeferredLoading(isLoading)` to gate the skeleton/spinner, `motion.div` fade-in wrapping content.

For `ConnectionsPage`: the loading state may live in `ConnectionList.tsx` — check and apply there if so.

- [ ] **Step 1: Update SessionsPage** — deferred skeleton, fade-in content, staleTime already added in Task 4
- [ ] **Step 2: Update ConnectionsPage / ConnectionList** — deferred loading spinner
- [ ] **Step 3: Update ConnectionDetailPage** — deferred loading spinner
- [ ] **Step 4: Build check** — `npm run build 2>&1 | head -20`
- [ ] **Step 5: Commit**

Stage only the files you actually modified (ConnectionList.tsx may or may not have been changed — check before staging):

```bash
git add frontend/pages/SessionsPage.tsx frontend/features/connections/ConnectionDetailPage.tsx
# Add ConnectionsPage.tsx or ConnectionList.tsx depending on which file holds the loading state:
git add frontend/features/connections/ConnectionsPage.tsx  # or ConnectionList.tsx if that's where it lives
git commit -m "feat: Sessions and Connections pages defer skeleton and fade content in"
```

---

## Final verification

- [ ] **Run full build**

```bash
cd /Users/carlo/my_work/openflow/openflow-oss && npm run build
```
Expected: zero TypeScript errors.

- [ ] **Run unit tests**

```bash
npm run test:run
```
Expected: all pass.

- [ ] **Manual smoke test**

Start both servers:
```bash
# Terminal 1
uv run serve
# Terminal 2
npm run dev
```

Visit each page and verify:
1. `/dashboard` — no skeleton flash on fast load; metric cards dim and count up when data arrives; activity chart placeholder then fades in; top events stagger in.
2. `/trends`, `/retention`, `/paths`, `/events`, `/connections` — no skeleton on sub-200ms loads; skeleton appears only if load takes longer than 200ms; content fades in smoothly.
3. Navigate away and back — data loads instantly (stale cache shown immediately).
4. `/connections/<id>` — visit a connection detail page, confirm no skeleton flash and smooth fade-in.
