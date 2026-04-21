import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnomalyTrack } from "../AnomalyTrack";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("AnomalyTrack", () => {
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

  it("renders one pill per anomaly", () => {
    render(<AnomalyTrack onEdit={() => {}} />);
    expect(screen.getByRole("button", { name: /viral/i })).toBeInTheDocument();
  });

  it("anomaly type buttons add a new anomaly at a random position", async () => {
    const user = userEvent.setup();
    render(<AnomalyTrack onEdit={() => {}} />);
    await user.click(screen.getAllByRole("button", { name: /^\+ /i })[0]);
    expect(useSeederStore.getState().config.anomalies).toHaveLength(2);
  });

  it("emits onEdit(index) when a pill is clicked", () => {
    const onEdit = vi.fn();
    render(<AnomalyTrack onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(onEdit).toHaveBeenCalledWith(0);
  });
});
