import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      screen.getByRole("button", { name: /\+ anomaly/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Anomaly$/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking a pill opens the editor", () => {
    render(<AnomaliesPane />);
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(
      screen.getByRole("heading", { name: /^Anomaly$/i }),
    ).toBeInTheDocument();
  });

  it("delete removes the anomaly from the store", async () => {
    const user = userEvent.setup();
    render(<AnomaliesPane />);
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(useSeederStore.getState().config.anomalies ?? []).toHaveLength(0);
  });
});
