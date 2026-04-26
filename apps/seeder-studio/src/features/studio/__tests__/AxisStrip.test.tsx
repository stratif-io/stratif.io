import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AxisStrip } from "../AxisStrip";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

describe("AxisStrip", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("renders all 6 axis chips", () => {
    render(<AxisStrip />);
    expect(screen.getByText("growth")).toBeInTheDocument();
    expect(screen.getByText("retention")).toBeInTheDocument();
    expect(screen.getByText("engagement")).toBeInTheDocument();
    expect(screen.getByText("virality")).toBeInTheDocument();
    expect(screen.getByText("scale")).toBeInTheDocument();
    expect(screen.getByText("noise")).toBeInTheDocument();
  });

  it("clicking a chip shows its values in a popover", async () => {
    render(<AxisStrip />);
    fireEvent.click(screen.getByText("growth"));
    // "Strong growth" may appear in both chip and popover once the popover opens
    expect(
      (await screen.findAllByText("Strong growth")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Hockey stick")).toBeInTheDocument();
  });

  it("selecting a value calls setAxis and closes the popover", async () => {
    render(<AxisStrip />);
    fireEvent.click(screen.getByText("growth"));
    fireEvent.click(await screen.findByText("Hockey stick"));
    expect(useSeederStore.getState().config.axes.growth).toBe("hockey_stick");
    // popover should be closed — Hockey stick label moves to chip, popover gone
    // verify only 1 instance of "Hockey stick" (in chip, not popover)
    expect(screen.getAllByText("Hockey stick").length).toBe(1);
  });
});

describe("AxisStrip starting_rate input", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
    useSeederStore
      .getState()
      .loadPreset({ ...blankConfig(), axes: { scale: "small" } });
  });

  it("does not show starting_rate input in goal mode (no starting_rate)", () => {
    render(<AxisStrip />);
    expect(screen.queryByLabelText(/starting rate/i)).not.toBeInTheDocument();
  });

  it("shows starting_rate input when in rate mode", () => {
    useSeederStore.getState().setScaleConfig({ starting_rate: 100 });
    render(<AxisStrip />);
    expect(screen.getByLabelText(/starting rate/i)).toBeInTheDocument();
  });

  it("changing starting_rate updates the store", () => {
    useSeederStore.getState().setScaleConfig({ starting_rate: 100 });
    render(<AxisStrip />);
    const input = screen.getByLabelText(/starting rate/i);
    fireEvent.change(input, { target: { value: "250" } });
    expect(useSeederStore.getState().config.scale_config?.starting_rate).toBe(
      250,
    );
  });
});
