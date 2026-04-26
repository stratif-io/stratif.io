import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KpiCard } from "../KpiCard";
import { KpiCardExpanded } from "../KpiCardExpanded";
import { useSeederStore, blankConfig } from "@/stores/seederStore";
import { KpiGrid } from "../KpiGrid";

const mockPreviewResult = {
  days: Array.from({ length: 90 }, (_, i) => i),
  new_users: Array(90).fill(2),
  active_users: Array(90).fill(2),
  churned: Array(90).fill(2),
  reactivated: Array(90).fill(2),
  events: Array(90).fill(2),
  stickiness: Array(90).fill(0.5),
  growth_curve: Array(90).fill(0),
  anomaly_curve: Array(90).fill(0),
  jitter_curve: Array(90).fill(0),
  virality_curve: Array(90).fill(0),
};

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

  it("shows a loading indicator when isLoading is true", () => {
    render(
      <KpiCard
        title="New users/day"
        values={values}
        headline="peak 290 · avg 145 · min 0"
        color="hsl(var(--chart-3))"
        expanded={false}
        onExpand={vi.fn()}
        isLoading={true}
      />,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("does not show loading indicator when isLoading is false", () => {
    render(
      <KpiCard
        title="New users/day"
        values={values}
        headline="peak 290"
        color="hsl(var(--chart-3))"
        expanded={false}
        onExpand={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPreviewResult),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders formula section with MathFormula", async () => {
    render(<KpiCardExpanded metricKey="events" onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("math-formula").length).toBeGreaterThan(0),
    );
  });

  it("renders 7 day rows in breakdown table", async () => {
    render(<KpiCardExpanded metricKey="events" onClose={vi.fn()} />);
    await waitFor(
      () => {
        for (let d = 1; d <= 7; d++) {
          expect(screen.getAllByText(`${d}`).length).toBeGreaterThan(0);
        }
      },
      { timeout: 2000 },
    );
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
  ] as const)("renders 7 rows for %s", async (key) => {
    render(<KpiCardExpanded metricKey={key} onClose={vi.fn()} />);
    // Wait for all 7 day rows (accounts for debounce + fetch)
    await waitFor(
      () => {
        for (let d = 1; d <= 7; d++) {
          expect(screen.getAllByText(`${d}`).length).toBeGreaterThan(0);
        }
      },
      { timeout: 2000 },
    );
  });

  it('shows "Total users" label in goal-driven mode', async () => {
    // goal mode: no starting_rate in scale_config
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
    render(<KpiCardExpanded metricKey="totalUsers" onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("math-formula").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Total users").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("~Total users")).toHaveLength(0);
  });

  it('shows "~Total users" label in rate-driven mode', async () => {
    // rate mode: starting_rate is set
    useSeederStore.getState().loadPreset({
      ...blankConfig(),
      axes: { scale: "small" },
      scale_config: { starting_rate: 10, window_days: 30 },
    });
    render(<KpiCardExpanded metricKey="totalUsers" onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByTestId("math-formula").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("~Total users").length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^Total users$/)).toHaveLength(0);
  });
});

describe("KpiGrid", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPreviewResult),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders all 7 KPI card titles", () => {
    render(<KpiGrid />);
    expect(screen.getByText("New users/day")).toBeInTheDocument();
    expect(screen.getByText("Total users")).toBeInTheDocument();
    expect(screen.getByText("Stickiness")).toBeInTheDocument();
    expect(screen.getByText("Active users")).toBeInTheDocument();
    expect(screen.getByText("Events/day")).toBeInTheDocument();
    expect(screen.getByText("Churned/day")).toBeInTheDocument();
    expect(screen.getByText("Reactivated/day")).toBeInTheDocument();
  });

  it("clicking a card opens its expanded view", async () => {
    render(<KpiGrid />);
    fireEvent.click(screen.getByRole("button", { name: /events\/day/i }));
    expect(
      (await screen.findAllByTestId("math-formula")).length,
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getAllByText("1").length).toBeGreaterThan(0),
    );
  });

  it("clicking another card collapses the first", async () => {
    render(<KpiGrid />);
    fireEvent.click(screen.getByRole("button", { name: /events\/day/i }));
    await screen.findAllByTestId("math-formula");
    fireEvent.click(screen.getByRole("button", { name: /stickiness/i }));
    // After switching to stickiness, only one expanded panel should exist
    const expandedPanels = screen.getAllByText(/Daily trace · \d+ days/);
    expect(expandedPanels).toHaveLength(1);
  });
});
