import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MathFormula } from "../MathFormula";

describe("MathFormula", () => {
  it("renders a container with data-testid", () => {
    render(<MathFormula latex="\text{DAU}(t) = \sum_c N_c" />);
    expect(screen.getByTestId("math-formula")).toBeInTheDocument();
  });

  it("renders display mode with block element when display=true", () => {
    const { container } = render(<MathFormula latex="\frac{a}{b}" display />);
    expect(container.querySelector(".katex-display")).toBeTruthy();
  });

  it("renders inline mode (no katex-display class) when display is false", () => {
    const { container } = render(<MathFormula latex="x^2" />);
    expect(container.querySelector(".katex-display")).toBeNull();
  });
});
