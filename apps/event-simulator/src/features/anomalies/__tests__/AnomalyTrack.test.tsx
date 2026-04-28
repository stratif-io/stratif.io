import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnomalyTrack } from "../AnomalyTrack";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("AnomalyTrack", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore.getState().loadPreset({
      ...blankConfig(),
      axes: { scale: "small" },
      events: [
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
    render(<AnomalyTrack />);
    expect(screen.getByRole("button", { name: /viral/i })).toBeInTheDocument();
  });

  it("renders the SVG track container", () => {
    const { container } = render(<AnomalyTrack />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
