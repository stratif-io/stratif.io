import { beforeEach, describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxisStrip } from "../AxisStrip";
import { useSeederStore, blankConfig } from "@/stores/seederStore";

function renderStrip() {
  render(<AxisStrip />);
}

describe("AxisStrip", () => {
  beforeEach(() => {
    useSeederStore.setState({ config: blankConfig(), dirty: false });
  });

  it("renders 6 axis chips", () => {
    renderStrip();
    expect(screen.getAllByRole("button").length).toBe(6);
  });

  it("renders chip labels: growth, retention, engagement, virality, scale, noise", () => {
    renderStrip();
    for (const label of [
      "growth",
      "retention",
      "engagement",
      "virality",
      "scale",
      "noise",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    }
  });

  it("dispatches setAxis when a value is selected", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(screen.getByRole("button", { name: /growth/i }));
    await user.click(screen.getByRole("option", { name: /Hockey stick/i }));
    const axes = useSeederStore.getState().config.axes;
    expect(axes["growth"]).toBe("hockey_stick");
  });
});
