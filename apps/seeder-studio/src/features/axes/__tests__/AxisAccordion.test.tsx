import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AxisAccordion } from "../AxisAccordion";
import { AXIS_DISPLAY } from "../axisDisplaySpec";

const growthDisplay = AXIS_DISPLAY["growth"];

describe("AxisAccordion", () => {
  it("renders collapsed with current value label", () => {
    render(
      <AxisAccordion
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={() => {}}
        open={false}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Strong growth")).toBeInTheDocument();
  });

  it("shows options when open=true", () => {
    render(
      <AxisAccordion
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={() => {}}
        open={true}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getAllByRole("option").length).toBeGreaterThan(1);
  });

  it("clicking an option calls onChange but NOT onOpenChange", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AxisAccordion
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={onChange}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole("option", { name: /weak growth/i }));
    expect(onChange).toHaveBeenCalledWith("weak");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("clicking the header toggle calls onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <AxisAccordion
        axisDisplay={growthDisplay}
        currentValue="strong"
        onChange={() => {}}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /growth/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
