import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppSidebar } from "../app-sidebar";
import type { SidebarSection, SidebarItem } from "../app-sidebar";

const sections: SidebarSection[] = [
  {
    label: "Simulation",
    items: [
      {
        key: "studio",
        label: "Studio",
        icon: "📐",
        active: true,
        onClick: vi.fn(),
      },
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

describe("AppSidebar", () => {
  it("renders section label and items when expanded", () => {
    render(
      <AppSidebar sections={sections} collapsed={false} onCollapse={vi.fn()} />,
    );
    expect(screen.getByText("Simulation")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });

  it("hides labels when collapsed", () => {
    render(
      <AppSidebar sections={sections} collapsed={true} onCollapse={vi.fn()} />,
    );
    expect(screen.queryByText("Simulation")).not.toBeInTheDocument();
    expect(screen.queryByText("Studio")).not.toBeInTheDocument();
  });

  it("applies active styling to the active item", () => {
    render(
      <AppSidebar sections={sections} collapsed={false} onCollapse={vi.fn()} />,
    );
    const studioBtn = screen.getByRole("button", { name: /studio/i });
    expect(studioBtn).toHaveAttribute("aria-current", "page");
  });

  it("calls onCollapse when collapse button is clicked", () => {
    const onCollapse = vi.fn();
    render(
      <AppSidebar
        sections={sections}
        collapsed={false}
        onCollapse={onCollapse}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(onCollapse).toHaveBeenCalledWith(true);
  });

  it("calls onCollapse(false) when expand button is clicked while collapsed", () => {
    const onCollapse = vi.fn();
    render(
      <AppSidebar
        sections={sections}
        collapsed={true}
        onCollapse={onCollapse}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /expand sidebar/i }));
    expect(onCollapse).toHaveBeenCalledWith(false);
  });

  it("calls item onClick when nav item is clicked", () => {
    const onClick = vi.fn();
    const s: SidebarSection[] = [
      {
        label: "X",
        items: [
          { key: "a", label: "Alpha", icon: "A", active: false, onClick },
        ],
      },
    ];
    render(<AppSidebar sections={s} collapsed={false} onCollapse={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /alpha/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders brand slot", () => {
    render(
      <AppSidebar
        sections={[]}
        collapsed={false}
        onCollapse={vi.fn()}
        brand={<span>My Brand</span>}
      />,
    );
    expect(screen.getByText("My Brand")).toBeInTheDocument();
  });

  it("renders footer slot when expanded", () => {
    render(
      <AppSidebar
        sections={[]}
        collapsed={false}
        onCollapse={vi.fn()}
        footer={<span>Footer text</span>}
      />,
    );
    expect(screen.getByText("Footer text")).toBeInTheDocument();
  });

  it("hides footer when collapsed", () => {
    render(
      <AppSidebar
        sections={[]}
        collapsed={true}
        onCollapse={vi.fn()}
        footer={<span>Footer text</span>}
      />,
    );
    expect(screen.queryByText("Footer text")).not.toBeInTheDocument();
  });

  it("renders nothing (no crash) with empty sections", () => {
    render(<AppSidebar sections={[]} collapsed={false} onCollapse={vi.fn()} />);
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
  });

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

  it("hides sub-items when sidebar is collapsed even if expanded=true", () => {
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
      <AppSidebar sections={sections} collapsed={true} onCollapse={vi.fn()} />,
    );
    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
  });
});
