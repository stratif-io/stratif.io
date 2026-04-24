import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkovMatrix } from "@/features/events/MarkovMatrix";
import type { MarkovConfig } from "@/types/simulation";

const CONFIG: MarkovConfig = {
  events: [{ name: "A" }, { name: "B" }],
  start: { A: 1.0 },
  transitions: {
    A: { B: 0.5, "[end]": 0.5 },
    B: { "[end]": 1.0 },
  },
};

describe("MarkovMatrix", () => {
  it("renders event names as row headers", () => {
    render(<MarkovMatrix config={CONFIG} onChange={vi.fn()} />);
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
  });

  it("renders [end] column", () => {
    render(<MarkovMatrix config={CONFIG} onChange={vi.fn()} />);
    expect(screen.getAllByText("[end]").length).toBeGreaterThan(0);
  });

  it("renders transition probabilities as inputs", () => {
    render(<MarkovMatrix config={CONFIG} onChange={vi.fn()} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("calls onChange when a cell value is edited", () => {
    const onChange = vi.fn();
    render(<MarkovMatrix config={CONFIG} onChange={onChange} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "0.3" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows row sum when row does not sum to 1", () => {
    const badConfig: MarkovConfig = {
      ...CONFIG,
      transitions: { A: { B: 0.3, "[end]": 0.3 }, B: { "[end]": 1.0 } },
    };
    render(<MarkovMatrix config={badConfig} onChange={vi.fn()} />);
    expect(screen.getByText(/0\.60/)).toBeInTheDocument();
  });
});
