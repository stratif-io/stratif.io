import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AxisPopover } from "../axis-popover";

const values = [
  {
    value: "declining",
    label: "Declining",
    description: "Churn exceeds acquisition",
    sparklinePoints: "0,4 14,8 28,14 40,20 52,26",
  },
  {
    value: "strong",
    label: "Strong growth",
    description: "Steady exponential",
    sparklinePoints: "0,26 12,22 24,16 36,9 52,4",
  },
  {
    value: "explosive",
    label: "Explosive",
    description: "Fast exponential",
    sparklinePoints: "0,26 10,22 22,16 36,8 52,2",
  },
];

describe("AxisPopover", () => {
  it("renders the trigger children", () => {
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });

  it("opens popover and shows all options when trigger is clicked", async () => {
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    expect(await screen.findByText("Declining")).toBeInTheDocument();
    expect(screen.getByText("Strong growth")).toBeInTheDocument();
    expect(screen.getByText("Explosive")).toBeInTheDocument();
  });

  it("highlights the current value row", async () => {
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    const selectedRow = await screen.findByRole("option", {
      name: /strong growth/i,
    });
    expect(selectedRow).toHaveAttribute("aria-selected", "true");
  });

  it("calls onSelect with the value when a row is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <AxisPopover
        axisId="growth"
        values={values}
        currentValue="strong"
        onSelect={onSelect}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    fireEvent.click(await screen.findByRole("option", { name: /declining/i }));
    expect(onSelect).toHaveBeenCalledWith("declining");
  });

  it("renders nothing inside popover when values is empty", () => {
    render(
      <AxisPopover
        axisId="growth"
        values={[]}
        currentValue=""
        onSelect={vi.fn()}
      >
        <button>Growth</button>
      </AxisPopover>,
    );
    fireEvent.click(screen.getByText("Growth"));
    // no option rows — no crash
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
