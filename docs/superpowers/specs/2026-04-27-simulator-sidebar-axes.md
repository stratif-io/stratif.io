# Simulator Sidebar — Axis Navigation Redesign

**Date:** 2026-04-27
**Branch:** feature/simulator-design-system
**Goal:** Replace the current flat sidebar nav items (Growth, Retention…) with a collapsible Studio group whose sub-items are the axis selectors, accessible via a sparkline popover.

---

## Decisions

| Decision        | Choice                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- |
| Section labels  | Removed — no SIMULATION / EVENTS headers                                                    |
| Axis access     | Value badge on sidebar item → click → Radix Popover with sparklines                         |
| Studio group    | Collapsible; auto-expands when Studio is active, auto-collapses when Event editor is active |
| Popover content | Sparkline SVG + label + description per option, matching existing `axisDisplaySpec.ts` data |
| KpiGrid layout  | Always full-width — no right panel for axis config                                          |

---

## Sidebar structure

```
📐 Studio  ▶              ← nav item + collapse toggle
  📈 Growth    [Strong]   ← axis item, indented, value badge, click → popover
  🔄 Retention [Sticky]
  💬 Engagement [Medium]
  🚀 Virality  [Moderate]
  🎯 Scale     [Startup]
  〰️ Noise     [Some]
⚡ Event editor            ← standalone nav item
```

### Behaviour

- **Clicking Studio**: navigates to Studio view (KpiGrid) and expands the axis group if collapsed.
- **Clicking an axis item**: opens a Radix `Popover` anchored to that item. Selecting a value calls `setAxis` / `setScaleConfig` on the store immediately and closes the popover.
- **Clicking Event editor**: navigates to Event editor and collapses the Studio group.
- **Chevron `▶`**: can also toggle the Studio group independently without changing `activeSection`.
- **Sidebar collapsed (60px)**: Studio shows icon-only with tooltip; axis sub-items are hidden (collapsed state implies Studio group is also visually collapsed).

---

## Architecture

### `AppSidebar` changes

`SidebarItem` gains two optional fields:

```ts
interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
  badge?: string; // NEW — current value text shown as pill
  children?: SidebarItem[]; // NEW — sub-items (indented, no section label)
  expanded?: boolean; // NEW — controls sub-item visibility
  onToggleExpand?: () => void; // NEW — called when chevron is clicked
}
```

`AppSidebar` renders sub-items indented (extra left padding) when `item.expanded === true`. The chevron `▶` appears on items that have `children`. Sub-items inherit all existing `SidebarItem` behaviour (badge, onClick, active).

No `sections` / section labels in the simulator — the sections array still exists for structural grouping but the label is left empty (`label: ""`).

### Axis popover

A new component `AxisPopover` in `packages/design-system/components/ui/axis-popover.tsx`:

```ts
interface AxisPopoverProps {
  axisId: string; // e.g. "growth"
  values: AxisDisplayValue[]; // from axisDisplaySpec
  currentValue: string;
  onSelect: (value: string) => void;
  children: ReactNode; // trigger element (the sidebar button)
}
```

Renders a Radix `Popover` with `side="right"` and `align="start"`. Content is a list of rows: `40×22 sparkline SVG | label (bold) | description (muted)`. Selected row has `bg-primary/10 text-primary`. Clicking a row calls `onSelect` and closes.

`AxisPopover` is used in `App.tsx` when building `sidebarSections` — each axis item's `onClick` is replaced by rendering the item inside `<AxisPopover>`.

### `seederStore` changes

Add:

```ts
studioExpanded: boolean;         // default true
setStudioExpanded: (v: boolean) => void;
```

`setActiveSection` is updated:

- Setting `"events"` → also sets `studioExpanded = false`
- Setting `"studio"` → also sets `studioExpanded = true`

### `App.tsx` changes

The `sidebarSections` config is rebuilt:

```ts
[
  {
    label: "",
    items: [
      {
        key: "studio",
        label: "Studio",
        icon: <LayoutDashboard size={16} />,
        active: activeSection === "studio",
        onClick: () => setActiveSection("studio"),
        expanded: studioExpanded,
        onToggleExpand: () => setStudioExpanded(!studioExpanded),
        children: AXIS_IDS.map((id) => ({
          key: id,
          label: AXIS_LABELS[id],
          icon: AXIS_ICONS[id],
          active: false,
          badge: currentAxisValues[id],   // resolved display label
          onClick: () => { /* handled by AxisPopover wrapper */ },
        })),
      },
    ],
  },
  {
    label: "",
    items: [
      {
        key: "events",
        label: "Event editor",
        icon: <Zap size={16} />,
        active: activeSection === "events",
        onClick: () => setActiveSection("events"),
      },
    ],
  },
]
```

Because axis items need `AxisPopover` wrapping, `App.tsx` passes axis items via a render override or `AppSidebar` accepts an `itemWrapper` prop:

```ts
itemWrapper?: (item: SidebarItem, button: ReactNode) => ReactNode;
```

This lets `App.tsx` wrap axis items in `<AxisPopover>` without the design system knowing about axis logic.

### `StudioLayout` changes

`StudioLayout` no longer handles axis sections — it always renders `<KpiGrid />` when `activeSection !== "events"`. The `AXIS_SECTIONS` routing and the `ResizablePanel` are removed.

---

## Data flow

```
seederStore
  ├── activeSection: string        (existing)
  ├── studioExpanded: boolean      (new)
  └── config.axes                  (existing — source of current values)

App.tsx
  ├── reads activeSection, studioExpanded, config.axes
  ├── builds sidebarSections with badge = resolved axis label
  └── wraps axis items in AxisPopover via itemWrapper

AppSidebar
  └── renders children indented when item.expanded === true

AxisPopover (design system)
  └── Radix Popover, reads axisDisplaySpec values
```

---

## What is removed

| Removed                                            | Replaced by                       |
| -------------------------------------------------- | --------------------------------- |
| Section labels SIMULATION / EVENTS                 | No labels                         |
| `ResizablePanel` in StudioLayout for axis sections | Popover on sidebar items          |
| Flat axis nav items (Growth → placeholder page)    | Axis sub-items with popover       |
| `activeSection` values "growth"/"retention"/…      | Only "studio" and "events" remain |

---

## Error handling

- `AxisPopover` with no `values` renders nothing (no crash).
- `badge` not found for an axis → badge omitted.
- `expanded` state falls back to `true` if store is unavailable.

---

## Testing

- Unit tests for `AppSidebar`: renders sub-items when `expanded=true`, hides them when `false`, calls `onToggleExpand` on chevron click, shows badge text.
- Unit tests for `AxisPopover`: renders all options, highlights current value, calls `onSelect` on click, closes after selection.
- Integration test: clicking axis item opens popover → selecting "Explosive" → `seederStore.config.axes.growth === "explosive"`.
- Integration test: navigating to Event editor → `studioExpanded === false`.

---

## Out of scope

- Sidebar collapsed (60px) state for axis sub-items — sub-items are hidden when sidebar is collapsed.
- Noise/anomalies axis editor beyond the existing `setAxis("anomalies", value)` call.
- Saving selected axis preset as a named preset (separate feature).
