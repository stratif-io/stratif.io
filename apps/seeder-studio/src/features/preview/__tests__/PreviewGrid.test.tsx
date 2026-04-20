import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviewGrid } from "../PreviewGrid";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("PreviewGrid", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("renders all four KPI titles", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/Events\/day/i)).toBeInTheDocument();
    expect(screen.getByText(/Active users/i)).toBeInTheDocument();
    expect(screen.getByText(/New users/i)).toBeInTheDocument();
    expect(screen.getByText(/Stickiness/i)).toBeInTheDocument();
  });

  it("shows the approximate-preview badge", () => {
    render(<PreviewGrid />);
    expect(screen.getByText(/approximate/i)).toBeInTheDocument();
  });
});
