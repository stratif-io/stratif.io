# Simulator Sidebar Axis Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat axis nav items with a collapsible Studio group whose sub-items show current axis value badges and open sparkline popovers on click.

**Architecture:** Extend `AppSidebar`/`SidebarItem` with `badge`, `children`, `expanded`, `onToggleExpand` and an `itemWrapper` prop; create a new `AxisPopover` design-system component using Radix Popover; add `studioExpanded` to `seederStore`; rewire `App.tsx` to use the new structure; simplify `StudioLayout` to always render `KpiGrid` (no axis routing).

**Tech Stack:** React 18, TypeScript, Zustand, Radix UI Popover, Tailwind CSS v4, Vitest + Testing Library, Bun

---

## File Map

| File                                                                       | Action | Purpose                                                                                                                                    |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/design-system/components/ui/app-sidebar.tsx`                     | Modify | Add `badge`, `children`, `expanded`, `onToggleExpand` to `SidebarItem`; add `itemWrapper` to `AppSidebarProps`; render sub-items + chevron |
| `packages/design-system/components/ui/axis-popover.tsx`                    | Create | Radix Popover with sparkline rows; `side="right" align="start"`                                                                            |
| `packages/design-system/index.ts`                                          | Modify | Export `AxisPopover` and `AxisPopoverProps`                                                                                                |
| `packages/design-system/components/ui/__tests__/app-sidebar.test.tsx`      | Modify | Add tests for badge, children/expanded, chevron toggle, itemWrapper                                                                        |
| `packages/design-system/components/ui/__tests__/axis-popover.test.tsx`     | Create | Tests for rendering options, selecting value, highlighting current                                                                         |
| `apps/event-simulator/src/stores/seederStore.ts`                           | Modify | Add `studioExpanded: boolean`, `setStudioExpanded`; update `setActiveSection`                                                              |
| `apps/event-simulator/src/App.tsx`                                         | Modify | Rebuild `sidebarSections` with Studio group + axis children; wire `AxisPopover` via `itemWrapper`                                          |
| `apps/event-simulator/src/features/studio/StudioLayout.tsx`                | Modify | Remove axis routing + `ResizablePanel`; always render `KpiGrid`                                                                            |
| `apps/event-simulator/src/test/webMock.tsx`                                | Modify | Add `AxisPopover` mock; update `AppSidebar` mock to support new props                                                                      |
| `apps/event-simulator/src/features/studio/__tests__/StudioLayout.test.tsx` | Modify | Remove tests that depended on axis sections                                                                                                |

---

## Task 1: Extend `SidebarItem` and `AppSidebar` with sub-item support

**Files:**

- Modify: `packages/design-system/components/ui/app-sidebar.tsx`
- Modify: `packages/design-system/components/ui/__tests__/app-sidebar.test.tsx`

Context: `SidebarItem` currently has `key, label, icon, active?, onClick`. We're adding `badge?` (text pill), `children?` (sub-items), `expanded?` (shows/hides children), `onToggleExpand?` (called when chevron clicked). `AppSidebarProps` gains `itemWrapper?` so callers can wrap individual item buttons (used by App.tsx to inject AxisPopover). Sub-items are rendered with extra left padding when `item.expanded === true`. When sidebar is collapsed (60px), children are always hidden.

- [ ] **Step 1: Write failing tests for the new props**

Add these tests to `packages/design-system/components/ui/__tests__/app-sidebar.test.tsx` (insert after the existing tests):

```tsx
it("shows badge text next to item label", () => {
  const sections: SidebarSection[] = [
    {
      label: "",
      items: [
        {
          key: "growth",
          label: "Growth",
          icon: "📈",
          active: false,
          onClick: vi.fn(),
          badge: "Strong",
        },
      ],
    },
  ];
  render(
    <AppSidebar sections={sections} collapsed={false} onCollapse={vi.fn()} />,
  );
  expect(screen.getByText("Strong")).toBeInTheDocument();
});

it("shows sub-items when expanded=true", () => {
  const sections: SidebarSection[] = [
    {
      label: "",
      items: [
        {
          key: "studio",
          label: "Studio",
          icon: "📐",
          active: true,
          onClick: vi.fn(),
          expanded: true,
          onToggleExpand: vi.fn(),
          children: [
            {
              key: "growth",
              label: "Growth",
              icon: "📈",
              active: false,
              onClick: vi.fn(),
            },
          ],
        },
      ],
    },
  ];
  render(
    <AppSidebar sections={sections} collapsed={false} onCollapse={vi.fn()} />,
  );
  expect(screen.getByText("Growth")).toBeInTheDocument();
});

it("hides sub-items when expanded=false", () => {
  const sections: SidebarSection[] = [
    {
      label: "",
      items: [
        {
          key: "studio",
          label: "Studio",
          icon: "📐",
          active: true,
          onClick: vi.fn(),
          expanded: false,
          onToggleExpand: vi.fn(),
          children: [
            {
              key: "growth",
              label: "Growth",
              icon: "📈",
              active: false,
              onClick: vi.fn(),
            },
          ],
        },
      ],
    },
  ];
  render(
    <AppSidebar sections={sections} collapsed={false} onCollapse={vi.fn()} />,
  );
  expect(screen.queryByText("Growth")).not.toBeInTheDocument();
});

it("calls onToggleExpand when chevron is clicked", () => {
  const onToggleExpand = vi.fn();
  const sections: SidebarSection[] = [
    {
      label: "",
      items: [
        {
          key: "studio",
          label: "Studio",
          icon: "📐",
          active: true,
          onClick: vi.fn(),
          expanded: true,
          onToggleExpand,
          children: [
            {
              key: "growth",
              label: "Growth",
              icon: "📈",
              active: false,
              onClick: vi.fn(),
            },
          ],
        },
      ],
    },
  ];
  render(
    <AppSidebar sections={sections} collapsed={false} onCollapse={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /collapse studio/i }));
  expect(onToggleExpand).toHaveBeenCalledTimes(1);
});

it("renders item via itemWrapper when provided", () => {
  const sections: SidebarSection[] = [
    {
      label: "",
      items: [
        {
          key: "growth",
          label: "Growth",
          icon: "📈",
          active: false,
          onClick: vi.fn(),
        },
      ],
    },
  ];
  const itemWrapper = vi.fn((_item: SidebarItem, btn: React.ReactNode) => (
    <div data-testid="wrapped">{btn}</div>
  ));
  render(
    <AppSidebar
      sections={sections}
      collapsed={false}
      onCollapse={vi.fn()}
      itemWrapper={itemWrapper}
    />,
  );
  expect(screen.getByTestId("wrapped")).toBeInTheDocument();
  expect(itemWrapper).toHaveBeenCalledWith(
    expect.objectContaining({ key: "growth" }),
    expect.anything(),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/carlo/my_work/stratifio/stratifio-oss/.worktrees/simulator-design-system
bun run test:run -- packages/design-system/components/ui/__tests__/app-sidebar.test.tsx
```

Expected: 5 new tests FAIL (types don't exist yet, or runtime errors).

- [ ] **Step 3: Implement the extended `app-sidebar.tsx`**

Replace `packages/design-system/components/ui/app-sidebar.tsx` with:

```tsx
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export interface SidebarItem {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
  badge?: string;
  children?: SidebarItem[];
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface AppSidebarProps {
  sections: SidebarSection[];
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  brand?: ReactNode;
  footer?: ReactNode;
  className?: string;
  itemWrapper?: (item: SidebarItem, button: ReactNode) => ReactNode;
}

export function AppSidebar({
  sections,
  collapsed,
  onCollapse,
  brand,
  footer,
  className,
  itemWrapper,
}: AppSidebarProps) {
  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "flex flex-col shrink-0 bg-background border-r border-border overflow-hidden transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[220px]",
        className,
      )}
    >
      {brand && (
        <div
          className={cn(
            "h-14 flex items-center border-b border-border px-4 shrink-0",
            collapsed && "justify-center px-0",
          )}
        >
          {brand}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        <TooltipProvider delayDuration={0}>
          {sections.map((section) => (
            <div key={section.label || "__root__"}>
              {!collapsed && section.label && (
                <p className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.key}
                  item={item}
                  collapsed={collapsed}
                  itemWrapper={itemWrapper}
                />
              ))}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      <div
        className={cn(
          "py-2 border-t border-border",
          collapsed ? "flex justify-center" : "px-3",
        )}
      >
        <button
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs w-full"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            {collapsed ? (
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M11 7H3M6 4L3 7l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {footer && !collapsed && (
        <div className="px-4 py-3 border-t border-border text-[11px] text-muted-foreground">
          {footer}
        </div>
      )}
    </aside>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  itemWrapper,
  indent = false,
}: {
  item: SidebarItem;
  collapsed: boolean;
  itemWrapper?: (item: SidebarItem, button: ReactNode) => ReactNode;
  indent?: boolean;
}) {
  const hasChildren = !collapsed && item.children && item.children.length > 0;

  const button = (
    <button
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
        collapsed && "justify-center",
        indent && "pl-6",
        item.active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <span className="shrink-0 flex items-center justify-center w-5 h-5 text-base">
        {item.icon}
      </span>
      {!collapsed && (
        <span className="flex-1 truncate text-left">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">
          {item.badge}
        </span>
      )}
      {!collapsed && hasChildren && item.onToggleExpand && (
        <span className="sr-only">has sub-items</span>
      )}
    </button>
  );

  const wrappedButton = itemWrapper ? itemWrapper(item, button) : button;

  const chevron =
    !collapsed &&
    item.children &&
    item.children.length > 0 &&
    item.onToggleExpand ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          item.onToggleExpand!();
        }}
        aria-label={
          item.expanded ? `Collapse ${item.label}` : `Expand ${item.label}`
        }
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground shrink-0"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className={cn(
            "transition-transform duration-150",
            item.expanded && "rotate-90",
          )}
        >
          <path
            d="M3 2l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    ) : null;

  const row = chevron ? (
    <div className="flex items-center gap-0.5">
      <div className="flex-1 min-w-0">{wrappedButton}</div>
      <div className="pr-1">{chevron}</div>
    </div>
  ) : (
    wrappedButton
  );

  const withTooltip = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  ) : (
    row
  );

  return (
    <>
      <div className={cn(collapsed ? "px-2 py-0.5" : "px-2 py-0.5")}>
        {withTooltip}
      </div>
      {hasChildren &&
        item.expanded &&
        item.children!.map((child) => (
          <SidebarNavItem
            key={child.key}
            item={child}
            collapsed={collapsed}
            itemWrapper={itemWrapper}
            indent={true}
          />
        ))}
    </>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run -- packages/design-system/components/ui/__tests__/app-sidebar.test.tsx
```

Expected: all tests PASS (including the 5 new ones).

- [ ] **Step 5: Build the design system**

```bash
bun run build:lib
```

Expected: exits 0, `packages/design-system/dist/` updated.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/components/ui/app-sidebar.tsx \
        packages/design-system/components/ui/__tests__/app-sidebar.test.tsx
git commit -m "feat(design-system): extend SidebarItem with badge, children, expanded, itemWrapper"
```

---

## Task 2: Create `AxisPopover` component

**Files:**

- Create: `packages/design-system/components/ui/axis-popover.tsx`
- Create: `packages/design-system/components/ui/__tests__/axis-popover.test.tsx`
- Modify: `packages/design-system/index.ts`

Context: `AxisPopover` wraps a Radix `Popover` (`side="right" align="start"`). It renders a list of rows: 40×22 sparkline SVG | label (bold) | description (muted text). The selected row has `bg-primary/10 text-primary`. Clicking a row calls `onSelect(value)` and closes the popover. The `children` prop is the trigger element (the sidebar button).

The sparkline SVG points are passed as a string like `"0,26 12,22 24,16 36,9 52,4"` — just a polyline. Each `AxisDisplayValue` has: `value: string`, `label: string`, `description: string`, `sparklinePoints: string`. When `values` is empty or undefined the popover renders nothing.

- [ ] **Step 1: Write failing tests**

Create `packages/design-system/components/ui/__tests__/axis-popover.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AxisPopover } from "../axis-popover";

const values = [
  {
    value: "declining",
    label: "Declining",
    description: "Churn exceeds acquisition",
    sparklinePoints: "0,4 14,8 28,14 40,20 52,26",
  },
  {
    value: "strong",
    label: "Strong growth",
    description: "Steady exponential",
    sparklinePoints: "0,26 12,22 24,16 36,9 52,4",
  },
  {
    value: "explosive",
    label: "Explosive",
    description: "Fast exponential",
    sparklinePoints: "0,26 10,22 22,16 36,8 52,2",
  },
];

describe("AxisPopover", () => {
  it("renders the trigger children", () => {
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });

  it("opens popover and shows all options when trigger is clicked", async () => {
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    expect(await screen.findByText("Declining")).toBeInTheDocument();
    expect(screen.getByText("Strong growth")).toBeInTheDocument();
    expect(screen.getByText("Explosive")).toBeInTheDocument();
  });

  it("highlights the current value row", async () => {
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    const selectedRow = await screen.findByRole("option", {
      name: /strong growth/i,
    });
    expect(selectedRow).toHaveAttribute("aria-selected", "true");
  });

  it("calls onSelect with the value when a row is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={onSelect}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    fireEvent.click(await screen.findByRole("option", { name: /declining/i }));
    expect(onSelect).toHaveBeenCalledWith("declining");
  });

  it("renders nothing inside popover when values is empty", () => {
    render(
      <AxisPopover
        axisId="growth"
        values={[]}
        currentValue=""
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    // no option rows — no crash
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test:run -- packages/design-system/components/ui/__tests__/axis-popover.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `axis-popover.tsx`**

Create `packages/design-system/components/ui/axis-popover.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export interface AxisDisplayValue {
  value: string;
  label: string;
  description: string;
  sparklinePoints: string;
}

export interface AxisPopoverProps {
  axisId: string;
  values: AxisDisplayValue[];
  currentValue: string;
  onSelect: (value: string) => void;
  children: ReactNode;
}

export function AxisPopover({
  values,
  currentValue,
  onSelect,
  children,
}: AxisPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-60 p-1.5">
        <div role="listbox" aria-label="Select value">
          {values.map((v) => {
            const selected = v.value === currentValue;
            return (
              <button
                key={v.value}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(v.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left transition-colors",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground",
                )}
              >
                <svg
                  viewBox="0 0 52 28"
                  width="40"
                  height="22"
                  className={cn(
                    "shrink-0 rounded-sm border",
                    selected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-muted/30",
                  )}
                  aria-hidden="true"
                >
                  <polyline
                    points={v.sparklinePoints}
                    fill="none"
                    stroke={
                      selected
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))"
                    }
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-[11px] font-medium truncate",
                      selected && "font-semibold",
                    )}
                  >
                    {v.label}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] truncate",
                      selected ? "text-primary/70" : "text-muted-foreground",
                    )}
                  >
                    {v.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run -- packages/design-system/components/ui/__tests__/axis-popover.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Export from `packages/design-system/index.ts`**

In `packages/design-system/index.ts`, find the block that exports Popover and add after it:

```ts
export { AxisPopover } from "./components/ui/axis-popover";
export type {
  AxisPopoverProps,
  AxisDisplayValue,
} from "./components/ui/axis-popover";
```

- [ ] **Step 6: Build and run full design-system tests**

```bash
bun run build:lib
bun run test:run -- packages/design-system
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/components/ui/axis-popover.tsx \
        packages/design-system/components/ui/__tests__/axis-popover.test.tsx \
        packages/design-system/index.ts
git commit -m "feat(design-system): add AxisPopover component with sparkline rows"
```

---

## Task 3: Add `studioExpanded` to `seederStore`

**Files:**

- Modify: `apps/event-simulator/src/stores/seederStore.ts`

Context: `studioExpanded` defaults to `true`. `setActiveSection` is updated so setting `"events"` also sets `studioExpanded = false`, and setting `"studio"` sets `studioExpanded = true`. `setStudioExpanded` allows independent toggle (chevron click).

The store is in `apps/event-simulator/src/stores/seederStore.ts`. Current `setActiveSection`:

```ts
setActiveSection: (v) => set({ activeSection: v }),
```

- [ ] **Step 1: Write a failing test**

Find the store tests. If none exist, create `apps/event-simulator/src/stores/__tests__/seederStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useSeederStore } from "../seederStore";
import { act } from "@testing-library/react";

describe("seederStore — studioExpanded", () => {
  beforeEach(() => {
    act(() => {
      useSeederStore.setState({
        studioExpanded: true,
        activeSection: "studio",
      });
    });
  });

  it("studioExpanded defaults to true", () => {
    expect(useSeederStore.getState().studioExpanded).toBe(true);
  });

  it("setActiveSection('events') sets studioExpanded=false", () => {
    act(() => {
      useSeederStore.getState().setActiveSection("events");
    });
    expect(useSeederStore.getState().studioExpanded).toBe(false);
  });

  it("setActiveSection('studio') sets studioExpanded=true", () => {
    act(() => {
      useSeederStore.setState({ studioExpanded: false });
      useSeederStore.getState().setActiveSection("studio");
    });
    expect(useSeederStore.getState().studioExpanded).toBe(true);
  });

  it("setStudioExpanded toggles independently", () => {
    act(() => {
      useSeederStore.getState().setStudioExpanded(false);
    });
    expect(useSeederStore.getState().studioExpanded).toBe(false);
    expect(useSeederStore.getState().activeSection).toBe("studio");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test:run -- apps/event-simulator/src/stores/__tests__/seederStore.test.ts
```

Expected: FAIL — `studioExpanded` and `setStudioExpanded` don't exist yet.

- [ ] **Step 3: Update `seederStore.ts`**

In `apps/event-simulator/src/stores/seederStore.ts`:

Add to the interface (after `setActiveSection`):

```ts
studioExpanded: boolean;
setStudioExpanded: (v: boolean) => void;
```

Add to the store initializer (after `activeSection: "studio"`):

```ts
studioExpanded: true,
```

Add after `setActiveSection`:

```ts
setStudioExpanded: (v) => set({ studioExpanded: v }),
```

Replace `setActiveSection`:

```ts
setActiveSection: (v) =>
  set({
    activeSection: v,
    studioExpanded: v === "events" ? false : v === "studio" ? true : undefined,
  } as Partial<SeederState>),
```

Wait — using `undefined` in a set call won't work cleanly. Use a function form instead:

```ts
setActiveSection: (v) =>
  set((s) => ({
    activeSection: v,
    studioExpanded:
      v === "events" ? false : v === "studio" ? true : s.studioExpanded,
  })),
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test:run -- apps/event-simulator/src/stores/__tests__/seederStore.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/event-simulator/src/stores/seederStore.ts \
        apps/event-simulator/src/stores/__tests__/seederStore.test.ts
git commit -m "feat(simulator): add studioExpanded to seederStore with auto-toggle on setActiveSection"
```

---

## Task 4: Simplify `StudioLayout` — remove axis routing and `ResizablePanel`

**Files:**

- Modify: `apps/event-simulator/src/features/studio/StudioLayout.tsx`
- Modify: `apps/event-simulator/src/features/studio/__tests__/StudioLayout.test.tsx` (if it exists)

Context: `StudioLayout` currently tracks `panelOpen` state and routes `activeSection` to different content. Per spec, this is removed entirely. New behaviour: if `activeSection === "events"` render `<EventsTab />`; otherwise always render `<KpiGrid />`. No `ResizablePanel`, no axis placeholder, no `AXIS_SECTIONS` list. The `activeSection` prop stays for now (needed by App.tsx); it will only ever be `"studio"` or `"events"` after App.tsx is updated in Task 5.

- [ ] **Step 1: Check if StudioLayout tests exist**

```bash
ls apps/event-simulator/src/features/studio/__tests__/ 2>/dev/null || echo "no tests dir"
```

- [ ] **Step 2: Write a failing test**

If a `StudioLayout.test.tsx` exists, update it. Otherwise create `apps/event-simulator/src/features/studio/__tests__/StudioLayout.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StudioLayout } from "../StudioLayout";

vi.mock("@/features/events/EventsTab", () => ({
  EventsTab: () => <div data-testid="events-tab">Events</div>,
}));
vi.mock("../KpiGrid", () => ({
  KpiGrid: () => <div data-testid="kpi-grid">KpiGrid</div>,
}));

describe("StudioLayout", () => {
  it("renders KpiGrid when activeSection is studio", () => {
    render(<StudioLayout activeSection="studio" />);
    expect(screen.getByTestId("kpi-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("events-tab")).not.toBeInTheDocument();
  });

  it("renders EventsTab when activeSection is events", () => {
    render(<StudioLayout activeSection="events" />);
    expect(screen.getByTestId("events-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-grid")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail (or pass with old impl)**

```bash
bun run test:run -- apps/event-simulator/src/features/studio/__tests__/StudioLayout.test.tsx
```

- [ ] **Step 4: Replace `StudioLayout.tsx`**

```tsx
import { KpiGrid } from "./KpiGrid";
import { EventsTab } from "@/features/events/EventsTab";

interface Props {
  activeSection: string;
}

export function StudioLayout({ activeSection }: Props) {
  if (activeSection === "events") {
    return (
      <div className="h-full overflow-y-auto">
        <EventsTab />
      </div>
    );
  }
  return (
    <div className="flex-1 h-full overflow-y-auto">
      <KpiGrid />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun run test:run -- apps/event-simulator/src/features/studio/__tests__/StudioLayout.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/event-simulator/src/features/studio/StudioLayout.tsx \
        apps/event-simulator/src/features/studio/__tests__/StudioLayout.test.tsx
git commit -m "feat(simulator): simplify StudioLayout — always KpiGrid, remove axis routing and ResizablePanel"
```

---

## Task 5: Rewire `App.tsx` with Studio group + `AxisPopover`

**Files:**

- Modify: `apps/event-simulator/src/App.tsx`

Context: This is the main wiring task. We:

1. Remove the old flat axis items from `sidebarSections`
2. Build a Studio item with `children` = 6 axis sub-items (growth, stickiness, engagement_depth, virality, scale, anomalies)
3. Each axis sub-item shows `badge` = display label of current value (from `config.axes`)
4. Pass `itemWrapper` to `AppSidebar` that wraps each axis child in `<AxisPopover>`
5. `AxisPopover.onSelect` calls `setAxis(axisId, value)` and for `scale` also calls `setScaleConfig`
6. Remove axis entries from `SECTION_TITLES`
7. Add `studioExpanded` and `setStudioExpanded` from store
8. Studio item gets `expanded={studioExpanded}` and `onToggleExpand={() => setStudioExpanded(!studioExpanded)}`

The 6 axes shown in sidebar: `growth`, `stickiness`, `engagement_depth`, `virality`, `scale`, `anomalies`. Their icons, labels, and display values come from `AXIS_SPEC` in `apps/event-simulator/src/lib/twin/axisSpec.ts`.

For each axis, `badge` = `AXIS_SPEC[axisId].values.find(v => v.value === config.axes[axisId])?.label ?? config.axes[axisId] ?? AXIS_SPEC[axisId].default`.

The `sparklinePoints` for `AxisDisplayValue` needs to be defined. Since `axisSpec.ts` doesn't have sparkline points, we define them inline in App.tsx as a constant `AXIS_SPARKLINES`. Use these points that match the visual character of each growth value (these must be hardcoded):

```ts
const AXIS_SPARKLINES: Record<string, Record<string, string>> = {
  growth: {
    declining: "0,4 14,8 28,14 40,20 52,26",
    flat: "0,14 14,14 28,14 40,14 52,14",
    steady: "0,22 14,18 28,14 40,10 52,6",
    strong: "0,26 12,22 24,16 36,9 52,4",
    hockey_stick: "0,24 14,23 24,22 32,20 36,14 42,8 52,3",
    explosive: "0,26 10,22 22,16 36,8 52,2",
    seasonal: "0,14 10,8 26,3 36,8 46,14 52,18",
  },
  stickiness: {
    one_shot: "0,4 13,16 26,22 39,25 52,26",
    churn_heavy: "0,6 13,14 26,18 39,21 52,22",
    normal: "0,8 13,12 26,16 39,18 52,20",
    sticky: "0,10 13,11 26,12 39,13 52,14",
    addictive: "0,12 13,12 26,12 39,11 52,11",
    no_one_churns: "0,14 13,14 26,14 39,14 52,14",
  },
  engagement_depth: {
    shallow: "0,22 26,22 52,22",
    medium: "0,14 26,14 52,14",
    deep: "0,6 26,6 52,6",
  },
  virality: {
    none: "0,14 52,14",
    weak: "0,18 26,14 52,10",
    moderate: "0,22 26,14 52,4",
    strong_viral: "0,26 20,20 36,10 52,2",
  },
  scale: {
    tiny: "0,22 52,22",
    small: "0,18 52,18",
    medium: "0,12 52,12",
    large: "0,6 52,6",
  },
  anomalies: {
    none: "0,14 13,14 26,14 39,14 52,14",
    clean: "0,12 10,16 20,13 30,15 40,12 52,14",
    moderate: "0,10 8,18 16,11 24,17 32,9 40,16 52,13",
    explicit: "0,8 7,20 14,9 21,19 28,8 35,18 42,11 52,17",
  },
};
```

For axes with a `scale` value (the `scale` axis), when selected, also call:

```ts
const scaleParams = AXIS_SPEC.scale.values.find(
  (v) => v.value === selectedValue,
)?.params;
if (scaleParams) {
  setScaleConfig({
    total_users: scaleParams.total_users as number,
    window_days: scaleParams.window_days as number,
  });
}
```

- [ ] **Step 1: Read the current imports in App.tsx to know what to add/remove**

```bash
head -30 apps/event-simulator/src/App.tsx
```

- [ ] **Step 2: Add new imports**

At the top of `apps/event-simulator/src/App.tsx`, add these imports (after existing ones):

```ts
import { AxisPopover } from "@stratif-io/design-system";
import type { AxisDisplayValue, SidebarItem } from "@stratif-io/design-system";
import { AXIS_SPEC } from "./lib/twin/axisSpec";
```

Remove the individual axis icon imports that are no longer needed: `TrendingUp, RefreshCw, MessageCircle, Rocket, Target` (keep `LayoutDashboard`, `Zap`, `Users`, `Moon`, `Sun`). Also remove `Waves` if present.

Exact icons to keep from lucide: `LayoutDashboard`, `Zap`, `Users`, `Moon`, `Sun`.

Add these new icon imports instead:

```ts
import {
  LayoutDashboard,
  Zap,
  Users,
  Moon,
  Sun,
  TrendingUp,
  RefreshCw,
  MessageCircle,
  Rocket,
  Target,
  Activity,
} from "lucide-react";
```

(Keep all 6 axis icons — they're still used for the sidebar children items.)

- [ ] **Step 3: Add `AXIS_SPARKLINES` and sidebar axis config constants**

After the `SECTION_TITLES` constant, add:

```ts
const AXIS_SPARKLINES: Record<string, Record<string, string>> = {
  growth: {
    declining:    "0,4 14,8 28,14 40,20 52,26",
    flat:         "0,14 14,14 28,14 40,14 52,14",
    steady:       "0,22 14,18 28,14 40,10 52,6",
    strong:       "0,26 12,22 24,16 36,9 52,4",
    hockey_stick: "0,24 14,23 24,22 32,20 36,14 42,8 52,3",
    explosive:    "0,26 10,22 22,16 36,8 52,2",
    seasonal:     "0,14 10,8 26,3 36,8 46,14 52,18",
  },
  stickiness: {
    one_shot:      "0,4 13,16 26,22 39,25 52,26",
    churn_heavy:   "0,6 13,14 26,18 39,21 52,22",
    normal:        "0,8 13,12 26,16 39,18 52,20",
    sticky:        "0,10 13,11 26,12 39,13 52,14",
    addictive:     "0,12 13,12 26,12 39,11 52,11",
    no_one_churns: "0,14 13,14 26,14 39,14 52,14",
  },
  engagement_depth: {
    shallow: "0,22 26,22 52,22",
    medium:  "0,14 26,14 52,14",
    deep:    "0,6 26,6 52,6",
  },
  virality: {
    none:        "0,14 52,14",
    weak:        "0,18 26,14 52,10",
    moderate:    "0,22 26,14 52,4",
    strong_viral:"0,26 20,20 36,10 52,2",
  },
  scale: {
    tiny:   "0,22 52,22",
    small:  "0,18 52,18",
    medium: "0,12 52,12",
    large:  "0,6 52,6",
  },
  anomalies: {
    none:     "0,14 13,14 26,14 39,14 52,14",
    clean:    "0,12 10,16 20,13 30,15 40,12 52,14",
    moderate: "0,10 8,18 16,11 24,17 32,9 40,16 52,13",
    explicit: "0,8 7,20 14,9 21,19 28,8 35,18 42,11 52,17",
  },
};

const SIDEBAR_AXES: { id: string; label: string; icon: ReactNode }[] = [
  { id: "growth",           label: "Growth",      icon: <TrendingUp size={16} /> },
  { id: "stickiness",       label: "Retention",   icon: <RefreshCw size={16} /> },
  { id: "engagement_depth", label: "Engagement",  icon: <MessageCircle size={16} /> },
  { id: "virality",         label: "Virality",    icon: <Rocket size={16} /> },
  { id: "scale",            label: "Scale",       icon: <Target size={16} /> },
  { id: "anomalies",        label: "Noise",       icon: <Activity size={16} /> },
];
```

Also update `SECTION_TITLES` to remove axis keys:

```ts
const SECTION_TITLES: Record<string, string> = {
  studio: "Studio",
  events: "Event editor",
};
```

- [ ] **Step 4: Update store reads in App component**

In the `App` component function, add reads for the new store values (after existing store reads):

```ts
const studioExpanded = useSeederStore((s) => s.studioExpanded);
const setStudioExpanded = useSeederStore((s) => s.setStudioExpanded);
const setScaleConfig = useSeederStore((s) => s.setScaleConfig);
```

- [ ] **Step 5: Rebuild `sidebarSections`**

Replace the `sidebarSections` array (currently ~60 lines) with:

```ts
const sidebarSections = useMemo(() => {
  const resolvedAxes = config.axes ?? {};

  const axisChildren: SidebarItem[] = SIDEBAR_AXES.map(({ id, label, icon }) => {
    const currentVal = resolvedAxes[id] ?? AXIS_SPEC[id]?.default ?? "";
    const displayLabel =
      AXIS_SPEC[id]?.values.find((v) => v.value === currentVal)?.label ?? currentVal;
    return {
      key: id,
      label,
      icon,
      active: false,
      onClick: () => {},
      badge: displayLabel,
    };
  });

  return [
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
          children: axisChildren,
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
  ];
}, [config.axes, activeSection, studioExpanded, setActiveSection, setStudioExpanded]);
```

Note: `sidebarSections` uses `useMemo` — add `useMemo` to the React import if not already there (it is already imported).

- [ ] **Step 6: Add `itemWrapper` prop to `AppSidebar`**

In the JSX where `<AppSidebar` is rendered, add:

```tsx
itemWrapper={(item, btn) => {
  const axisDef = AXIS_SPEC[item.key];
  if (!axisDef) return btn;
  const currentVal = config.axes?.[item.key] ?? axisDef.default;
  const popoverValues: AxisDisplayValue[] = axisDef.values.map((v) => ({
    value: v.value,
    label: v.label,
    description: v.description,
    sparklinePoints: AXIS_SPARKLINES[item.key]?.[v.value] ?? "0,14 52,14",
  }));
  return (
    <AxisPopover
      axisId={item.key}
      values={popoverValues}
      currentValue={currentVal}
      onSelect={(val) => {
        setAxis(item.key, val);
        if (item.key === "scale") {
          const p = axisDef.values.find((v) => v.value === val)?.params;
          if (p) {
            setScaleConfig({
              total_users: p.total_users as number,
              window_days: p.window_days as number,
            });
          }
        }
      }}
    >
      {btn}
    </AxisPopover>
  );
}}
```

Also add `setAxis` to the store reads if not already present:

```ts
const setAxis = useSeederStore((s) => s.setAxis);
```

- [ ] **Step 7: Lint check**

```bash
bun run lint
```

Fix any errors (unused imports, missing deps in useMemo, etc.).

- [ ] **Step 8: Build**

```bash
bun run build
```

Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add apps/event-simulator/src/App.tsx
git commit -m "feat(simulator): rebuild sidebar with Studio collapsible group and AxisPopover"
```

---

## Task 6: Update `webMock.tsx` and fix integration tests

**Files:**

- Modify: `apps/event-simulator/src/test/webMock.tsx`

Context: `webMock.tsx` is the vitest alias for `@stratif-io/design-system` in the simulator. It must export `AxisPopover`, `AxisDisplayValue`, and the updated `AppSidebar` (with new props). The mock `AppSidebar` must handle `itemWrapper` and render children items when `expanded=true` so integration tests that check sidebar structure continue to work.

- [ ] **Step 1: Run tests before changing the mock**

```bash
bun run test:run
```

Note how many pass/fail.

- [ ] **Step 2: Update `webMock.tsx`**

In `apps/event-simulator/src/test/webMock.tsx`:

Update the `AppSidebar` mock to handle the new props:

```tsx
export function AppSidebar({
  brand,
  sections,
  collapsed: _collapsed,
  onCollapse: _onCollapse,
  itemWrapper,
}: {
  brand?: React.ReactNode;
  sections?: {
    label: string;
    items: {
      key: string;
      label: string;
      icon?: React.ReactNode;
      active?: boolean;
      onClick?: () => void;
      badge?: string;
      expanded?: boolean;
      onToggleExpand?: () => void;
      children?: {
        key: string;
        label: string;
        icon?: React.ReactNode;
        active?: boolean;
        onClick?: () => void;
        badge?: string;
      }[];
    }[];
  }[];
  collapsed?: boolean;
  onCollapse?: (v: boolean) => void;
  itemWrapper?: (
    item: { key: string; label: string },
    btn: React.ReactNode,
  ) => React.ReactNode;
}) {
  return (
    <nav data-testid="app-sidebar">
      {brand}
      {sections?.map((section) =>
        section.items.map((item) => {
          const btn = (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
              {item.badge && (
                <span data-testid={`badge-${item.key}`}>{item.badge}</span>
              )}
            </button>
          );
          const wrapped = itemWrapper
            ? itemWrapper(item as Parameters<typeof itemWrapper>[0], btn)
            : btn;
          return (
            <React.Fragment key={item.key}>
              {wrapped}
              {item.expanded &&
                item.children?.map((child) => {
                  const childBtn = (
                    <button key={child.key} onClick={child.onClick}>
                      {child.label}
                      {child.badge && (
                        <span data-testid={`badge-${child.key}`}>
                          {child.badge}
                        </span>
                      )}
                    </button>
                  );
                  return itemWrapper
                    ? itemWrapper(
                        child as Parameters<typeof itemWrapper>[0],
                        childBtn,
                      )
                    : childBtn;
                })}
            </React.Fragment>
          );
        }),
      )}
    </nav>
  );
}
export type AppSidebarProps = React.ComponentProps<typeof AppSidebar>;
```

Add `AxisPopover` mock after the other mocks:

```tsx
export function AxisPopover({
  children,
  onSelect: _onSelect,
  values: _values,
  currentValue: _currentValue,
}: {
  children: React.ReactNode;
  axisId?: string;
  values?: unknown[];
  currentValue?: string;
  onSelect?: (v: string) => void;
}) {
  return <>{children}</>;
}
export type AxisDisplayValue = {
  value: string;
  label: string;
  description: string;
  sparklinePoints: string;
};
export type AxisPopoverProps = React.ComponentProps<typeof AxisPopover>;
```

- [ ] **Step 3: Run all simulator tests**

```bash
bun run test:run -- apps/event-simulator
```

Expected: all pass. Fix any remaining failures by adjusting test expectations that referenced removed axis sections (e.g., `activeSection === "growth"` no longer exists — replace with `"studio"`).

- [ ] **Step 4: Commit**

```bash
git add apps/event-simulator/src/test/webMock.tsx
git commit -m "test(simulator): update webMock for AxisPopover and extended AppSidebar props"
```

---

## Task 7: Full build and test validation

**Files:** None (validation only)

- [ ] **Step 1: Run the full test suite**

```bash
bun run test:run
```

Expected: all tests pass.

- [ ] **Step 2: Full TypeScript + build check**

```bash
bun run build
```

Expected: exits 0.

- [ ] **Step 3: Lint check**

```bash
bun run lint
```

Expected: zero warnings, exits 0.

- [ ] **Step 4: If anything fails, fix and commit incrementally**

For TypeScript errors: read the error, find the file, fix the type mismatch.
For lint errors: fix the flagged line (unused imports are common after refactor).
For test failures: check if a test is asserting old axis section behaviour and update it.

- [ ] **Step 5: Final commit if there were fixes**

```bash
git add -p   # stage only what changed
git commit -m "fix: post-refactor type and lint cleanup"
```
