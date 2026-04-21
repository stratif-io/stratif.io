import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders the SVG track container", () => {
    const { container } = render(<AnomalyTrack onEdit={() => {}} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("emits onEdit(index) when a pill is clicked", () => {
    const onEdit = vi.fn();
    render(<AnomalyTrack onEdit={onEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(onEdit).toHaveBeenCalledWith(0);
  });
});
