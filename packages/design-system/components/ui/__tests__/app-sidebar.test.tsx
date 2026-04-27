import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppSidebar } from "../app-sidebar";
import type { SidebarSection } from "../app-sidebar";

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
});
