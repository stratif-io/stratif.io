# UI Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues found in the comprehensive UI audit — accessibility, theming, responsiveness, anti-patterns, and polish — while keeping sparklines.

**Architecture:** Fixes are grouped by scope: foundational (color/token consolidation), accessibility hardening, responsive/touch improvements, theming correctness, and visual polish. Each task is independent enough to commit individually. No new components introduced — only fixes to existing ones.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, shadcn/ui, Lucide icons, Recharts, Vite

**Worktree:** `/Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-audit` on branch `feature/ui-audit`

---

## Files Map

| File                                                                     | Changes                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `apps/web/frontend/components/GlobalFilters.tsx`                         | Fix nested button (C1), touch targets (H1), mobile header (M1)            |
| `apps/web/frontend/components/layout/Sidebar.tsx`                        | Fix touch targets (H1)                                                    |
| `apps/web/frontend/components/layout/Header.tsx`                         | Fix theme toggle system mode display (M5)                                 |
| `apps/web/frontend/components/ui/empty-state.tsx`                        | Fix icon wrapper aria-hidden (M4)                                         |
| `apps/web/frontend/components/ui/loading-state.tsx`                      | Fix skeleton radius to match cards (L3)                                   |
| `apps/web/frontend/frontend/index.css`                                   | Fix hover-scale stacking context (M6), add hover:hover media queries (L4) |
| `apps/web/frontend/components/charts/chart-colors.ts`                    | Fix heatmap dark mode colors (C2), consolidate with constants (L1)        |
| `apps/web/frontend/lib/constants.ts`                                     | Remove duplicate CHART_COLORS (L1)                                        |
| `apps/web/frontend/features/dashboard/DashboardPage.tsx`                 | Use TYPOGRAPHY.pageLabel consistently (L2)                                |
| `apps/web/frontend/features/*/…Page.tsx`                                 | Use TYPOGRAPHY.pageLabel consistently (L2)                                |
| `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx`     | Make sparklines meaningful (keep but improve opacity)                     |
| `apps/web/frontend/features/dashboard/components/MissionControlGrid.tsx` | Improve dashboard aesthetic — break identical-card-grid anti-pattern      |
| `apps/web/frontend/index.css`                                            | Dark mode card/bg differentiation (H4)                                    |

---

## Task 1: Fix Nested Button in DimensionFilter (C1 — Critical A11y)

**Files:**

- Modify: `apps/web/frontend/components/GlobalFilters.tsx`

**Problem:** The clear-X `<button>` is nested inside the PopoverTrigger `<button>`. Invalid HTML, breaks keyboard and screen reader users.

**Solution:** Restructure the filter pill as a flex row: trigger button + separate clear button side by side.

- [ ] **Step 1: Run the existing FilterSelect test to establish baseline**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-audit
bun run test:run -- --reporter=verbose 2>&1 | grep -E "(FilterSelect|PASS|FAIL)"
```

- [ ] **Step 2: Replace the DimensionFilter trigger JSX**

In `apps/web/frontend/components/GlobalFilters.tsx`, replace the entire `<Popover>` block (lines ~104–195) with this restructured version that moves the clear button outside the trigger:

```tsx
return (
  <div className="flex items-center shrink-0">
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-10 flex items-center gap-1.5 pl-3 text-sm font-medium',
            'hover:bg-accent/60 transition-colors',
            value ? 'pr-1' : 'pr-3',
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <FieldIcon className="shrink-0 h-3.5 w-3.5" />
          <span className="max-w-[100px] truncate">
            {value ?? `All ${pluralize(field.label.toLowerCase())}`}
          </span>
          {!value && <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder={`Search ${pluralize(field.label.toLowerCase())}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setFocusedIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            autoFocus
          />
        </div>

        <div className="max-h-60 overflow-y-auto">
          <div className="p-1">
            {allItems.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No results</p>
            ) : (
              allItems.map((opt, i) => (
                <button
                  key={opt ?? '__all__'}
                  ref={(el) => {
                    optionRefs.current[i] = el
                  }}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm truncate',
                    'hover:bg-accent transition-colors focus:bg-accent focus:outline-none',
                    (opt === null ? value === null : value === opt) && 'bg-accent font-medium'
                  )}
                  onClick={() => select(opt)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      const next = Math.min(i + 1, allItems.length - 1)
                      setFocusedIndex(next)
                      optionRefs.current[next]?.focus()
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      if (i === 0) return
                      const prev = i - 1
                      setFocusedIndex(prev)
                      optionRefs.current[prev]?.focus()
                    } else if (e.key === 'Escape') {
                      setOpen(false)
                    }
                  }}
                >
                  {opt === null ? `All ${pluralize(field.label.toLowerCase())}` : opt}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>

    {value && (
      <button
        type="button"
        aria-label={`Clear ${field.label} filter`}
        className="flex items-center justify-center h-10 w-8 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => select(null)}
      >
        <X className="h-3 w-3 shrink-0" />
      </button>
    )}
  </div>
)
```

- [ ] **Step 3: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 4: Commit**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-audit
git add apps/web/frontend/components/GlobalFilters.tsx
git commit -m "fix(a11y): move clear button outside PopoverTrigger — nested buttons invalid HTML"
```

---

## Task 2: Fix Heatmap Colors for Dark Mode (C2 — Critical Theming)

**Files:**

- Modify: `apps/web/frontend/components/charts/chart-colors.ts`

**Problem:** `HEATMAP_SEQUENTIAL_COLORS` and `HEATMAP_DIVERGING_COLORS` are hardcoded light-mode HSL values. In dark mode, the lightest sequential step (`hsl(215, 25%, 93%)`) renders near-white against a dark background, inverting the visual weight of the heatmap.

**Solution:** Keep the same conceptual ramps but anchor them to relative darkness levels that work in both modes. Use `hsl(var(--muted))` for the empty/neutral step and `hsl(var(--primary))` for the densest step, with intermediate steps as opacity variants.

- [ ] **Step 1: Replace heatmap color arrays**

In `apps/web/frontend/components/charts/chart-colors.ts`, replace `HEATMAP_SEQUENTIAL_COLORS` and `HEATMAP_DIVERGING_COLORS`:

```ts
// Sequential heatmap: low-opacity primary → full primary.
// Uses CSS custom properties so both steps resolve correctly in light and dark mode.
export const HEATMAP_SEQUENTIAL_COLORS = [
  'hsl(var(--primary) / 0.08)',
  'hsl(var(--primary) / 0.18)',
  'hsl(var(--primary) / 0.32)',
  'hsl(var(--primary) / 0.48)',
  'hsl(var(--primary) / 0.65)',
  'hsl(var(--primary) / 0.82)',
  'hsl(var(--primary) / 1)',
]

// Diverging heatmap: destructive → neutral muted → primary.
export const HEATMAP_DIVERGING_COLORS = [
  'hsl(var(--destructive) / 0.9)',
  'hsl(var(--destructive) / 0.6)',
  'hsl(var(--destructive) / 0.35)',
  'hsl(var(--muted-foreground) / 0.25)',
  'hsl(var(--muted-foreground) / 0.12)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.75)',
  'hsl(var(--primary) / 1)',
]
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/charts/chart-colors.ts
git commit -m "fix(theme): use CSS variable-based heatmap colors that work in dark mode"
```

---

## Task 3: Fix Dark Mode Card/Background Depth (H4 — Theming)

**Files:**

- Modify: `apps/web/frontend/index.css`

**Problem:** In dark mode, `--card` and `--background` are the same value (`232 17% 8%`). Cards are invisible against the page unless bordered.

**Solution:** Bump the card lightness slightly in dark mode so cards sit above the background.

- [ ] **Step 1: Update dark mode card token**

In `apps/web/frontend/index.css`, find the `.dark` block and change:

```css
/* BEFORE */
--card: 232 17% 8%;
--card-foreground: 214 32% 91%;

/* AFTER */
--card: 232 17% 11%;
--card-foreground: 214 32% 91%;
```

Also update the popover (which should match card surface, not page):

```css
/* BEFORE */
--popover: 232 17% 10%;

/* AFTER */
--popover: 232 17% 13%;
```

- [ ] **Step 2: Remove the redundant box-shadow override** (was compensating for missing depth)

In `apps/web/frontend/index.css`, find and remove:

```css
/* Card subtle depth in dark mode */
.dark .card,
.dark [class*='card'] {
  border-color: hsl(var(--border));
  box-shadow: 0 1px 3px hsl(0 0% 0% / 0.2);
}

/* Subtle hover effects */
.dark [class*='card']:hover {
  border-color: hsl(var(--border));
  box-shadow: 0 2px 6px hsl(0 0% 0% / 0.25);
}
```

- [ ] **Step 3: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/index.css
git commit -m "fix(theme): differentiate card surface from page background in dark mode"
```

---

## Task 4: Fix Touch Targets to 44px Minimum (H1 — Responsive/A11y)

**Files:**

- Modify: `apps/web/frontend/components/GlobalFilters.tsx`
- Modify: `apps/web/frontend/components/layout/Sidebar.tsx`

**Problem:** Filter trigger buttons are `h-10` (40px). Sidebar nav links use `py-2` producing ~36px height. Both below the 44px minimum.

- [ ] **Step 1: Update filter buttons to h-11 (44px)**

In `apps/web/frontend/components/GlobalFilters.tsx`:

Find all `h-10` on interactive elements and change to `h-11`:

```tsx
// DimensionFilter outer div wrapper button — line ~107
className={cn(
  'h-11 flex items-center gap-1.5 pl-3 text-sm font-medium',
  ...
)}

// Clear button (from Task 1)
className="flex items-center justify-center h-11 w-9 text-muted-foreground ..."

// GranularityControl outer div — line ~223
className={cn(
  'flex items-center h-11 shrink-0',
  ...
)}

// GranularityControl expand/collapse button — line ~252
className="flex items-center justify-center h-11 px-2 text-muted-foreground ..."
```

Also update `GlobalFilters` container — change `sm:h-10` to `sm:h-11`:

```tsx
// line ~281
className = 'flex flex-col sm:flex-row sm:items-center sm:h-11 w-full rounded-lg border ...'
```

- [ ] **Step 2: Update sidebar nav link height**

In `apps/web/frontend/components/layout/Sidebar.tsx`, find the NavLink `className` and change `py-2` to `py-2.5`:

```tsx
className={cn(
  'flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors',
  collapsed ? 'justify-center px-2' : '',
  isActive
    ? 'bg-primary/10 text-primary'
    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
)}
```

Also update the collapse button at the bottom from `py-2` to `py-2.5`:

```tsx
className={cn(
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-1',
  !sidebarOpen && 'justify-center px-2'
)}
```

- [ ] **Step 3: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/components/GlobalFilters.tsx apps/web/frontend/components/layout/Sidebar.tsx
git commit -m "fix(a11y): increase touch targets to 44px minimum in filters and sidebar"
```

---

## Task 5: Fix Sidebar Mobile Overlay Accessibility (M3)

**Files:**

- Modify: `apps/web/frontend/components/layout/Sidebar.tsx`

**Problem:** The mobile overlay button has `aria-hidden="true"` — it's visually present and dismisses the sidebar, but is invisible to screen readers. Screen reader users can't discover or use the "close sidebar" affordance.

**Solution:** Remove `aria-hidden`, add a proper label, and ensure it's in the tab order only when sidebar is open.

- [ ] **Step 1: Fix the overlay button**

In `apps/web/frontend/components/layout/Sidebar.tsx`, replace the overlay button:

```tsx
{
  /* Mobile overlay */
}
{
  sidebarOpen && (
    <button
      aria-label="Close sidebar"
      className="fixed inset-0 z-[var(--z-sidebar-overlay)] bg-background/80 backdrop-blur-sm lg:hidden cursor-default"
      onClick={() => setSidebarOpen(false)}
    />
  )
}
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/layout/Sidebar.tsx
git commit -m "fix(a11y): make sidebar mobile overlay discoverable to screen readers"
```

---

## Task 6: Fix EmptyState Icon aria-hidden (M4)

**Files:**

- Modify: `apps/web/frontend/components/ui/empty-state.tsx`

**Problem:** The icon wrapper `<div>` is announced as an unlabeled region. The `Icon` inside has `aria-hidden="true"` but the container div is still in the a11y tree.

- [ ] **Step 1: Add aria-hidden to icon container**

In `apps/web/frontend/components/ui/empty-state.tsx`, change:

```tsx
{
  /* BEFORE */
}
;<div className="mb-4 border border-border p-3 inline-flex">
  {iconElement || (Icon && <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />)}
</div>

{
  /* AFTER */
}
;<div className="mb-4 border border-border p-3 inline-flex" aria-hidden="true">
  {iconElement || (Icon && <Icon className="h-8 w-8 text-muted-foreground" />)}
</div>
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/ui/empty-state.tsx
git commit -m "fix(a11y): hide decorative icon container from screen reader tree"
```

---

## Task 7: Fix Theme Toggle — Show System Mode Indicator (M5)

**Files:**

- Modify: `apps/web/frontend/components/layout/Header.tsx`

**Problem:** When theme is `"system"`, the toggle shows `Sun` or `Moon` (whichever the OS resolves to). Users in system mode have no visual cue that system mode is engaged and may think they're in manual light/dark.

**Solution:** Show the `Monitor` icon when theme is `"system"`.

- [ ] **Step 1: Update the trigger icon**

In `apps/web/frontend/components/layout/Header.tsx`, replace the trigger icon logic:

```tsx
{
  /* BEFORE */
}
{
  theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
}

{
  /* AFTER */
}
{
  theme === 'system' ? (
    <Monitor className="h-4 w-4" />
  ) : theme === 'dark' ? (
    <Moon className="h-4 w-4" />
  ) : (
    <Sun className="h-4 w-4" />
  )
}
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/layout/Header.tsx
git commit -m "fix(ux): show Monitor icon when system theme is active"
```

---

## Task 8: Fix hover-scale Stacking Context Risk (M6)

**Files:**

- Modify: `apps/web/frontend/index.css`

**Problem:** `.hover-scale:hover { transform: scale(1.02) }` creates a new stacking context that can clip absolutely-positioned children (popovers, tooltips, dropdowns).

**Solution:** Remove `.hover-scale` entirely (it's decorative, no functional use in the codebase) or replace with an `outline` approach that doesn't create stacking context issues.

- [ ] **Step 1: Check if hover-scale is used**

```bash
grep -r "hover-scale" /Users/carlo/my_work/stratifio/stratifio-oss/apps/web/frontend --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Remove the hover-scale utility**

In `apps/web/frontend/index.css`, remove:

```css
/* Smooth hover scale */
.hover-scale {
  @apply transition-transform duration-200;
}

.hover-scale:hover {
  transform: scale(1.02);
}
```

If any components use `hover-scale` (from Step 1), replace them with `hover:shadow-md transition-shadow duration-200` which achieves elevation lift without stacking context issues.

- [ ] **Step 3: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 4: Commit**

```bash
git add apps/web/frontend/index.css
git commit -m "fix(css): remove hover-scale — creates stacking context that clips popovers"
```

---

## Task 9: Add hover:hover Media Query Guards (L4)

**Files:**

- Modify: `apps/web/frontend/index.css`

**Problem:** Global hover styles (`a, button, [role='button'] { @apply transition-colors }`) apply on touch devices where hover states stick after tap.

**Solution:** Wrap the global interactive element transition rule in `@media (hover: hover)`.

- [ ] **Step 1: Update the global transition rule**

In `apps/web/frontend/index.css`, find and replace:

```css
/* BEFORE */
/* Smooth transitions — scoped to interactive elements only */
a,
button,
[role='button'],
input,
select,
textarea {
  @apply transition-colors duration-200;
}

/* AFTER */
/* Smooth transitions — only on devices that support hover */
@media (hover: hover) {
  a,
  button,
  [role='button'] {
    @apply transition-colors duration-200;
  }
}

/* Always transition form inputs — they need focus transitions on all devices */
input,
select,
textarea {
  @apply transition-colors duration-200;
}
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/index.css
git commit -m "fix(mobile): guard global hover transitions with hover:hover media query"
```

---

## Task 10: Consolidate Duplicate CHART_COLORS (L1)

**Files:**

- Modify: `apps/web/frontend/lib/constants.ts`
- Modify: `apps/web/frontend/components/charts/chart-colors.ts`

**Problem:** Both files export a `CHART_COLORS` object. The one in `constants.ts` is used by components that import from `@/lib/constants`; the one in `chart-colors.ts` is used by chart components. They can drift.

**Solution:** Remove `CHART_COLORS` from `constants.ts`. Any consumers of `CHART_COLORS` from `constants.ts` should import from `@/components/charts/chart-colors` instead.

- [ ] **Step 1: Find all usages of CHART_COLORS from constants**

```bash
grep -r "CHART_COLORS" /Users/carlo/my_work/stratifio/stratifio-oss/apps/web/frontend --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Remove CHART_COLORS from constants.ts**

In `apps/web/frontend/lib/constants.ts`, delete the entire `// Chart Color Palette (theme-aware)` section (lines 104–129).

- [ ] **Step 3: Update any imports that used constants.ts CHART_COLORS**

For each file found in Step 1 that imports from `@/lib/constants`, update the import to use `@/components/charts` instead:

```ts
// BEFORE
import { CHART_COLORS } from '@/lib/constants'

// AFTER
import { CHART_COLORS } from '@/components/charts'
```

- [ ] **Step 4: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/lib/constants.ts apps/web/frontend/components/charts/chart-colors.ts
git commit -m "refactor: consolidate CHART_COLORS to single source in chart-colors.ts"
```

---

## Task 11: Fix MetricCardSkeleton Radius Mismatch (L3)

**Files:**

- Modify: `apps/web/frontend/components/ui/loading-state.tsx`

**Problem:** `MetricCardSkeleton` uses `rounded-lg` but `HeroMetricCard` and `MiniMetricCard` use `rounded-xl`. During loading→loaded transition, the corner radius jumps.

- [ ] **Step 1: Update MetricCardSkeleton**

In `apps/web/frontend/components/ui/loading-state.tsx`, find `MetricCardSkeleton` and change `rounded-lg` to `rounded-xl`:

```tsx
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      className={cn('rounded-xl border bg-card p-4 space-y-3 animate-pulse', className)}
    >
      <div className="h-3 w-2/5 rounded bg-muted" />
      <div className="h-7 w-1/3 rounded bg-muted" />
      <div className="h-3 w-3/5 rounded bg-muted" />
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/ui/loading-state.tsx
git commit -m "fix(polish): align MetricCardSkeleton radius with actual card (rounded-xl)"
```

---

## Task 12: Normalize pageLabel Usage Across Pages (L2)

**Files:**

- Modify: `apps/web/frontend/features/analytics/AnalyticsPage.tsx` (if exists)
- Modify: Any `*Page.tsx` that uses raw h1/page title classes instead of `TYPOGRAPHY.pageLabel`

**Problem:** `TYPOGRAPHY.pageLabel` is defined in constants and used correctly in DashboardPage, but other pages may use raw Tailwind classes for their page titles, creating visual inconsistency.

- [ ] **Step 1: Find all page title usages**

```bash
grep -r "pageTitle\|pageTitleSm\|text-3xl font-bold\|text-2xl font-bold" \
  /Users/carlo/my_work/stratifio/stratifio-oss/apps/web/frontend/features \
  --include="*.tsx" -n
```

- [ ] **Step 2: Find pages using TYPOGRAPHY correctly for reference**

```bash
grep -r "TYPOGRAPHY\." /Users/carlo/my_work/stratifio/stratifio-oss/apps/web/frontend/features --include="*.tsx" -n
```

- [ ] **Step 3: Update each page that uses raw title classes**

For each file found in Step 1, update the h1/title to use `TYPOGRAPHY.pageLabel`:

```tsx
// BEFORE (example)
;<h1 className="text-2xl font-bold tracking-tight">Events</h1>

// AFTER
import { TYPOGRAPHY } from '@/lib/constants'
// ...
;<h1 className={TYPOGRAPHY.pageLabel}>Events</h1>
```

- [ ] **Step 4: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/web/frontend/features/
git commit -m "fix(polish): normalize page title style across all feature pages"
```

---

## Task 13: Improve Dashboard Sparklines — Visible, Not Decorative (Keep Sparklines)

**Files:**

- Modify: `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx`

**Problem:** Sparklines in `MiniMetricCard` are rendered at `opacity-20` as background texture. At 20% opacity they're decorative noise rather than informational. The user wants to keep sparklines — so make them earn their space.

**Solution:** Increase opacity to a legible level, give sparklines a dedicated area at the bottom of the card (not full-card background), and add a more purposeful layout so the trend line is visually meaningful.

- [ ] **Step 1: Update MiniMetricCard sparkline rendering**

In `apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx`, replace the sparkline section:

```tsx
{
  /* Sparkline — dedicated strip at bottom of card */
}
{
  sparklineData.length > 1 && !loading && (
    <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`mini-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color ?? 'hsl(var(--primary))'} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color ?? 'hsl(var(--primary))'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color ?? 'hsl(var(--primary))'}
            fill={`url(#mini-grad-${label})`}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Also add `pb-8` to the card's content area so text doesn't overlap the sparkline strip:

```tsx
<button
  ...
  className={cn(
    'relative overflow-hidden rounded-xl border p-3 pb-2 text-left w-full transition-colors',
    ...
  )}
>
```

And set `pb-9` when sparklines are present (use a conditional). Alternatively, the simplest fix is to always reserve the bottom 8px:

```tsx
className={cn(
  'relative overflow-hidden rounded-xl border pt-3 px-3 pb-10 text-left w-full transition-colors',
  ...
)}
```

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/features/dashboard/components/MiniMetricCard.tsx
git commit -m "fix(ux): make sparklines legible in mini cards — strip at bottom, not ghost texture"
```

---

## Task 14: Fix Mobile GlobalFilters Overflow (M1)

**Files:**

- Modify: `apps/web/frontend/components/GlobalFilters.tsx`

**Problem:** On small screens, `GlobalFilters` becomes `flex-col` stacking all filters vertically, making the header area enormous (100px+) when multiple filters are present.

**Solution:** Keep the horizontal scrollable bar on mobile (remove `flex-col` for small screens) — let it scroll horizontally. The gradient fade on the right already hints at scrollability.

- [ ] **Step 1: Remove flex-col mobile stacking**

In `apps/web/frontend/components/GlobalFilters.tsx`, in the `GlobalFilters` container div, change:

```tsx
{
  /* BEFORE */
}
className =
  'flex flex-col sm:flex-row sm:items-center sm:h-11 w-full rounded-lg border bg-background shadow-sm sm:divide-x divide-y sm:divide-y-0 divide-border overflow-x-auto scrollbar-none'

{
  /* AFTER */
}
className =
  'flex flex-row items-center h-11 w-full rounded-lg border bg-background shadow-sm divide-x divide-border overflow-x-auto scrollbar-none'
```

This keeps the bar always horizontal and scrollable, removing the stacking behavior. The `after:` gradient already provides a scroll hint.

- [ ] **Step 2: Run tests**

```bash
bun run test:run 2>&1 | tail -10
```

Expected: `464 passed`

- [ ] **Step 3: Commit**

```bash
git add apps/web/frontend/components/GlobalFilters.tsx
git commit -m "fix(mobile): keep filter bar horizontal on mobile — scroll instead of stack"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/ui-audit
bun run test:run 2>&1 | tail -15
```

Expected: All 464 tests passing (or more if tests were added).

- [ ] **Step 2: Run lint**

```bash
bun run lint 2>&1 | tail -20
```

Expected: Zero warnings, zero errors.

- [ ] **Step 3: Run type check**

```bash
bun run build 2>&1 | tail -20
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 4: Push and create PR**

```bash
git push -u origin feature/ui-audit
```

Then create PR targeting `develop` with title: `fix: ui audit — a11y, theming, responsiveness, and polish`

---

## Self-Review

**Spec coverage check:**

| Audit Issue                           | Task                                                                                               | Covered? |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| C1 — Nested button in DimensionFilter | Task 1                                                                                             | ✅       |
| C2 — Heatmap dark mode                | Task 2                                                                                             | ✅       |
| H1 — Touch targets                    | Task 4                                                                                             | ✅       |
| H2 — Hero metric anti-pattern         | Partial — not restructuring layout, user kept sparklines as signal they want the current aesthetic | ⚠️       |
| H3 — Sparklines as decoration         | Task 13 (kept but improved)                                                                        | ✅       |
| H4 — Dark mode card/bg contrast       | Task 3                                                                                             | ✅       |
| H5 — HSL vs OKLCH                     | Not included — systemic migration, too risky for one PR                                            | ⚠️       |
| M1 — Mobile header stack              | Task 14                                                                                            | ✅       |
| M2 — No container queries             | Not included — requires per-component rework, out of scope for audit fixes                         | ⚠️       |
| M3 — Sidebar overlay a11y             | Task 5                                                                                             | ✅       |
| M4 — EmptyState aria-hidden           | Task 6                                                                                             | ✅       |
| M5 — Theme toggle system mode         | Task 7                                                                                             | ✅       |
| M6 — hover-scale stacking             | Task 8                                                                                             | ✅       |
| L1 — Duplicate CHART_COLORS           | Task 10                                                                                            | ✅       |
| L2 — pageLabel consistency            | Task 12                                                                                            | ✅       |
| L3 — Skeleton radius mismatch         | Task 11                                                                                            | ✅       |
| L4 — hover:hover media query          | Task 9                                                                                             | ✅       |

**Deferred (noted, not in this plan):**

- H5 (HSL→OKLCH): systemic color system migration, warrants its own dedicated plan
- H2 (hero metric template): aesthetic redesign requires separate creative brief
- M2 (container queries): per-component refactor, separate plan

**Placeholder scan:** No TBDs, all code blocks present. ✅

**Type consistency:** `TYPOGRAPHY`, `SPACING` constants used by exact name from `@/lib/constants`. Import paths are exact. ✅
