import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnomalyFloatingEditor } from "../AnomalyFloatingEditor";

const anomaly = {
  type: "marketing_campaign",
  name: "viral",
  start: "10d",
  duration: "5d",
  effect: { arrivals: 4 },
};

describe("AnomalyFloatingEditor", () => {
  it("renders anomaly name in heading", () => {
    render(
      <AnomalyFloatingEditor
        anomaly={anomaly}
        x={200}
        y={150}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  });

  it("name input reflects current anomaly name", () => {
    render(
      <AnomalyFloatingEditor
        anomaly={anomaly}
        x={200}
        y={150}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe(
      "viral",
    );
  });

  it("editing name calls onChange with updated anomaly", () => {
    const onChange = vi.fn();
    render(
      <AnomalyFloatingEditor
        anomaly={anomaly}
        x={200}
        y={150}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: "launch" },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "launch" }),
    );
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <AnomalyFloatingEditor
        anomaly={anomaly}
        x={200}
        y={150}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("delete button calls onDelete", () => {
    const onDelete = vi.fn();
    render(
      <AnomalyFloatingEditor
        anomaly={anomaly}
        x={200}
        y={150}
        onChange={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });
});
