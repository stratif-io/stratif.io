# Simulator Design System Redesign

**Date:** 2026-04-27
**Branch:** feature/simulator-design-system
**Goal:** Make the event-simulator app look and feel like the analytics app by adopting the same app shell pattern, migrating layout primitives into the design system, and aligning visual structure.

---

## Decisions

| Decision            | Choice                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| Layout approach     | Full analytics-style layout (sidebar + header + content)                  |
| Sidebar content     | Config sections (Growth, Retention, Engagement, Virality, Scale + Events) |
| Sidebar behavior    | Collapsible (220px expanded / 60px collapsed with icons + tooltips)       |
| Component ownership | Every new component goes in `packages/design-system`                      |

---

## Architecture

### App shell

Replace the simulator's current `flex-col (TopBar + StudioLayout)` with the same shell pattern as analytics:

```
flex-row:
  AppSidebar          ← design system, configured by app
  flex-col:
    AppHeader         ← design system, configured by app
    <content area>    ← scrollable, max-width container
```

### Design system additions

Two new components in `packages/design-system/components/ui/`:

#### `AppSidebar`

Generic collapsible sidebar. Props:

```ts
interface AppSidebarProps {
  sections: SidebarSection[]; // nav groups with items
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  brand?: ReactNode; // top-left logo/title slot
  footer?: ReactNode; // bottom slot
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}
```

Behavior:

- Expanded: 220px, shows icon + label
- Collapsed: 60px, shows icon only with Tooltip
- Collapse toggle button at the bottom of the nav
- Smooth width transition (CSS transition, not layout shift)
- Active item highlighted with `bg-primary/10 text-primary`

#### `AppHeader`

Generic sticky header shell. Props:

```ts
interface AppHeaderProps {
  onMenuClick?: () => void; // hamburger callback
  title?: string;
  badge?: ReactNode; // e.g. "Modified" badge
  children?: ReactNode; // right-side actions slot
}
```

Fixed 56px height, `border-b`, `bg-background`. Same visual style as the existing analytics `Header`.

### Analytics app refactor

The analytics `apps/analytics/frontend/components/layout/Sidebar.tsx` and `Header.tsx` are refactored to use `AppSidebar` and `AppHeader` from the design system. Their analytics-specific content (nav items, ConnectionSelector, GlobalFilters, QueryStatusIndicator) is passed as props/children. No behavioral change.

### Simulator app

`TopBar.tsx` is replaced by `AppHeader` configured with:

- Hamburger (toggles sidebar collapsed state)
- Title: current page name
- Badge: "Modified" when dirty
- Right slot: preset selector, date range, users input, `+ Event` button, theme toggle

The sidebar uses `AppSidebar` configured with:

```
SIMULATION
  Studio     (📐)  — KpiGrid overview (default view)
  Growth     (📈)
  Retention  (🔄)
  Engagement (💬)
  Virality   (🚀)
  Scale      (🎯)
EVENTS
  Event editor (⚡)
```

Sidebar collapsed state stored in `seederStore` (Zustand), persisted to localStorage under key `seeder-sidebar-collapsed`.

### What is removed

| Removed                        | Replaced by                         |
| ------------------------------ | ----------------------------------- |
| `TopBar.tsx`                   | `AppHeader` (from design system)    |
| `AxisStrip` (tab bar)          | `AppSidebar` nav items              |
| Inline scale badge in TopBar   | PageHeader subtitle                 |
| `apps/analytics/…/Sidebar.tsx` | `AppSidebar` + analytics nav config |
| `apps/analytics/…/Header.tsx`  | `AppHeader` + analytics slots       |

### Content area

- Each sidebar item navigates to a section (client-side routing or conditional render)
- **Studio** = current KpiGrid — uses `PageHeader` + `SectionHeader` from design system
- **Growth / Retention / etc.** = current axis config panels, promoted to full-width pages
- **Event editor** = current Events tab content

---

## Data flow

```
seederStore
  ├── sidebarCollapsed: boolean   (new)
  ├── activeSection: string       (new, default "studio")
  └── ... existing state

AppSidebar ← reads sidebarCollapsed, activeSection from store
AppHeader  ← reads dirty, activeSection from store
Content    ← reads activeSection, renders appropriate page
```

---

## Error handling

- `AppSidebar` with empty `sections` renders nothing (no crash)
- `AppHeader` without `onMenuClick` hides hamburger
- Sidebar collapsed state falls back to `false` if localStorage is unavailable

---

## Testing

- Unit tests for `AppSidebar`: renders sections, toggles collapse, shows tooltips when collapsed, active item styling
- Unit tests for `AppHeader`: renders title, badge, children, calls `onMenuClick`
- Integration test: sidebar nav item click updates `activeSection` in store → correct content renders
- Analytics app Sidebar/Header tests updated to use new primitives (behavior unchanged)

---

## Out of scope

- Analytics app visual changes beyond the Sidebar/Header refactor
- Mobile responsive behaviour (deferred)
- Simulator routing (React Router) — sections use conditional render for now
- Dark mode sidebar styling (tokens already work, no extra work needed)
