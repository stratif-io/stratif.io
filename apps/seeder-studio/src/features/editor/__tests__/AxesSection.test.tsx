import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxesSection } from "../AxesSection";
import { useSeederStore } from "@/stores/seederStore";

describe("AxesSection", () => {
  beforeEach(() => {
    useSeederStore.setState(useSeederStore.getInitialState(), true);
  });

  it("renders a row per axis (8 axes)", () => {
    render(<AxesSection />);
    for (const label of [
      "Growth",
      "Stickiness",
      "Depth",
      "Monetization",
      "Virality",
      "Scale",
      "Geography",
      "Anomalies",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("clicking a segmented value updates the store", async () => {
    const user = userEvent.setup();
    render(<AxesSection />);
    await user.click(screen.getByRole("radio", { name: "hockey_stick" }));
    expect(useSeederStore.getState().config.axes.growth).toBe("hockey_stick");
  });

  it("segment matching axis default has ring-1 when a non-default value is selected", () => {
    // growth default is "strong"; set it to something else so ring shows on "strong"
    useSeederStore.getState().setAxis("growth", "weak");
    render(<AxesSection />);
    expect(screen.getByRole("radio", { name: "strong" })).toHaveClass("ring-1");
  });

  it("reflects current store value as active", () => {
    useSeederStore.getState().setAxis("stickiness", "addictive");
    render(<AxesSection />);
    expect(screen.getByRole("radio", { name: "addictive" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });
});
