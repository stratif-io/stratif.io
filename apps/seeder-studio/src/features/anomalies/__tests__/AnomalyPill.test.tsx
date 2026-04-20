import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomalyPill } from "../AnomalyPill";

const a = {
  type: "marketing_campaign",
  name: "viral",
  start: "5d",
  duration: "3d",
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
          onChange={() => {}}
          onSelect={onSelect}
        />
      </svg>,
    );
    fireEvent.click(screen.getByRole("button", { name: /viral/i }));
    expect(onSelect).toHaveBeenCalled();
  });

  it("drag body → onChange with new start", () => {
    const onChange = vi.fn();
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
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
    expect(last.start).toBe("7d");
    expect(last.duration).toBe("3d");
  });

  it("drag right edge → onChange with new duration", () => {
    const onChange = vi.fn();
    render(
      <svg>
        <AnomalyPill
          anomaly={a}
          windowDays={30}
          trackWidth={300}
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
    expect(last.duration).toBe("5d");
  });
});
