import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiChart } from "../KpiChart";
import { formatNum } from "@/lib/format";

describe("KpiChart", () => {
  it("renders title and headline stat", () => {
    render(
      <KpiChart title="Events/day" values={[1, 2, 3]} headline="peak 3" />,
    );
    expect(screen.getByText("Events/day")).toBeInTheDocument();
    expect(screen.getByText("peak 3")).toBeInTheDocument();
  });

  it("renders the recharts chart container", () => {
    const { container } = render(<KpiChart title="X" values={[0, 1, 2, 3]} />);
    // Recharts renders inside a div with h-32
    expect(container.querySelector(".h-32")).not.toBeNull();
  });
});

describe("KpiChart bands + guide", () => {
  it("renders without crashing when bands are provided", () => {
    const { container } = render(
      <KpiChart
        title="X"
        values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
        bands={[{ start: 2, end: 5, color: "#ef476f" }]}
      />,
    );
    // ResponsiveContainer in jsdom has width=0 so ReferenceArea rects may not render.
    // Assert the component accepted the props without throwing.
    expect(container.querySelector(".h-32")).not.toBeNull();
  });

  it("renders without crashing (no guideIndex prop)", () => {
    const { container } = render(<KpiChart title="X" values={[0, 1, 2, 3]} />);
    expect(container.querySelector(".h-32")).not.toBeNull();
  });
});

describe("KpiChart tooltip formatter via formatNum", () => {
  it("formatNum formats thousands values for tooltip display", () => {
    // Validates the formatter logic used in the Tooltip: formatNum(v)
    expect(formatNum(12400)).toBe("12.4K");
    expect(formatNum(0.35)).toBe("0.35");
    expect(formatNum(2_000_000)).toBe("2M");
  });

  it("renders formatted headline string with K suffix", () => {
    render(
      <KpiChart
        title="Events/day"
        values={[12400, 8000, 500]}
        headline="peak 12.4K · avg 7K · min 500"
      />,
    );
    expect(
      screen.getByText("peak 12.4K · avg 7K · min 500"),
    ).toBeInTheDocument();
  });
});

describe("KpiChart date tick labels", () => {
  it("renders without crashing when start and end dates are provided", () => {
    // Recharts XAxis ticks with 0 dimensions in jsdom may not render label text.
    // The contract (dates accepted by component) is verified by absence of error.
    const { container } = render(
      <KpiChart
        title="X"
        values={[1, 2, 3]}
        startDate={new Date(2026, 3, 1)}
        endDate={new Date(2026, 3, 30)}
      />,
    );
    expect(container.querySelector(".h-32")).not.toBeNull();
  });

  it("renders without crashing when dates are not provided", () => {
    const { container } = render(<KpiChart title="X" values={[1, 2, 3]} />);
    expect(container.querySelector(".h-32")).not.toBeNull();
  });
});
