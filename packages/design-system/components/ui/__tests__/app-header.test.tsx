import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppHeader } from "../app-header";

describe("AppHeader", () => {
  it("renders title", () => {
    render(<AppHeader title="Studio" />);
    expect(screen.getByText("Studio")).toBeInTheDocument();
  });

  it("renders children in the right slot", () => {
    render(
      <AppHeader>
        <button>Save</button>
      </AppHeader>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders badge", () => {
    render(<AppHeader badge={<span>Modified</span>} />);
    expect(screen.getByText("Modified")).toBeInTheDocument();
  });

  it("renders hamburger button when onMenuClick is provided", () => {
    render(<AppHeader onMenuClick={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /toggle sidebar/i }),
    ).toBeInTheDocument();
  });

  it("does not render hamburger when onMenuClick is absent", () => {
    render(<AppHeader title="No menu" />);
    expect(
      screen.queryByRole("button", { name: /toggle sidebar/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onMenuClick when hamburger is clicked", () => {
    const onMenuClick = vi.fn();
    render(<AppHeader onMenuClick={onMenuClick} />);
    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});
