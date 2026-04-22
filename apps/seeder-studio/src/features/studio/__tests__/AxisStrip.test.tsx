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
    expect(await screen.findByText("Strong growth")).toBeInTheDocument();
    expect(screen.getByText("Hockey stick")).toBeInTheDocument();
  });

  it("selecting a value calls setAxis and closes the popover", async () => {
    render(<AxisStrip />);
    fireEvent.click(screen.getByText("growth"));
    fireEvent.click(await screen.findByText("Decline"));
    expect(useSeederStore.getState().config.axes.growth).toBe("decline");
    expect(screen.queryByText("Strong growth")).not.toBeInTheDocument();
  });
});
