# Design System Page — Spec

**Date:** 2026-03-21

## Purpose

A living design system page that serves as both a visual QA checker (spot styling regressions, theme issues) and a developer reference (see all components rendered in context). Available only in development builds.

## Route & Access

- Route: `/design-system`
- Guard: `import.meta.env.DEV` — in production this route redirects to `/dashboard`
- Entry point: a footer link in the app sidebar, rendered only when `import.meta.env.DEV` is true

## Layout

Two-column layout inside `DashboardLayout`:

- **Left:** Fixed inner sidebar (~220px) listing categories as anchor links
- **Right:** Scrollable content area with component sections

The app's actual theme (CSS variables, Tailwind config, dark/light mode) applies — this is intentional so theme regressions are visible.

## Categories & Components

### UI Primitives
Button (all variants: default, secondary, outline, ghost, destructive, sizes), Badge, Input, Select, Checkbox, Switch, Slider, Progress, Skeleton, Spinner (raw primitive from `ui/spinner.tsx`), Avatar, Separator, Tooltip, Popover, Dialog, DropdownMenu, Card, ScrollArea

### Feedback States
LoadingState, EmptyState, QueryError, CardLoadingBar, UnderConstruction

### Charts
AreaChart, BarChart, LineChart, DonutChart, FunnelChart, HeatmapChart, SparklineChart, ComparisonChart — each rendered with static sample data

### Data Display
DataTable, EventsDataTable (`components/data-table/EventsDataTable.tsx`), PivotTable — each rendered with static fixture data

### App Components
DateRangePicker, FilterSelect, FilterBar (`components/shared/FilterBar.tsx`), GlobalFilters, DbLogo

Note: `FilterBar` and `GlobalFilters` depend on Zustand store state; render them wrapped in the store provider (already present via `DashboardLayout`) with the store's default state.

## File Structure

```
apps/web/frontend/features/design-system/
  DesignSystemPage.tsx                     # page component + inner sidebar nav
  components/
    ComponentSection.tsx                   # reusable wrapper: heading + rendered component
    sections/
      PrimitivesSection.tsx
      FeedbackSection.tsx
      ChartsSection.tsx
      DataSection.tsx
      AppComponentsSection.tsx
```

## Routing

In `App.tsx`:
- The `React.lazy` call itself must be guarded so the module is excluded from production bundles:
  ```tsx
  const DesignSystemPage = import.meta.env.DEV
    ? lazy(() => import('@/features/design-system/DesignSystemPage'))
    : null
  ```
- Add route inside the dev guard:
  ```tsx
  {import.meta.env.DEV && DesignSystemPage && (
    <Route path="/design-system" element={<DesignSystemPage />} />
  )}
  ```
- Wrap in existing `Suspense` boundary (already present in `App.tsx`)

## Sidebar Entry

In `Sidebar.tsx`, add a footer link that renders only when `import.meta.env.DEV`. Follow the existing `NavLink` + `NavItem` object pattern used for all other nav items, including the collapsed icon-rail state (tooltip + centered icon). Add `Palette` from lucide-react to the existing icon imports.

## Inner Layout

The design system page adds its own inner two-column layout inside `DashboardLayout`'s content area:
- Inner sidebar: `position: sticky; top: 0` inside a flex row — not `position: fixed`, so it coexists correctly with the app sidebar in both expanded and collapsed states
- Anchor link scroll: use `element.scrollIntoView({ behavior: 'smooth' })` via `onClick` handlers rather than native fragment navigation, since `DashboardLayout` uses an `overflow-y: auto` content wrapper rather than window-level scrolling

## Design Decisions

- **No code snippets** — this is a visual checker, not a documentation site. Component name labels only.
- **Static fixture data** — charts and tables use hardcoded sample data; no API calls from this page.
- **App theme** — intentionally uses the real theme so visual regressions are catchable.
- **Dev-only** — no production bundle impact; the route guard and sidebar entry both check `import.meta.env.DEV`.

## Out of Scope

- Code snippet display / copy-to-clipboard
- Storybook integration
- Interactive prop controls (knobs)
- Production visibility
