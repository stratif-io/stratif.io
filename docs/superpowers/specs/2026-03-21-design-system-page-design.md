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
Button (all variants: default, secondary, outline, ghost, destructive, sizes), Badge, Input, Select, Checkbox, Switch, Slider, Progress, Skeleton, Spinner, Avatar, Separator, Tooltip, Popover, Dialog, DropdownMenu, Card, ScrollArea

### Feedback States
LoadingState, EmptyState, QueryError, CardLoadingBar, UnderConstruction

### Charts
AreaChart, BarChart, LineChart, DonutChart, FunnelChart, HeatmapChart, SparklineChart, ComparisonChart — each rendered with static sample data

### Data Display
DataTable, EventsDataTable, PivotTable — each rendered with static fixture data

### App Components
DateRangePicker, FilterSelect, FilterBar, GlobalFilters, DbLogo

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
- Import `DesignSystemPage` lazily with `React.lazy`
- Add route: `{ path: '/design-system', element: import.meta.env.DEV ? <DesignSystemPage /> : <Navigate to="/dashboard" /> }`
- Wrap in existing `Suspense` boundary

## Sidebar Entry

In `Sidebar.tsx`, add a footer nav item that renders only when `import.meta.env.DEV`:
```tsx
{import.meta.env.DEV && (
  <NavItem to="/design-system" icon={<Palette />} label="Design System" />
)}
```

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
