import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomaliesPane } from "../AnomaliesPane";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("AnomaliesPane", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore.getState().loadPreset({
      ...blankConfig(),
      axes: { scale: "small" },
      anomalies: [
        {
          type: "marketing_campaign",
          name: "viral",
          start: "10d",
          duration: "5d",
          effect: { arrivals: 4 },
        },
      ],
    });
  });

  it("renders the track and no editor by default", () => {
    render(<AnomaliesPane />);
    expect(
      screen.queryByRole("heading", { name: /^Anomaly$/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking a pill does not open an editor panel", () => {
    render(<AnomaliesPane />);
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(
      screen.queryByRole("heading", { name: /^Anomaly$/i }),
    ).not.toBeInTheDocument();
  });
});
