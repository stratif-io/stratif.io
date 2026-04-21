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

  it("renders all seven KPI titles", () => {
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
  it("renders formula captions for each KPI chart", () => {
    render(<PreviewGrid />);
    expect(screen.getAllByText(/DAU.*Poisson/)).toHaveLength(1); // Active users
    expect(screen.getByText(/DAU \/ MAU/)).toBeInTheDocument();
    expect(screen.getByText(/S\[k−1\]−S\[k\]/)).toBeInTheDocument(); // no spaces in new formula
    expect(screen.getByText(/events.*×/)).toBeInTheDocument(); // dynamic depth value
    expect(screen.getByText(/N꜀\s*=\s*Poisson/)).toBeInTheDocument();
    expect(screen.getByText(/Σ꜀≤t/)).toBeInTheDocument();
    expect(screen.getByText(/churned꜀/)).toBeInTheDocument();
  });

  it("formula captions include resolved parameter values", () => {
    render(<PreviewGrid />);
    // engagement_depth "medium" → depth=10
    expect(screen.getByText(/× 10/)).toBeInTheDocument();
    // stickiness "sticky" → peakChurnRate=50%, churnDecayDays=10
    expect(screen.getAllByText(/peak=50%/)).toHaveLength(2); // in Active users and Churned/day
    expect(screen.getAllByText(/τ=10d/)).toHaveLength(2); // in Active users and Churned/day
    // reactivationRate=5%, reactivationDecay=0.8
    expect(screen.getByText(/r=5%/)).toBeInTheDocument();
    expect(screen.getByText(/δ=0\.8/)).toBeInTheDocument();
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
