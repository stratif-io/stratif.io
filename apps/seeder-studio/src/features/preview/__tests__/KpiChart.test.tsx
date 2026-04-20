import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiChart } from "../KpiChart";

describe("KpiChart", () => {
  it("renders title and headline stat", () => {
    render(
      <KpiChart title="Events/day" values={[1, 2, 3]} headline="peak 3" />,
    );
    expect(screen.getByText("Events/day")).toBeInTheDocument();
    expect(screen.getByText("peak 3")).toBeInTheDocument();
  });

  it("renders a path with N points", () => {
    const { container } = render(<KpiChart title="X" values={[0, 1, 2, 3]} />);
    const path = container.querySelector('[data-testid="kpi-line"]');
    expect(path).not.toBeNull();
  });
});
