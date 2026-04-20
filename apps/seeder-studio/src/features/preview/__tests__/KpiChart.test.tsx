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

describe("KpiChart bands + guide", () => {
  it("renders a rect per band with correct x/width in chart coordinates", () => {
    const { container } = render(
      <KpiChart
        title="X"
        values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
        bands={[{ start: 2, end: 5, color: "#ef476f" }]}
      />,
    );
    const rects = container.querySelectorAll('rect[data-testid="kpi-band"]');
    expect(rects).toHaveLength(1);
    const r = rects[0] as SVGRectElement;
    expect(Number(r.getAttribute("x"))).toBeCloseTo((2 / 9) * 300, 1);
    expect(Number(r.getAttribute("width"))).toBeCloseTo(((5 - 2) / 9) * 300, 1);
  });

  it("renders the hover guide at the given x when supplied", () => {
    const { container } = render(
      <KpiChart title="X" values={[0, 1, 2, 3]} guideIndex={2} />,
    );
    const guide = container.querySelector('[data-testid="kpi-guide"]');
    expect(guide).not.toBeNull();
  });
});

describe("KpiChart date tick labels", () => {
  it("renders start and end date labels when both provided", () => {
    const { container } = render(
      <KpiChart
        title="X"
        values={[1, 2, 3]}
        startDate={new Date(2026, 3, 1)}
        endDate={new Date(2026, 3, 30)}
      />,
    );
    const text = container.textContent ?? "";
    const fmtDate = (d: Date) =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(d);
    expect(text).toContain(fmtDate(new Date(2026, 3, 1)));
    expect(text).toContain(fmtDate(new Date(2026, 3, 30)));
  });

  it("renders no tick labels when dates are not provided", () => {
    const { container } = render(<KpiChart title="X" values={[1, 2, 3]} />);
    // No date-tick div present
    const divs = container.querySelectorAll('[data-testid="kpi-date-ticks"]');
    expect(divs).toHaveLength(0);
  });
});
