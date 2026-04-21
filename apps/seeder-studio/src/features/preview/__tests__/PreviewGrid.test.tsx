import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviewGrid } from "../PreviewGrid";
import { headlineStat } from "../headlineStat";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("PreviewGrid", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("renders all five KPI titles", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/Events\/day/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Active users/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/New users/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stickiness/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Total users/i)).toBeInTheDocument();
  });

  it("renders the preview heading", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });
});

describe("PreviewGrid formula captions", () => {
  it("passes formula prop to Events/day KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/events\[t\]\s*=\s*dau\[t\]/i)).toBeInTheDocument();
  });

  it("passes formula prop to Active users KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/dau\[t\]\s*=/i)).toBeInTheDocument();
  });

  it("passes formula prop to New users KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/arrivals\[t\]\s*=/i)).toBeInTheDocument();
  });

  it("passes formula prop to Stickiness KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/stickiness\[t\]\s*=/i)).toBeInTheDocument();
  });

  it("passes formula prop to Total users KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/total_users\[t\]\s*=/i)).toBeInTheDocument();
  });

  it("passes formula prop to Churned users KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/churned\[t\]\s*=/i)).toBeInTheDocument();
  });

  it("passes formula prop to Reactivated users KpiChart", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/reactivated\[t\]\s*=/i)).toBeInTheDocument();
  });
});

describe("headlineStat formatting", () => {
  it("formats count values using formatNum (thousands → K)", () => {
    expect(headlineStat([12400, 8000, 500], "count")).toBe(
      "peak 12.4K · avg 7K · min 500",
    );
  });

  it("formats count values using formatNum (millions → M)", () => {
    expect(headlineStat([2_000_000, 1_500_000, 500_000], "count")).toBe(
      "peak 2M · avg 1.3M · min 500K",
    );
  });

  it("formats ratio values using formatNum (< 1 → 2dp)", () => {
    expect(headlineStat([0.35, 0.2], "ratio")).toBe("avg 0.28");
  });

  it("returns empty string for empty values array", () => {
    expect(headlineStat([], "count")).toBe("");
  });
});
