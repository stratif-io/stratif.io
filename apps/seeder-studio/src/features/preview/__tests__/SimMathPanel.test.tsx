import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimMathPanel } from "../SimMathPanel";

// Collapsible is not exported from the @stratif-io/web build yet;
// provide simple passthrough implementations for testing.
vi.mock("@stratif-io/web", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { useState } = await import("react");
  const React = await import("react");

  function Collapsible({
    open: controlledOpen,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const handleChange = (v: boolean) => {
      setInternalOpen(v);
      onOpenChange?.(v);
    };
    return React.createElement(
      "div",
      { "data-open": isOpen, "data-collapsible": true },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{
              _open?: boolean;
              _onToggle?: () => void;
            }>,
            {
              _open: isOpen,
              _onToggle: () => handleChange(!isOpen),
            },
          );
        }
        return child;
      }),
    );
  }

  function CollapsibleTrigger({
    children,
    asChild,
    _open: _open,
    _onToggle,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    _open?: boolean;
    _onToggle?: () => void;
  }) {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: () => void }>;
      return React.cloneElement(child, { onClick: _onToggle });
    }
    return React.createElement("button", { onClick: _onToggle }, children);
  }

  function CollapsibleContent({
    children,
    _open,
  }: {
    children: React.ReactNode;
    _open?: boolean;
  }) {
    if (!_open) return null;
    return React.createElement("div", null, children);
  }

  return { ...actual, Collapsible, CollapsibleTrigger, CollapsibleContent };
});

const entries = [
  {
    metric: "Active users",
    latex: "\\text{DAU}(t) = \\sum_c N_c",
    where: "where: peak = 50%, τ = 10d",
    explanation: "Active users per day.",
    variables: [{ symbol: "N_c", meaning: "cohort size on day c" }],
  },
];

describe("SimMathPanel", () => {
  it("renders the panel title", () => {
    render(<SimMathPanel entries={entries} />);
    expect(screen.getByText(/simulation math/i)).toBeInTheDocument();
  });

  it("content is hidden before opening", () => {
    render(<SimMathPanel entries={entries} />);
    expect(screen.queryByText("Active users")).not.toBeInTheDocument();
  });

  it("opens and shows metric entries on trigger click", async () => {
    const user = userEvent.setup();
    render(<SimMathPanel entries={entries} />);
    await user.click(screen.getByRole("button", { name: /simulation math/i }));
    expect(screen.getByText("Active users")).toBeInTheDocument();
  });

  it("shows where line for each entry when open", async () => {
    const user = userEvent.setup();
    render(<SimMathPanel entries={entries} />);
    await user.click(screen.getByRole("button", { name: /simulation math/i }));
    expect(screen.getByText("where: peak = 50%, τ = 10d")).toBeInTheDocument();
  });

  it("shows explanation for each entry when open", async () => {
    const user = userEvent.setup();
    render(<SimMathPanel entries={entries} />);
    await user.click(screen.getByRole("button", { name: /simulation math/i }));
    expect(screen.getByText("Active users per day.")).toBeInTheDocument();
  });
});
