import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomalyChartOverlay } from "../AnomalyChartOverlay";

const mockOffset = { left: 10, top: 4, width: 300, height: 120 };

// windowStart = "2025-01-01", startDay=10 → start_date="2025-01-11", durationDays=5 → end_date="2025-01-16"
const WINDOW_START = new Date("2025-01-01");
const anomaly = {
  type: "marketing_campaign",
  name: "viral",
  start_date: "2025-01-11",
  end_date: "2025-01-16",
  effect: { arrivals: 4 },
};

describe("AnomalyChartOverlay", () => {
  it("renders a pill for each anomaly", () => {
    render(
      <svg>
        <AnomalyChartOverlay
          offset={mockOffset}
          anomalies={[anomaly]}
          windowDays={90}
          onAnomalyChange={() => {}}
        />
      </svg>,
    );
    expect(screen.getByRole("button", { name: /viral/i })).toBeInTheDocument();
  });

  it("renders nothing when anomalies is empty", () => {
    const { container } = render(
      <svg>
        <AnomalyChartOverlay
          offset={mockOffset}
          anomalies={[]}
          windowDays={90}
          onAnomalyChange={() => {}}
        />
      </svg>,
    );
    expect(
      container.querySelectorAll("[data-testid='chart-pill-body']").length,
    ).toBe(0);
  });

  it("drag body calls onAnomalyChange with updated start_date/end_date", () => {
    // pxPerDay = 300/90 ≈ 3.33; +33px ≈ +10 days → startDay goes from 10 to 20
    // new start_date = 2025-01-01 + 20d = 2025-01-21, end_date = 2025-01-21 + 5d = 2025-01-26
    const onChange = vi.fn();
    render(
      <svg>
        <AnomalyChartOverlay
          offset={mockOffset}
          anomalies={[anomaly]}
          windowDays={90}
          windowStart={WINDOW_START}
          onAnomalyChange={onChange}
        />
      </svg>,
    );
    const body = screen.getByTestId("chart-pill-body");
    fireEvent.pointerDown(body, { clientX: 40, pointerId: 1 });
    fireEvent.pointerMove(body, { clientX: 73, pointerId: 1 });
    fireEvent.pointerUp(body, { clientX: 73, pointerId: 1 });
    expect(onChange).toHaveBeenCalled();
    const [idx, next] = onChange.mock.calls.at(-1)!;
    expect(idx).toBe(0);
    expect(next.start_date).toBe("2025-01-21");
    expect(next.end_date).toBe("2025-01-26");
  });

  it("click without drag calls onSelect with index and coordinates", () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <AnomalyChartOverlay
          offset={mockOffset}
          anomalies={[anomaly]}
          windowDays={90}
          onAnomalyChange={() => {}}
          onSelect={onSelect}
        />
      </svg>,
    );
    const body = screen.getByTestId("chart-pill-body");
    fireEvent.pointerDown(body, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(body, { clientX: 40, clientY: 50, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith(0, 40, 50);
  });

  it("drag does not call onSelect", () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <AnomalyChartOverlay
          offset={mockOffset}
          anomalies={[anomaly]}
          windowDays={90}
          onAnomalyChange={() => {}}
          onSelect={onSelect}
        />
      </svg>,
    );
    const body = screen.getByTestId("chart-pill-body");
    fireEvent.pointerDown(body, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(body, { clientX: 73, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(body, { clientX: 73, clientY: 50, pointerId: 1 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("drag right handle resizes end_date", () => {
    // pxPerDay = 300/90 ≈ 3.33; +33px ≈ +10 days → duration goes from 5 to 15
    // end_date = start_date(2025-01-11) + 15d = 2025-01-26
    const onChange = vi.fn();
    render(
      <svg>
        <AnomalyChartOverlay
          offset={mockOffset}
          anomalies={[anomaly]}
          windowDays={90}
          windowStart={WINDOW_START}
          onAnomalyChange={onChange}
        />
      </svg>,
    );
    const right = screen.getByTestId("chart-pill-handle-right");
    fireEvent.pointerDown(right, { clientX: 80, pointerId: 1 });
    fireEvent.pointerMove(right, { clientX: 113, pointerId: 1 }); // +33px ≈ +10 days
    fireEvent.pointerUp(right, { clientX: 113, pointerId: 1 });
    const [, next] = onChange.mock.calls.at(-1)!;
    expect(next.end_date).toBe("2025-01-26");
  });
});
