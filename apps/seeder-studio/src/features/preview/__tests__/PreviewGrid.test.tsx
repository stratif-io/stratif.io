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

  it("renders KaTeX formula for each chart", () => {
    render(<PreviewGrid />);
    // MathFormula renders a span with data-testid="math-formula"
    // There should be at least 7 (one per chart)
    const formulas = screen.getAllByTestId("math-formula");
    expect(formulas.length).toBeGreaterThanOrEqual(7);
  });

  it("renders where lines with resolved values", () => {
    render(<PreviewGrid />);
    // engagement_depth "medium" → depth=10
    expect(screen.getByText(/d = 10/)).toBeInTheDocument();
    // stickiness "sticky" → peak=50%
    expect(screen.getByText(/peak = 50%/)).toBeInTheDocument();
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
