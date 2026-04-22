import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KpiCard } from "../KpiCard";
import { KpiCardExpanded } from "../KpiCardExpanded";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

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

describe("KpiCardExpanded", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("renders formula section with MathFormula", () => {
    render(<KpiCardExpanded metricKey="events" onClose={vi.fn()} />);
    expect(screen.getAllByTestId("math-formula").length).toBeGreaterThan(0);
  });

  it("renders 7 day rows in breakdown table", () => {
    render(<KpiCardExpanded metricKey="events" onClose={vi.fn()} />);
    for (let d = 1; d <= 7; d++) {
      expect(screen.getByText(`d${d}`)).toBeInTheDocument();
    }
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<KpiCardExpanded metricKey="events" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    "activeUsers",
    "newUsers",
    "stickiness",
    "totalUsers",
    "churnedUsers",
    "reactivatedUsers",
  ] as const)("renders 7 rows for %s", (key) => {
    render(<KpiCardExpanded metricKey={key} onClose={vi.fn()} />);
    for (let d = 1; d <= 7; d++) {
      expect(screen.getByText(`d${d}`)).toBeInTheDocument();
    }
  });
});
