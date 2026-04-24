import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxisDropdown } from "../AxisDropdown";
import { AXIS_DISPLAY } from "../axisDisplaySpec";

const growthDisplay = AXIS_DISPLAY["growth"];

describe("AxisDropdown", () => {
  it("renders closed state with axis label and current value label", () => {
    render(
      <AxisDropdown
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("growth")).toBeInTheDocument();
    expect(screen.getByText("Strong growth")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown on trigger click, shows all options", async () => {
    const user = userEvent.setup();
    render(
      <AxisDropdown
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /growth/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    for (const v of growthDisplay.values) {
      expect(screen.getByText(v.label)).toBeInTheDocument();
    }
  });

  it("calls onChange with the new value when an option is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AxisDropdown
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /growth/i }));
    await user.click(screen.getByRole("option", { name: /Hockey stick/i }));
    expect(onChange).toHaveBeenCalledWith("hockey_stick");
  });

  it("closes after a selection", async () => {
    const user = userEvent.setup();
    render(
      <AxisDropdown
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /growth/i }));
    await user.click(screen.getByRole("option", { name: /Hockey stick/i }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("highlights the currently selected option", async () => {
    const user = userEvent.setup();
    render(
      <AxisDropdown
        axisDisplay={growthDisplay}
        currentValue="hockey_stick"
        onChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /growth/i }));
    const selected = screen.getByRole("option", { name: /Hockey stick/i });
    expect(selected).toHaveAttribute("aria-selected", "true");
  });
});
