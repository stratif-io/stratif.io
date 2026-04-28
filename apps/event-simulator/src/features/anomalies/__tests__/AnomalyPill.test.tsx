import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomalyPill } from "../AnomalyPill";

// windowStart = 2025-01-01, startDay=5 → start_date="2025-01-06", durationDays=3 → end_date="2025-01-09"
const WINDOW_START = new Date("2025-01-01");
const a = {
  type: "marketing_campaign",
  name: "viral",
  start_date: "2025-01-06",
  end_date: "2025-01-09",
  effect: { arrivals: 4 },
};

describe("AnomalyPill", () => {
  it("renders with type color and name", () => {
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
          windowStart={WINDOW_START}
          onChange={() => {}}
          onSelect={() => {}}
        />
      </svg>,
    );
    expect(screen.getByRole("button", { name: /viral/i })).toBeInTheDocument();
  });

  it("emits onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
          windowStart={WINDOW_START}
          onChange={() => {}}
          onSelect={onSelect}
        />
      </svg>,
    );
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(onSelect).toHaveBeenCalled();
  });

  it("drag body → onChange with new start_date/end_date", () => {
    // pxPerDay = 300/30 = 10; +20px = +2 days → startDay from 5 to 7
    // new start_date = 2025-01-01 + 7d = 2025-01-08, end_date = 2025-01-08 + 3d = 2025-01-11
    const onChange = vi.fn();
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
          windowStart={WINDOW_START}
          onChange={onChange}
          onSelect={() => {}}
        />
      </svg>,
    );
    const body = screen.getByTestId("pill-body");
    fireEvent.pointerDown(body, { clientX: 60, pointerId: 1 });
    fireEvent.pointerMove(body, { clientX: 80, pointerId: 1 });
    fireEvent.pointerUp(body, { clientX: 80, pointerId: 1 });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.start_date).toBe("2025-01-08");
    expect(last.end_date).toBe("2025-01-11");
  });

  it("has tabIndex={0} for keyboard reach", () => {
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
          windowStart={WINDOW_START}
          onChange={() => {}}
          onSelect={() => {}}
        />
      </svg>,
    );
    const pill = screen.getByRole("button", { name: /viral/i });
    // SVG elements: tabIndex is a property, not always reflected as an attribute in JSDOM
    expect(pill.tabIndex).toBe(0);
  });

  it("Enter key fires onSelect", () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
          windowStart={WINDOW_START}
          onChange={() => {}}
          onSelect={onSelect}
        />
      </svg>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: /viral/i }), {
      key: "Enter",
    });
    expect(onSelect).toHaveBeenCalled();
  });

  it("drag right edge → onChange with new end_date", () => {
    // pxPerDay = 300/30 = 10; +20px = +2 days → duration from 3 to 5
    // end_date = start_date(2025-01-06) + 5d = 2025-01-11
    const onChange = vi.fn();
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
          windowStart={WINDOW_START}
          onChange={onChange}
          onSelect={() => {}}
        />
      </svg>,
    );
    const right = screen.getByTestId("pill-handle-right");
    fireEvent.pointerDown(right, { clientX: 80, pointerId: 1 });
    fireEvent.pointerMove(right, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(right, { clientX: 100, pointerId: 1 });
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.end_date).toBe("2025-01-11");
  });
});
