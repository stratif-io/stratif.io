import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KpiCard } from "../KpiCard";

const values = Array.from({ length: 30 }, (_, i) => i * 10);

describe("KpiCard", () => {
  it("renders title and headline", () => {
    render(
      <KpiCard
        title="New users/day"
        values={values}
        headline="peak 290 · avg 145 · min 0"
        color="hsl(var(--chart-3))"
        expanded={false}
        onExpand={vi.fn()}
      />,
    );
    expect(screen.getByText("New users/day")).toBeInTheDocument();
    expect(screen.getByText(/peak 290/)).toBeInTheDocument();
  });

  it("calls onExpand when clicked", () => {
    const onExpand = vi.fn();
    render(
      <KpiCard
        title="Events/day"
        values={values}
        headline="peak 290"
        color="hsl(var(--chart-6))"
        expanded={false}
        onExpand={onExpand}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /events\/day/i }));
    expect(onExpand).toHaveBeenCalledOnce();
  });

  it("shows expanded indicator when expanded=true", () => {
    render(
      <KpiCard
        title="Events/day"
        values={values}
        headline="peak 290"
        color="hsl(var(--chart-6))"
        expanded={true}
        onExpand={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /events\/day/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
